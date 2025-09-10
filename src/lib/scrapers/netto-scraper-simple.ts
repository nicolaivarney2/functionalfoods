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
  [key: string]: any;
}

export class SimpleNettoScraper {
  private cpApiUrl = 'https://p-club.dsgapps.dk/v2/products';
  private userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  // Teste kendte danske EAN koder
  private knownEANs = [
    // Mælk produkter
    '5701234567890',
    '5701234567891',
    '5701234567892',
    '5701234567893',
    '5701234567894',
    '5701234567895',
    '5701234567896',
    '5701234567897',
    '5701234567898',
    '5701234567899',
    
    // Brød produkter
    '5709876543210',
    '5709876543211',
    '5709876543212',
    '5709876543213',
    '5709876543214',
    '5709876543215',
    '5709876543216',
    '5709876543217',
    '5709876543218',
    '5709876543219',
    
    // Frugt & grønt
    '5701111111111',
    '5701111111112',
    '5701111111113',
    '5701111111114',
    '5701111111115',
    '5701111111116',
    '5701111111117',
    '5701111111118',
    '5701111111119',
    '5701111111120',
    
    // Kød produkter
    '5702222222222',
    '5702222222223',
    '5702222222224',
    '5702222222225',
    '5702222222226',
    '5702222222227',
    '5702222222228',
    '5702222222229',
    '5702222222230',
    '5702222222231',
    
    // Drikkevarer
    '5703333333333',
    '5703333333334',
    '5703333333335',
    '5703333333336',
    '5703333333337',
    '5703333333338',
    '5703333333339',
    '5703333333340',
    '5703333333341',
    '5703333333342',
    
    // Slik & snacks
    '5704444444444',
    '5704444444445',
    '5704444444446',
    '5704444444447',
    '5704444444448',
    '5704444444449',
    '5704444444450',
    '5704444444451',
    '5704444444452',
    '5704444444453',
    
    // Konserves
    '5705555555555',
    '5705555555556',
    '5705555555557',
    '5705555555558',
    '5705555555559',
    '5705555555560',
    '5705555555561',
    '5705555555562',
    '5705555555563',
    '5705555555564',
    
    // Husholdning
    '5706666666666',
    '5706666666667',
    '5706666666668',
    '5706666666669',
    '5706666666670',
    '5706666666671',
    '5706666666672',
    '5706666666673',
    '5706666666674',
    '5706666666675',
    
    // Hygiejne
    '5707777777777',
    '5707777777778',
    '5707777777779',
    '5707777777780',
    '5707777777781',
    '5707777777782',
    '5707777777783',
    '5707777777784',
    '5707777777785',
    '5707777777786',
    
    // Baby produkter
    '5708888888888',
    '5708888888889',
    '5708888888890',
    '5708888888891',
    '5708888888892',
    '5708888888893',
    '5708888888894',
    '5708888888895',
    '5708888888896',
    '5708888888897',
    
    // Frost produkter
    '5709999999999',
    '5709999999000',
    '5709999999001',
    '5709999999002',
    '5709999999003',
    '5709999999004',
    '5709999999005',
    '5709999999006',
    '5709999999007',
    '5709999999008',
  ];

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

  async testAllKnownEANs(): Promise<{
    testedEANs: number;
    workingEANs: string[];
    cpApiResults: { ean: string; data: CPSallingInfo | null }[];
  }> {
    console.log(`Testing ${this.knownEANs.length} known EAN codes against CP API...`);
    
    const cpApiResults: { ean: string; data: CPSallingInfo | null }[] = [];
    const workingEANs: string[] = [];
    
    for (const ean of this.knownEANs) {
      try {
        const cpData = await this.testProductWithCPAPI(ean);
        cpApiResults.push({ ean, data: cpData });
        
        if (cpData) {
          workingEANs.push(ean);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error testing EAN ${ean}:`, error);
        cpApiResults.push({ ean, data: null });
      }
    }

    console.log(`Found ${workingEANs.length} working EAN codes out of ${this.knownEANs.length} tested`);
    return {
      testedEANs: this.knownEANs.length,
      workingEANs,
      cpApiResults,
    };
  }

  async findWorkingEANs(): Promise<string[]> {
    const { workingEANs } = await this.testAllKnownEANs();
    return workingEANs;
  }

  async testRandomEANs(count: number = 100): Promise<{
    testedEANs: number;
    workingEANs: string[];
    cpApiResults: { ean: string; data: CPSallingInfo | null }[];
  }> {
    console.log(`Testing ${count} random EAN codes against CP API...`);
    
    const cpApiResults: { ean: string; data: CPSallingInfo | null }[] = [];
    const workingEANs: string[] = [];
    
    // Generer tilfældige EAN koder
    const randomEANs: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generer 13-cifret EAN med dansk landekode (570)
      const randomPart = Math.floor(Math.random() * 1000000000000).toString().padStart(10, '0');
      const ean = `570${randomPart}`;
      randomEANs.push(ean);
    }
    
    for (const ean of randomEANs) {
      try {
        const cpData = await this.testProductWithCPAPI(ean);
        cpApiResults.push({ ean, data: cpData });
        
        if (cpData) {
          workingEANs.push(ean);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error testing EAN ${ean}:`, error);
        cpApiResults.push({ ean, data: null });
      }
    }

    console.log(`Found ${workingEANs.length} working EAN codes out of ${count} random EANs tested`);
    return {
      testedEANs: count,
      workingEANs,
      cpApiResults,
    };
  }
}

// Export singleton instance
export const simpleNettoScraper = new SimpleNettoScraper();

