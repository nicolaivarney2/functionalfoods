import { NextRequest, NextResponse } from 'next/server';
import { nettoScraper } from '@/lib/scrapers/netto-scraper';
import { enhancedNettoScraper } from '@/lib/scrapers/netto-scraper-enhanced';
import { simpleNettoScraper } from '@/lib/scrapers/netto-scraper-simple';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting Netto scraping process...');
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'scrape';
    
    switch (action) {
      case 'scrape':
        // Scrape alle produkter
        const products = await enhancedNettoScraper.scrapeAllCategories();
        return NextResponse.json({
          success: true,
          message: `Scraped ${products.length} products from Netto`,
          data: products,
        });
        
      case 'test':
        // Test alle produkter mod CP API
        const { products: scrapedProducts, cpApiResults } = await enhancedNettoScraper.scrapeAndTestAllProducts();
        
        const workingEANs = cpApiResults
          .filter(result => result.data !== null)
          .map(result => result.ean);
        
        return NextResponse.json({
          success: true,
          message: `Tested ${cpApiResults.length} EAN codes, found ${workingEANs.length} working`,
          data: {
            totalProducts: scrapedProducts.length,
            productsWithEAN: scrapedProducts.filter(p => p.ean).length,
            testedEANs: cpApiResults.length,
            workingEANs: workingEANs.length,
            workingEANList: workingEANs,
            cpApiResults: cpApiResults.filter(r => r.data !== null),
            sampleProducts: scrapedProducts.slice(0, 10), // First 10 products as sample
          },
        });
        
      case 'find-working':
        // Find kun working EANs
        const foundWorkingEANs = await enhancedNettoScraper.findWorkingEANs();
        return NextResponse.json({
          success: true,
          message: `Found ${foundWorkingEANs.length} working EAN codes`,
          data: foundWorkingEANs,
        });
        
      case 'test-known':
        // Test kendte EAN koder
        const knownResults = await simpleNettoScraper.testAllKnownEANs();
        return NextResponse.json({
          success: true,
          message: `Tested ${knownResults.testedEANs} known EAN codes, found ${knownResults.workingEANs.length} working`,
          data: knownResults,
        });
        
      case 'test-random':
        // Test tilfældige EAN koder
        const randomCount = parseInt(searchParams.get('count') || '100');
        const randomResults = await simpleNettoScraper.testRandomEANs(randomCount);
        return NextResponse.json({
          success: true,
          message: `Tested ${randomResults.testedEANs} random EAN codes, found ${randomResults.workingEANs.length} working`,
          data: randomResults,
        });
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Use: scrape, test, find-working, test-known, or test-random',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in Netto scraping:', error);
    return NextResponse.json({
      success: false,
      message: 'Error scraping Netto products',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ean } = body;
    
    if (!ean) {
      return NextResponse.json({
        success: false,
        message: 'EAN code is required',
      }, { status: 400 });
    }
    
    // Test specifik EAN mod CP API
    const cpData = await simpleNettoScraper.testProductWithCPAPI(ean);
    
    return NextResponse.json({
      success: true,
      message: cpData ? 'EAN found in CP API' : 'EAN not found in CP API',
      data: {
        ean,
        found: cpData !== null,
        cpData,
      },
    });
  } catch (error) {
    console.error('Error testing EAN:', error);
    return NextResponse.json({
      success: false,
      message: 'Error testing EAN',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
