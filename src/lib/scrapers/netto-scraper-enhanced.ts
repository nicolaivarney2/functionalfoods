import { JSDOM } from 'jsdom';
import axios from 'axios';

export interface NettoProduct {
  name: string;
  price: number;
  ean?: string;
  url: string;
  category: string;
  image?: string;
  description?: string;
  brand?: string;
  unit?: string;
  originalPrice?: number;
  discount?: number;
}

export interface CPSallingInfo {
  // Vi definerer denne baseret på hvad vi finder
  [key: string]: any;
}

export class EnhancedNettoScraper {
  private baseUrl = 'https://www.netto.dk';
  private cpApiUrl = 'https://p-club.dsgapps.dk/v2/products';
  private userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        timeout: 15000,
        maxRedirects: 5,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }

  private extractEANFromText(text: string): string[] {
    // Find EAN koder (8-13 cifre)
    const eanRegex = /\b\d{8,13}\b/g;
    const eans = text.match(eanRegex) || [];
    
    // Find også kortere produktkoder
    const shortCodeRegex = /\b\d{6,7}\b/g;
    const shortCodes = text.match(shortCodeRegex) || [];
    
    return [...new Set([...eans, ...shortCodes])];
  }

  private parseProductFromElement(element: Element, category: string): NettoProduct | null {
    try {
      // Find produktnavn - prøv flere selektorer
      const nameSelectors = [
        '[data-testid="product-name"]',
        '.product-name',
        'h3', 'h4', 'h5',
        '.title',
        '.product-title',
        '[class*="name"]',
        '[class*="title"]',
        'a[href*="/produkt/"]',
      ];

      let name = '';
      for (const selector of nameSelectors) {
        const nameElement = element.querySelector(selector);
        if (nameElement?.textContent?.trim()) {
          name = nameElement.textContent.trim();
          break;
        }
      }

      // Find pris - prøv flere selektorer
      const priceSelectors = [
        '[data-testid="price"]',
        '.price',
        '.product-price',
        '[class*="price"]',
        '[class*="cost"]',
        '.amount',
        '.value',
      ];

      let price = 0;
      let originalPrice = 0;
      let discount = 0;

      for (const selector of priceSelectors) {
        const priceElement = element.querySelector(selector);
        if (priceElement?.textContent?.trim()) {
          const priceText = priceElement.textContent.trim();
          const priceMatch = priceText.match(/(\d+[,.]?\d*)/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(',', '.'));
            break;
          }
        }
      }

      // Find original pris og rabat
      const originalPriceElement = element.querySelector('.original-price, .was-price, [class*="original"]');
      if (originalPriceElement?.textContent?.trim()) {
        const originalPriceText = originalPriceElement.textContent.trim();
        const originalPriceMatch = originalPriceText.match(/(\d+[,.]?\d*)/);
        if (originalPriceMatch) {
          originalPrice = parseFloat(originalPriceMatch[1].replace(',', '.'));
          discount = originalPrice - price;
        }
      }

      // Find URL
      const linkElement = element.querySelector('a[href*="/produkt/"]') as HTMLAnchorElement;
      const url = linkElement ? `${this.baseUrl}${linkElement.href}` : '';

      // Find billede
      const imageElement = element.querySelector('img[src*="netto"], img[alt*="produkt"], img[src*="product"]') as HTMLImageElement;
      const image = imageElement?.src || '';

      // Find beskrivelse
      const descriptionElement = element.querySelector('.description, .product-description, p, .summary');
      const description = descriptionElement?.textContent?.trim() || '';

      // Find mærke
      const brandElement = element.querySelector('.brand, .manufacturer, [class*="brand"]');
      const brand = brandElement?.textContent?.trim() || '';

      // Find enhed
      const unitElement = element.querySelector('.unit, .size, [class*="unit"]');
      const unit = unitElement?.textContent?.trim() || '';

      // Extract EAN fra hele elementet
      const elementText = element.textContent || '';
      const eans = this.extractEANFromText(elementText);

      if (!name) return null;

      return {
        name,
        price,
        ean: eans[0] || undefined,
        url,
        category,
        image,
        description,
        brand,
        unit,
        originalPrice: originalPrice || undefined,
        discount: discount || undefined,
      };
    } catch (error) {
      console.error('Error parsing product element:', error);
      return null;
    }
  }

  async scrapeCategory(categoryUrl: string, categoryName: string): Promise<NettoProduct[]> {
    console.log(`Scraping category: ${categoryName} from ${categoryUrl}`);
    
    try {
      const html = await this.fetchPage(categoryUrl);
      const dom = new JSDOM(html);
      const document = dom.window.document;

      const products: NettoProduct[] = [];

      // Find produktcontainere - prøv forskellige selektorer
      const productSelectors = [
        '[data-testid="product-item"]',
        '.product-item',
        '.product-card',
        '.product',
        '[class*="product"]',
        'article',
        '.item',
        '.grid-item',
        '.card',
        '[class*="item"]',
      ];

      let productElements: NodeListOf<Element> | null = null;
      
      for (const selector of productSelectors) {
        productElements = document.querySelectorAll(selector);
        if (productElements.length > 0) {
          console.log(`Found ${productElements.length} products with selector: ${selector}`);
          break;
        }
      }

      if (!productElements || productElements.length === 0) {
        console.log('No products found with standard selectors, trying alternative approach...');
        
        // Prøv at finde links til produkter
        const productLinks = document.querySelectorAll('a[href*="/produkt/"]');
        console.log(`Found ${productLinks.length} product links`);
        
        for (const link of productLinks) {
          const product = this.parseProductFromElement(link.parentElement || link, categoryName);
          if (product) {
            products.push(product);
          }
        }
      } else {
        for (const element of productElements) {
          const product = this.parseProductFromElement(element, categoryName);
          if (product) {
            products.push(product);
          }
        }
      }

      // Prøv også at finde produkter i JavaScript data
      const scriptTags = document.querySelectorAll('script');
      for (const script of scriptTags) {
        const scriptContent = script.textContent || '';
        if (scriptContent.includes('product') || scriptContent.includes('varer')) {
          const eans = this.extractEANFromText(scriptContent);
          for (const ean of eans) {
            if (ean.length >= 8) { // Minimum EAN length
              products.push({
                name: `Product ${ean}`,
                price: 0,
                ean,
                url: '',
                category: categoryName,
              });
            }
          }
        }
      }

      console.log(`Found ${products.length} products in category: ${categoryName}`);
      return products;
    } catch (error) {
      console.error(`Error scraping category ${categoryName}:`, error);
      return [];
    }
  }

  async scrapeAllCategories(): Promise<NettoProduct[]> {
    console.log('Starting comprehensive Netto scraping...');
    
    // Udvidet liste af kategorier
    const categories = [
      { name: 'Frugt & Grønt', url: `${this.baseUrl}/varer/frugt-gront` },
      { name: 'Kød & Fisk', url: `${this.baseUrl}/varer/koed-fisk` },
      { name: 'Mejeri', url: `${this.baseUrl}/varer/mejeri` },
      { name: 'Brød & Bagværk', url: `${this.baseUrl}/varer/broed-bagvaerk` },
      { name: 'Kolde drikke', url: `${this.baseUrl}/varer/kolde-drikke` },
      { name: 'Varme drikke', url: `${this.baseUrl}/varer/varme-drikke` },
      { name: 'Slik & Snacks', url: `${this.baseUrl}/varer/slik-snacks` },
      { name: 'Frost', url: `${this.baseUrl}/varer/frost` },
      { name: 'Konserves', url: `${this.baseUrl}/varer/konserves` },
      { name: 'Tørvarer', url: `${this.baseUrl}/varer/toervarer` },
      { name: 'Husholdning', url: `${this.baseUrl}/varer/husholdning` },
      { name: 'Hygiejne', url: `${this.baseUrl}/varer/hygiejne` },
      { name: 'Baby', url: `${this.baseUrl}/varer/baby` },
      { name: 'Alle varer', url: `${this.baseUrl}/varer` },
      // Prøv også at scrape sitemap
      { name: 'Sitemap', url: `${this.baseUrl}/sitemap.xml` },
    ];

    const allProducts: NettoProduct[] = [];

    for (const category of categories) {
      try {
        if (category.name === 'Sitemap') {
          // Special handling for sitemap
          const sitemapProducts = await this.scrapeSitemap(category.url);
          allProducts.push(...sitemapProducts);
        } else {
          const products = await this.scrapeCategory(category.url, category.name);
          allProducts.push(...products);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error scraping category ${category.name}:`, error);
      }
    }

    // Remove duplicates based on name and EAN
    const uniqueProducts = allProducts.filter((product, index, self) => 
      index === self.findIndex(p => 
        p.name === product.name && 
        (p.ean ? p.ean === product.ean : true)
      )
    );

    console.log(`Total unique products found: ${uniqueProducts.length}`);
    return uniqueProducts;
  }

  async scrapeSitemap(sitemapUrl: string): Promise<NettoProduct[]> {
    try {
      console.log('Scraping sitemap for product URLs...');
      const html = await this.fetchPage(sitemapUrl);
      const dom = new JSDOM(html);
      const document = dom.window.document;

      const products: NettoProduct[] = [];
      const productUrls: string[] = [];

      // Find alle produkt URLs i sitemap
      const links = document.querySelectorAll('loc');
      for (const link of links) {
        const url = link.textContent?.trim();
        if (url && url.includes('/produkt/')) {
          productUrls.push(url);
        }
      }

      console.log(`Found ${productUrls.length} product URLs in sitemap`);

      // Scrape hver produkt URL
      for (const url of productUrls.slice(0, 50)) { // Limit to first 50 for testing
        try {
          const product = await this.scrapeIndividualProduct(url);
          if (product) {
            products.push(product);
          }
          await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
        } catch (error) {
          console.error(`Error scraping product ${url}:`, error);
        }
      }

      return products;
    } catch (error) {
      console.error('Error scraping sitemap:', error);
      return [];
    }
  }

  async scrapeIndividualProduct(productUrl: string): Promise<NettoProduct | null> {
    try {
      const html = await this.fetchPage(productUrl);
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Extract product info from individual product page
      const name = document.querySelector('h1, .product-title, [class*="title"]')?.textContent?.trim() || '';
      const priceElement = document.querySelector('.price, [class*="price"]');
      const price = priceElement ? parseFloat(priceElement.textContent?.replace(/[^\d,.-]/g, '').replace(',', '.') || '0') : 0;
      
      // Find EAN in page content
      const pageText = document.body.textContent || '';
      const eans = this.extractEANFromText(pageText);
      
      // Find category from breadcrumb or URL
      const breadcrumb = document.querySelector('.breadcrumb, .breadcrumbs');
      const category = breadcrumb?.textContent?.trim() || 'Unknown';

      if (!name) return null;

      return {
        name,
        price,
        ean: eans[0] || undefined,
        url: productUrl,
        category,
      };
    } catch (error) {
      console.error(`Error scraping individual product ${productUrl}:`, error);
      return null;
    }
  }

  async testProductWithCPAPI(ean: string): Promise<CPSallingInfo | null> {
    try {
      console.log(`Testing EAN ${ean} with CP API...`);
      
      const response = await axios.get(`${this.cpApiUrl}/${ean}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
        timeout: 5000,
      });

      if (response.data.errorName === 'NotFoundError') {
        console.log(`EAN ${ean} not found in CP API`);
        return null;
      }

      console.log(`SUCCESS! Found product data for EAN ${ean}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error testing EAN ${ean}:`, error);
      return null;
    }
  }

  async scrapeAndTestAllProducts(): Promise<{
    products: NettoProduct[];
    cpApiResults: { ean: string; data: CPSallingInfo | null }[];
  }> {
    console.log('Starting comprehensive Netto scraping and CP API testing...');
    
    // Scrape alle produkter
    const products = await this.scrapeAllCategories();
    
    // Test alle EAN koder mod CP API
    const cpApiResults: { ean: string; data: CPSallingInfo | null }[] = [];
    
    const productsWithEAN = products.filter(p => p.ean);
    console.log(`Testing ${productsWithEAN.length} products with EAN codes against CP API...`);
    
    for (const product of productsWithEAN) {
      if (product.ean) {
        const cpData = await this.testProductWithCPAPI(product.ean);
        cpApiResults.push({ ean: product.ean, data: cpData });
        
        // Rate limiting for CP API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { products, cpApiResults };
  }

  async findWorkingEANs(): Promise<string[]> {
    console.log('Finding working EAN codes...');
    
    const { cpApiResults } = await this.scrapeAndTestAllProducts();
    
    const workingEANs = cpApiResults
      .filter(result => result.data !== null)
      .map(result => result.ean);
    
    console.log(`Found ${workingEANs.length} working EAN codes:`, workingEANs);
    return workingEANs;
  }
}

// Export singleton instance
export const enhancedNettoScraper = new EnhancedNettoScraper();

