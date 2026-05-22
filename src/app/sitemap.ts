import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { databaseService } from '@/lib/database-service'
import { FUNKTION_SLUGS } from '@/content/funktioner-landing'

export const revalidate = 1800 // 30 minutes

const baseUrl = 'https://functionalfoods.dk'

type SitemapEntry = MetadataRoute.Sitemap[number]
type ChangeFrequency = NonNullable<SitemapEntry['changeFrequency']>
type BlogPostSitemapRow = {
  slug?: string | null
  updated_at?: string | null
  published_at?: string | null
  category?: { slug?: string | null } | { slug?: string | null }[] | null
}

const blogCategoryFallbacks = [
  'keto',
  'sense',
  'glp-1',
  'anti-inflammatory',
  'flexitarian',
  '5-2-diet',
  'proteinrig-kost',
  'familie',
  'mentalt',
]

const staticPages: Array<{
  path: string
  changeFrequency: ChangeFrequency
  priority: number
}> = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/opskriftsoversigt', changeFrequency: 'daily', priority: 0.95 },
  { path: '/keto', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/keto/opskrifter', changeFrequency: 'daily', priority: 0.93 },
  { path: '/keto/vægttab', changeFrequency: 'weekly', priority: 0.93 },
  { path: '/vaegttab', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/madbudget', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/kom-i-gang', changeFrequency: 'weekly', priority: 0.88 },
  { path: '/funktioner', changeFrequency: 'weekly', priority: 0.86 },
  { path: '/succeshistorier', changeFrequency: 'weekly', priority: 0.84 },
  { path: '/dagligvarer', changeFrequency: 'daily', priority: 0.82 },
  { path: '/blog', changeFrequency: 'daily', priority: 0.82 },
  { path: '/bag-om-ff', changeFrequency: 'monthly', priority: 0.72 },
  { path: '/bag-om-ff/nicolaivarney', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/medlem', changeFrequency: 'monthly', priority: 0.68 },
  { path: '/cookies-og-privatliv', changeFrequency: 'yearly', priority: 0.3 },

  { path: '/sense', changeFrequency: 'weekly', priority: 0.86 },
  { path: '/sense/opskrifter', changeFrequency: 'daily', priority: 0.84 },
  { path: '/sense/vægttab', changeFrequency: 'weekly', priority: 0.84 },
  { path: '/GLP-1', changeFrequency: 'weekly', priority: 0.86 },
  { path: '/GLP-1/opskrifter', changeFrequency: 'daily', priority: 0.84 },
  { path: '/GLP-1/vaegttab', changeFrequency: 'weekly', priority: 0.84 },
  { path: '/proteinrig-kost', changeFrequency: 'weekly', priority: 0.86 },
  { path: '/proteinrig-kost/opskrifter', changeFrequency: 'daily', priority: 0.84 },
  { path: '/proteinrig-kost/vægttab', changeFrequency: 'weekly', priority: 0.84 },
  { path: '/anti-inflammatory', changeFrequency: 'weekly', priority: 0.86 },
  { path: '/anti-inflammatory/opskrifter', changeFrequency: 'daily', priority: 0.84 },
  { path: '/anti-inflammatory/vægttab', changeFrequency: 'weekly', priority: 0.84 },
  { path: '/flexitarian', changeFrequency: 'weekly', priority: 0.84 },
  { path: '/flexitarian/opskrifter', changeFrequency: 'daily', priority: 0.82 },
  { path: '/flexitarian/vægttab', changeFrequency: 'weekly', priority: 0.82 },
  { path: '/5-2-diet', changeFrequency: 'weekly', priority: 0.82 },
  { path: '/5-2-diet/opskrifter', changeFrequency: 'daily', priority: 0.8 },
  { path: '/5-2-diet/vægttab', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/lchf-paleo', changeFrequency: 'weekly', priority: 0.82 },
  { path: '/lchf-paleo/opskrifter', changeFrequency: 'daily', priority: 0.8 },
  { path: '/lchf-paleo/vægttab', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/kalorietaelling', changeFrequency: 'weekly', priority: 0.84 },
  { path: '/kalorietaelling/vaegttab', changeFrequency: 'weekly', priority: 0.82 },
  { path: '/kalorietaelling/teori', changeFrequency: 'monthly', priority: 0.78 },
  { path: '/familie/opskrifter', changeFrequency: 'daily', priority: 0.78 },
  { path: '/vaegt-tracker', changeFrequency: 'monthly', priority: 0.72 },
  { path: '/reddit-communities', changeFrequency: 'monthly', priority: 0.45 },
]

function buildUrl(path: string) {
  return path ? `${baseUrl}${path}` : baseUrl
}

function toSitemapEntry(
  path: string,
  changeFrequency: ChangeFrequency,
  priority: number,
  lastModified: string | Date = new Date(),
): SitemapEntry {
  return {
    url: buildUrl(path),
    lastModified: new Date(lastModified),
    changeFrequency,
    priority,
  }
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) return null

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function dedupeEntries(entries: SitemapEntry[]) {
  const byUrl = new Map<string, SitemapEntry>()

  for (const entry of entries) {
    const existing = byUrl.get(entry.url)
    if (!existing || (entry.priority ?? 0) > (existing.priority ?? 0)) {
      byUrl.set(entry.url, entry)
    }
  }

  return Array.from(byUrl.values()).sort((a, b) => a.url.localeCompare(b.url, 'da'))
}

function getBlogCategorySlug(post: BlogPostSitemapRow) {
  const category = Array.isArray(post.category) ? post.category[0] : post.category
  return category?.slug || null
}

async function getRecipePages(): Promise<SitemapEntry[]> {
  try {
    const publishedRecipes = await databaseService.getRecipes()

    return publishedRecipes
      .filter((recipe) => Boolean(recipe.slug))
      .map((recipe) =>
        toSitemapEntry(`/opskrift/${recipe.slug}`, 'weekly', 0.78, recipe.updatedAt || new Date()),
      )
  } catch (error) {
    console.error('Sitemap: failed to load recipe URLs', error)
    return []
  }
}

async function getBlogPages(): Promise<SitemapEntry[]> {
  const supabase = getSupabaseClient()
  const fallbackCategoryPages = blogCategoryFallbacks.map((slug) =>
    toSitemapEntry(`/blog/${slug}`, 'weekly', 0.72),
  )

  if (!supabase) return fallbackCategoryPages

  try {
    const [{ data: categories, error: categoryError }, { data: posts, error: postError }] =
      await Promise.all([
        supabase.from('blog_categories').select('slug').order('slug'),
        supabase
          .from('blog_posts')
          .select('slug, updated_at, published_at, category:blog_categories(slug)')
          .eq('status', 'published')
          .order('published_at', { ascending: false }),
      ])

    if (categoryError) throw categoryError
    if (postError) throw postError

    const categoryPages = (categories || [])
      .filter((category) => Boolean(category.slug))
      .map((category) => toSitemapEntry(`/blog/${category.slug}`, 'weekly', 0.72))

    const postPages = ((posts || []) as BlogPostSitemapRow[])
      .filter((post) => Boolean(post.slug && getBlogCategorySlug(post)))
      .map((post) =>
        toSitemapEntry(
          `/blog/${getBlogCategorySlug(post)}/${post.slug}`,
          'monthly',
          0.68,
          post.updated_at || post.published_at || new Date(),
        ),
      )

    return [...fallbackCategoryPages, ...categoryPages, ...postPages]
  } catch (error) {
    console.error('Sitemap: failed to load blog URLs', error)
    return fallbackCategoryPages
  }
}

async function getProductPages(): Promise<SitemapEntry[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('product_offers')
      .select('id, updated_at')
      .eq('is_available', true)
      .eq('is_offer_active', true)
      .order('updated_at', { ascending: false })
      .limit(1500)

    if (error) throw error

    return (data || [])
      .filter((product) => Boolean(product.id))
      .map((product) =>
        toSitemapEntry(`/dagligvarer/produkt/${product.id}`, 'daily', 0.5, product.updated_at || new Date()),
      )
  } catch (error) {
    console.error('Sitemap: failed to load product URLs', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const corePages = staticPages.map((page) =>
    toSitemapEntry(page.path, page.changeFrequency, page.priority, now),
  )
  const featurePages = FUNKTION_SLUGS.map((slug) =>
    toSitemapEntry(`/funktioner/${slug}`, 'monthly', 0.74, now),
  )

  const [recipePages, blogPages, productPages] = await Promise.all([
    getRecipePages(),
    getBlogPages(),
    getProductPages(),
  ])

  return dedupeEntries([...corePages, ...featurePages, ...recipePages, ...blogPages, ...productPages])
}