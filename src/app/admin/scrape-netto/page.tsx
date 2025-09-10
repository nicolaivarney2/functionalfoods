'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Download, TestTube } from 'lucide-react';

interface NettoProduct {
  name: string;
  price: number;
  ean?: string;
  url: string;
  category: string;
  image?: string;
  description?: string;
}

interface CPAPIResult {
  ean: string;
  data: any | null;
}

interface ScrapingResult {
  totalProducts: number;
  productsWithEAN: number;
  testedEANs: number;
  workingEANs: number;
  workingEANList: string[];
  cpApiResults: CPAPIResult[];
  sampleProducts: NettoProduct[];
}

export default function ScrapeNettoPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testEAN, setTestEAN] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const handleScrape = async (action: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/scrape-netto?action=${action}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Scraping failed');
      }

      if (action === 'test') {
        setResult(data.data);
      } else {
        setResult({
          totalProducts: data.data.length,
          productsWithEAN: data.data.filter((p: NettoProduct) => p.ean).length,
          testedEANs: 0,
          workingEANs: 0,
          workingEANList: [],
          cpApiResults: [],
          sampleProducts: data.data.slice(0, 10),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEAN = async () => {
    if (!testEAN.trim()) return;

    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/scrape-netto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ean: testEAN }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Test failed');
      }

      setTestResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadResults = () => {
    if (!result) return;

    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `netto-scraping-results-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Netto Product Scraper</h1>
          <p className="text-muted-foreground">
            Scrape Netto products and test them against CP API
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Scrape Products
            </CardTitle>
            <CardDescription>
              Scrape all products from Netto's website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleScrape('scrape')} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start Scraping'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test CP API
            </CardTitle>
            <CardDescription>
              Scrape products and test EANs against CP API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleScrape('test')} 
              disabled={isLoading}
              className="w-full"
              variant="secondary"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test All'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Working EANs
            </CardTitle>
            <CardDescription>
              Find only working EAN codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleScrape('find-working')} 
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find Working'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Known EANs
            </CardTitle>
            <CardDescription>
              Test known Danish EAN codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleScrape('test-known')} 
              disabled={isLoading}
              className="w-full"
              variant="secondary"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test Known'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Random EANs
            </CardTitle>
            <CardDescription>
              Test random EAN codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleScrape('test-random')} 
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test Random'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Individual EAN */}
      <Card>
        <CardHeader>
          <CardTitle>Test Individual EAN</CardTitle>
          <CardDescription>
            Test a specific EAN code against CP API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="testEAN">EAN Code</Label>
              <Input
                id="testEAN"
                value={testEAN}
                onChange={(e) => setTestEAN(e.target.value)}
                placeholder="Enter EAN code to test"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleTestEAN} 
                disabled={isLoading || !testEAN.trim()}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
              </Button>
            </div>
          </div>

          {testResult && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Test Result:</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">EAN:</span>
                  <code className="bg-background px-2 py-1 rounded">{testResult.ean}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Found:</span>
                  <Badge variant={testResult.found ? 'default' : 'destructive'}>
                    {testResult.found ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {testResult.cpData && (
                  <div>
                    <span className="font-medium">CP API Data:</span>
                    <pre className="mt-2 p-2 bg-background rounded text-sm overflow-auto">
                      {JSON.stringify(testResult.cpData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-destructive">
              <strong>Error:</strong> {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Scraping Results</CardTitle>
                <CardDescription>
                  Results from Netto product scraping and CP API testing
                </CardDescription>
              </div>
              <Button onClick={downloadResults} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Results
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.totalProducts}</div>
                <div className="text-sm text-muted-foreground">Total Products</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.productsWithEAN}</div>
                <div className="text-sm text-muted-foreground">With EAN</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.testedEANs}</div>
                <div className="text-sm text-muted-foreground">Tested EANs</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.workingEANs}</div>
                <div className="text-sm text-muted-foreground">Working EANs</div>
              </div>
            </div>

            {/* Working EANs */}
            {result.workingEANList.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Working EAN Codes:</h4>
                <div className="flex flex-wrap gap-2">
                  {result.workingEANList.map((ean, index) => (
                    <Badge key={index} variant="default" className="font-mono">
                      {ean}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Products */}
            {result.sampleProducts.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Sample Products:</h4>
                <div className="space-y-2">
                  {result.sampleProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.category} • {product.price} kr
                        </div>
                        {product.ean && (
                          <div className="text-xs font-mono text-blue-600">
                            EAN: {product.ean}
                          </div>
                        )}
                      </div>
                      {product.ean && (
                        <Badge variant="outline" className="ml-2">
                          Has EAN
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CP API Results */}
            {result.cpApiResults.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">CP API Results:</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.cpApiResults.map((result, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <code className="font-mono">{result.ean}</code>
                        <Badge variant="default">Found</Badge>
                      </div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
