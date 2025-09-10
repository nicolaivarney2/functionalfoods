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
}

export interface CPSallingInfo {
  // Vi definerer denne baseret på hvad vi finder
  [key: string]: any;
}

export class NettoScraper {
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
        },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }

  private extractEANFromText(text: string): string[] {
    // Find EAN koder (13 cifre)
    const eanRegex = /\b\d{13}\b/g;
    const eans = text.match(eanRegex) || [];
    
    // Find også kortere produktkoder
    const shortCodeRegex = /\b\d{8,12}\b/g;
    const shortCodes = text.match(shortCodeRegex) || [];
    
    return [...new Set([...eans, ...shortCodes])];
  }

  private parseProductFromElement(element: Element, category: string): NettoProduct | null {
    try {
      // Find produktnavn
      const nameElement = element.querySelector('[data-testid="product-name"], .product-name, h3, h4, .title') || 
                         element.querySelector('a[href*="/produkt/"]');
      const name = nameElement?.textContent?.trim() || '';

      // Find pris
      const priceElement = element.querySelector('[data-testid="price"], .price, .product-price, [class*="price"]');
      const priceText = priceElement?.textContent?.trim() || '';
      const price = parseFloat(priceText.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;

      // Find URL
      const linkElement = element.querySelector('a[href*="/produkt/"]') as HTMLAnchorElement;
      const url = linkElement ? `${this.baseUrl}${linkElement.href}` : '';

      // Find billede
      const imageElement = element.querySelector('img[src*="netto"], img[alt*="produkt"]') as HTMLImageElement;
      const image = imageElement?.src || '';

      // Find beskrivelse
      const descriptionElement = element.querySelector('.description, .product-description, p');
      const description = descriptionElement?.textContent?.trim() || '';

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
        console.log('No products found, trying alternative approach...');
        
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

      console.log(`Found ${products.length} products in category: ${categoryName}`);
      return products;
    } catch (error) {
      console.error(`Error scraping category ${categoryName}:`, error);
      return [];
    }
  }

  async scrapeAllCategories(): Promise<NettoProduct[]> {
    console.log('Starting comprehensive Netto scraping...');
    
    // Kategorier at scrape
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
    ];

    const allProducts: NettoProduct[] = [];

    for (const category of categories) {
      try {
        const products = await this.scrapeCategory(category.url, category.name);
        allProducts.push(...products);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
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
        await new Promise(resolve => setTimeout(resolve, 500));
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
export const nettoScraper = new NettoScraper();

