import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-route-auth'
import { generateSlug } from '@/lib/utils'
import {
  normalizeAiRecipeIngredients,
  normalizeAiRecipeInstructions,
} from '@/lib/ai-recipe-ingredient-normalize'
import { syncIngredientsToRegistry } from '@/lib/ingredient-registry-sync'
import { PROVISIONAL_SELECT, type ProvisionalRecipeRow } from '@/lib/provisional-recipes'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

type ServiceClient = NonNullable<ReturnType<typeof getServiceClient>>

/** Visningsnavn til kreditering ud fra en auth-bruger (metadata-navn → email-lokaldel). */
async function resolveSubmitterName(
  supabase: ServiceClient,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !data?.user) return null
    const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>
    const metaName =
      (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
      (typeof meta.name === 'string' && meta.name.trim()) ||
      (typeof meta.first_name === 'string' && meta.first_name.trim()) ||
      ''
    if (metaName) return metaName.slice(0, 80)
    const email = data.user.email
    if (email) return email.split('@')[0].slice(0, 80)
    return null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    let query = supabase
      .from('provisional_recipes')
      .select(PROVISIONAL_SELECT)
      .order('created_at', { ascending: false })
      .limit(200)

    if (status !== 'all' && ['draft', 'pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      console.error('admin provisional GET', error)
      return NextResponse.json({ error: 'Kunne ikke hente', details: error.message }, { status: 500 })
    }

    const rows = (data ?? []) as ProvisionalRecipeRow[]

    // Berig med indsenders visningsnavn til kreditering (én opslag pr. unik bruger).
    const uniqueUserIds = [...new Set(rows.map((r) => r.user_id))]
    const nameById = new Map<string, string | null>()
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        nameById.set(uid, await resolveSubmitterName(supabase, uid))
      })
    )
    const enriched = rows.map((r) => ({ ...r, submittedBy: nameById.get(r.user_id) ?? null }))

    return NextResponse.json({ success: true, data: enriched })
  } catch (e) {
    console.error('admin provisional GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === 'string' ? body.id : ''
    const action = body.action
    if (!id) return NextResponse.json({ error: 'Mangler id' }, { status: 400 })

    const { data: prov, error: fetchErr } = await supabase
      .from('provisional_recipes')
      .select(PROVISIONAL_SELECT)
      .eq('id', id)
      .maybeSingle<ProvisionalRecipeRow>()

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!prov) return NextResponse.json({ error: 'Ikke fundet' }, { status: 404 })

    if (action === 'reject') {
      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null
      const { data, error } = await supabase
        .from('provisional_recipes')
        .update({
          status: 'rejected',
          review_notes: reason,
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(PROVISIONAL_SELECT)
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    if (action !== 'approve') {
      return NextResponse.json({ error: 'Ukendt handling' }, { status: 400 })
    }

    if (prov.status === 'approved' && prov.promoted_recipe_id) {
      return NextResponse.json({ error: 'Allerede godkendt', recipeId: prov.promoted_recipe_id }, { status: 409 })
    }

    // Admin kan overskrive felter ved godkendelse (titel, billede, kategori, fremgangsmåde).
    const edits = (body.recipe ?? {}) as Record<string, unknown>
    const title = typeof edits.title === 'string' && edits.title.trim() ? edits.title.trim() : prov.title
    const description =
      typeof edits.description === 'string' ? edits.description : prov.description || ''
    const imageUrl =
      typeof body.imageUrl === 'string' && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : prov.image_url || '/images/recipe-placeholder.jpg'
    const mainCategory =
      typeof body.mainCategory === 'string' && body.mainCategory.trim()
        ? body.mainCategory.trim()
        : 'Hovedretter'

    const ingredientsSource = Array.isArray(edits.ingredients) ? edits.ingredients : prov.ingredients
    const instructionsSource = Array.isArray(edits.instructions) ? edits.instructions : prov.instructions

    const ingredientsNormalized = normalizeAiRecipeIngredients(ingredientsSource as never)
    const instructionsNormalized = normalizeAiRecipeInstructions(instructionsSource as never)

    if (ingredientsNormalized.length === 0) {
      return NextResponse.json({ error: 'Opskriften mangler ingredienser' }, { status: 400 })
    }

    const slug = generateSlug(title)

    // Dublet-tjek (samme mønster som save-ai-draft)
    const { data: existingByTitle } = await supabase
      .from('recipes')
      .select('id')
      .eq('title', title)
      .maybeSingle()
    const { data: existingBySlug } = await supabase
      .from('recipes')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (existingByTitle?.id || existingBySlug?.id) {
      return NextResponse.json(
        { error: 'Opskrift findes allerede', details: `Titel eller slug («${slug}») er optaget.` },
        { status: 409 }
      )
    }

    try {
      await syncIngredientsToRegistry(supabase, ingredientsNormalized)
    } catch (syncErr) {
      console.warn('promote: ingredient sync failed', syncErr)
    }

    const prepTime = prov.prep_time ?? 15
    const cookTime = prov.cook_time ?? 20
    const nutrition = prov.nutrition || {}
    const recipeId = crypto.randomUUID()

    // Kreditering: admin-angivet felt vinder; ellers indsenderens navn; ellers generisk.
    const adminCredit =
      typeof body.credit === 'string' && body.credit.trim() ? body.credit.trim().slice(0, 120) : ''
    let author = adminCredit
    if (!author) {
      const submitter = await resolveSubmitterName(supabase, prov.user_id)
      author = submitter ? `Indsendt af ${submitter}` : 'Bruger (foreløbig opskrift)'
    }

    const recipeData = {
      id: recipeId,
      title,
      slug,
      description,
      shortDescription: description.substring(0, 150) + (description.length > 150 ? '...' : ''),
      preparationTime: prepTime,
      cookingTime: cookTime,
      totalTime: prepTime + cookTime,
      servings: Math.max(1, Math.round(Number(prov.servings) || 1)),
      difficulty: (prov.difficulty || 'medium').toLowerCase(),
      calories: Math.round(Number(nutrition.calories) || 0),
      protein: Number(nutrition.protein) || 0,
      carbs: Number(nutrition.carbs) || 0,
      fat: Number(nutrition.fat) || 0,
      fiber: Number(nutrition.fiber) || 0,
      imageUrl,
      imageAlt: `${title} - Functional Foods`,
      metaTitle: `${title} | Functional Foods`,
      metaDescription: description.substring(0, 160),
      keywords: (prov.dietary_categories || []).join(', '),
      mainCategory,
      subCategories: null,
      dietaryCategories: prov.dietary_categories || [],
      ingredients: ingredientsNormalized.map((ing) => ({
        id: crypto.randomUUID(),
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        ...(ing.notes != null && ing.notes !== '' ? { notes: ing.notes } : {}),
      })),
      instructions: instructionsNormalized.map((ins, i) => ({
        id: `${crypto.randomUUID()}-${i + 1}`,
        stepNumber: ins.stepNumber ?? i + 1,
        instruction: ins.instruction,
        time: ins.time || null,
        tips: ins.tips || null,
      })),
      author,
      status: 'draft',
      publishedAt: null,
      updatedAt: new Date().toISOString(),
      personalTips: prov.ai_notes || null,
      rating: null,
      reviewCount: null,
      prepTimeISO: `PT${prepTime}M`,
      cookTimeISO: `PT${cookTime}M`,
      totalTimeISO: `PT${prepTime + cookTime}M`,
    }

    const { error: insertErr } = await supabase.from('recipes').insert([recipeData])
    if (insertErr) {
      console.error('promote insert', insertErr)
      return NextResponse.json(
        { error: 'Kunne ikke oprette opskrift', details: insertErr.message },
        { status: 500 }
      )
    }

    // Frida-ernæring (best effort)
    try {
      const { recalculateRecipeNutritionFromFrida } = await import('@/lib/recipe-frida-nutrition-recalc')
      await recalculateRecipeNutritionFromFrida(recipeId)
    } catch (recalcErr) {
      console.warn('promote: frida recalc failed', recalcErr)
    }

    const { data, error } = await supabase
      .from('provisional_recipes')
      .update({
        status: 'approved',
        promoted_recipe_id: recipeId,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(PROVISIONAL_SELECT)
      .single()

    if (error) {
      console.error('promote update provisional', error)
      // Opskriften er oprettet — rapportér stadig succes med recipeId.
      return NextResponse.json({ success: true, recipeId, slug, warning: error.message })
    }

    return NextResponse.json({ success: true, recipeId, slug, data })
  } catch (e) {
    console.error('admin provisional POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
