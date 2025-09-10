import { NextRequest, NextResponse } from 'next/server';
import { shopGunAPI } from '@/lib/shopgun/shopgun-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');
    const search = searchParams.get('search');
    const all = searchParams.get('all') === 'true';

    let offers;
    
    if (search) {
      offers = await shopGunAPI.searchNettoOffers(search);
    } else if (all) {
      offers = await shopGunAPI.getAllNettoOffers();
    } else {
      const response = await shopGunAPI.getNettoOffers(page, perPage);
      offers = response.offers;
    }

    // Convert to our internal product format
    const products = offers.map(offer => shopGunAPI.convertToProduct(offer));

    return NextResponse.json({
      success: true,
      data: {
        products,
        total: products.length,
        source: 'shopgun',
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching Netto offers:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch Netto offers',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

