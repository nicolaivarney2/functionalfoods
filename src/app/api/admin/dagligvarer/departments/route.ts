import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    console.log('🔍 Fetching departments from REMA API...')
    
    const response = await fetch('https://api.digital.rema1000.dk/api/v3/departments')
    console.log('📡 Departments response status:', response.status)
    
    if (!response.ok) {
      throw new Error(`REMA API call failed: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('📊 Departments data:', JSON.stringify(data).substring(0, 500) + '...')
    
    const departments = data.data || []
    console.log(`📂 Found ${departments.length} departments`)
    
    return NextResponse.json({
      success: true,
      message: 'Departments fetched successfully',
      departments: departments
    })
    
  } catch (error) {
    console.error('❌ Departments fetch error:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to fetch departments: ${error instanceof Error ? error.message : 'Unknown error'}`,
      departments: []
    }, { status: 500 })
  }
}
