/**
 * Symbol Testing Suite
 * 
 * Automated system to test ALL symbols in the instrument database
 * against real Yahoo Finance and Binance APIs to ensure they work.
 * 
 * Generates a comprehensive health report showing:
 * - Which symbols are working ✅
 * - Which symbols are broken ❌
 * - Suggestions for fixes
 */

import { instrumentDatabase, type InstrumentSuggestion } from "./instrumentSearch.js";
import { normalizeSymbolForAPI, type MarketType } from "./symbolRegistry.js";

interface SymbolTestResult {
  symbol: string;
  name: string;
  market: string;
  description?: string;
  status: 'working' | 'broken';
  error?: string;
  price?: number;
  lastTested: string;
  responseTime?: number;
}

interface SymbolHealthReport {
  generatedAt: string;
  totalSymbols: number;
  workingSymbols: number;
  brokenSymbols: number;
  successRate: number;
  results: SymbolTestResult[];
  brokenByMarket: Record<string, number>;
}

/**
 * Test a cryptocurrency symbol against Binance API
 */
async function testCryptoSymbol(symbol: string, name: string, description?: string): Promise<SymbolTestResult> {
  const startTime = Date.now();
  
  try {
    // Clean symbol and convert to Binance format
    const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const baseSymbol = cleanSymbol.replace(/USDT$/g, "").replace(/USD$/g, "");
    const binanceSymbol = baseSymbol.endsWith("USDT") ? baseSymbol : `${baseSymbol}USDT`;
    
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`;
    const response = await fetch(url);
    
    if (response.status === 451) {
      // Binance blocked - try CoinGecko as fallback
      return await testCryptoSymbolCoinGecko(symbol, name, description, startTime);
    }
    
    if (!response.ok) {
      return {
        symbol,
        name,
        market: 'cryptocurrency',
        description,
        status: 'broken',
        error: `Binance API error: ${response.status}`,
        lastTested: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
    
    const data = await response.json();
    const price = parseFloat(data.price);
    
    return {
      symbol,
      name,
      market: 'cryptocurrency',
      description,
      status: 'working',
      price,
      lastTested: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      symbol,
      name,
      market: 'cryptocurrency',
      description,
      status: 'broken',
      error: error.message,
      lastTested: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Test crypto symbol using CoinGecko (fallback when Binance is blocked)
 */
async function testCryptoSymbolCoinGecko(
  symbol: string,
  name: string,
  description: string | undefined,
  startTime: number
): Promise<SymbolTestResult> {
  try {
    // Comprehensive CoinGecko ID mapping for popular cryptocurrencies
    const coinGeckoMap: Record<string, string> = {
      'BTC': 'bitcoin', 'BTCUSDT': 'bitcoin', 'BITCOIN': 'bitcoin',
      'ETH': 'ethereum', 'ETHUSDT': 'ethereum', 'ETHEREUM': 'ethereum',
      'BNB': 'binancecoin', 'BNBUSDT': 'binancecoin', 'BINANCE': 'binancecoin',
      'SOL': 'solana', 'SOLUSDT': 'solana', 'SOLANA': 'solana',
      'XRP': 'ripple', 'XRPUSDT': 'ripple', 'RIPPLE': 'ripple',
      'ADA': 'cardano', 'ADAUSDT': 'cardano', 'CARDANO': 'cardano',
      'DOGE': 'dogecoin', 'DOGEUSDT': 'dogecoin', 'DOGECOIN': 'dogecoin',
      'AVAX': 'avalanche-2', 'AVAXUSDT': 'avalanche-2',
      'DOT': 'polkadot', 'DOTUSDT': 'polkadot',
      'MATIC': 'matic-network', 'MATICUSDT': 'matic-network',
      'LINK': 'chainlink', 'LINKUSDT': 'chainlink',
      'UNI': 'uniswap', 'UNIUSDT': 'uniswap',
      'ATOM': 'cosmos', 'ATOMUSDT': 'cosmos',
      'LTC': 'litecoin', 'LTCUSDT': 'litecoin',
      'BCH': 'bitcoin-cash', 'BCHUSDT': 'bitcoin-cash',
      'TRX': 'tron', 'TRXUSDT': 'tron',
      'SHIB': 'shiba-inu', 'SHIBUSDT': 'shiba-inu',
      'APT': 'aptos', 'APTUSDT': 'aptos',
      'ARB': 'arbitrum', 'ARBUSDT': 'arbitrum',
      'OP': 'optimism', 'OPUSDT': 'optimism',
      'XLM': 'stellar', 'XLMUSDT': 'stellar',
      'USDT': 'tether', 'USDC': 'usd-coin',
    };
    
    // Normalize symbol: extract base currency from various formats
    // BTC-USD → BTC, BTCUSDT → BTC, BITCOIN → BTC
    let cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    // Try to extract base symbol by removing common quote currencies
    const baseSymbol = cleanSymbol
      .replace(/USDT$/g, "")
      .replace(/USD$/g, "")
      .replace(/BUSD$/g, "")
      .replace(/EUR$/g, "")
      .replace(/GBP$/g, "");
    
    // Try multiple lookups: exact match, base symbol, clean symbol
    const coinId = coinGeckoMap[cleanSymbol] || coinGeckoMap[baseSymbol];
    
    if (!coinId) {
      return {
        symbol,
        name,
        market: 'cryptocurrency',
        description,
        status: 'broken',
        error: 'Not in CoinGecko mapping (Binance blocked)',
        lastTested: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
    
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return {
        symbol,
        name,
        market: 'cryptocurrency',
        description,
        status: 'broken',
        error: `CoinGecko API error: ${response.status}`,
        lastTested: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
    
    const data = await response.json();
    const price = data[coinId]?.usd;
    
    if (!price) {
      return {
        symbol,
        name,
        market: 'cryptocurrency',
        description,
        status: 'broken',
        error: 'No price data from CoinGecko',
        lastTested: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
    
    return {
      symbol,
      name,
      market: 'cryptocurrency',
      description,
      status: 'working',
      price,
      lastTested: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      symbol,
      name,
      market: 'cryptocurrency',
      description,
      status: 'broken',
      error: `CoinGecko fallback failed: ${error.message}`,
      lastTested: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Test a symbol against Yahoo Finance API
 */
async function testYahooSymbol(
  symbol: string,
  name: string,
  market: string,
  description?: string
): Promise<SymbolTestResult> {
  const startTime = Date.now();
  
  try {
    // Use unified symbol normalization from symbolRegistry
    // This ensures test suite uses the same transformation logic as the rest of the app
    const yahooSymbol = normalizeSymbolForAPI(symbol, market as MarketType);
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      return {
        symbol,
        name,
        market,
        description,
        status: 'broken',
        error: `Yahoo Finance HTTP ${response.status}`,
        lastTested: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
    
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      return {
        symbol,
        name,
        market,
        description,
        status: 'broken',
        error: 'No data returned from Yahoo Finance',
        lastTested: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const price = meta.regularMarketPrice || meta.previousClose;
    
    if (!price) {
      return {
        symbol,
        name,
        market,
        description,
        status: 'broken',
        error: 'No price data available',
        lastTested: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
    
    return {
      symbol,
      name,
      market,
      description,
      status: 'working',
      price,
      lastTested: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      symbol,
      name,
      market,
      description,
      status: 'broken',
      error: error.message,
      lastTested: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Test all symbols in the instrument database
 */
export async function testAllSymbols(): Promise<SymbolHealthReport> {
  console.log('🧪 Starting comprehensive symbol testing suite...\n');
  
  const results: SymbolTestResult[] = [];
  const totalSymbols: number[] = [];
  
  // Collect all unique symbols from the database
  for (const [searchTerm, suggestions] of Object.entries(instrumentDatabase)) {
    for (const suggestion of suggestions as InstrumentSuggestion[]) {
      // Avoid duplicates
      const isDuplicate = results.some(r => 
        r.symbol === suggestion.symbol && r.market === suggestion.market
      );
      
      if (!isDuplicate) {
        totalSymbols.push(results.length);
        
        console.log(`Testing ${results.length + 1}: ${suggestion.symbol} (${suggestion.market})...`);
        
        let result: SymbolTestResult;
        
        if (suggestion.market === 'cryptocurrency') {
          result = await testCryptoSymbol(suggestion.symbol, suggestion.name, suggestion.description);
        } else {
          result = await testYahooSymbol(suggestion.symbol, suggestion.name, suggestion.market, suggestion.description);
        }
        
        results.push(result);
        
        // Show immediate result
        if (result.status === 'working') {
          console.log(`  ✅ Working - Price: $${result.price} (${result.responseTime}ms)`);
        } else {
          console.log(`  ❌ Broken - ${result.error} (${result.responseTime}ms)`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }
  
  // Calculate statistics
  const workingCount = results.filter(r => r.status === 'working').length;
  const brokenCount = results.filter(r => r.status === 'broken').length;
  const successRate = (workingCount / results.length) * 100;
  
  // Group broken symbols by market
  const brokenByMarket: Record<string, number> = {};
  results.filter(r => r.status === 'broken').forEach(r => {
    brokenByMarket[r.market] = (brokenByMarket[r.market] || 0) + 1;
  });
  
  const report: SymbolHealthReport = {
    generatedAt: new Date().toISOString(),
    totalSymbols: results.length,
    workingSymbols: workingCount,
    brokenSymbols: brokenCount,
    successRate: parseFloat(successRate.toFixed(2)),
    results,
    brokenByMarket,
  };
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SYMBOL HEALTH REPORT');
  console.log('='.repeat(60));
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Total Symbols Tested: ${report.totalSymbols}`);
  console.log(`✅ Working: ${report.workingSymbols} (${report.successRate}%)`);
  console.log(`❌ Broken: ${report.brokenSymbols} (${(100 - report.successRate).toFixed(2)}%)`);
  
  if (Object.keys(brokenByMarket).length > 0) {
    console.log('\nBroken Symbols by Market:');
    for (const [market, count] of Object.entries(brokenByMarket)) {
      console.log(`  - ${market}: ${count}`);
    }
  }
  
  console.log('='.repeat(60) + '\n');
  
  return report;
}

/**
 * Get broken symbols from a health report
 */
export function getBrokenSymbols(report: SymbolHealthReport): SymbolTestResult[] {
  return report.results.filter(r => r.status === 'broken');
}

/**
 * Get working symbols from a health report
 */
export function getWorkingSymbols(report: SymbolHealthReport): SymbolTestResult[] {
  return report.results.filter(r => r.status === 'working');
}

/**
 * CLI runner for manual testing
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Running Symbol Testing Suite...\n');
  
  testAllSymbols()
    .then(report => {
      // Save report to file
      const fs = require('fs');
      const reportPath = './symbol-health-report.json';
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`✅ Report saved to: ${reportPath}\n`);
      
      // Show broken symbols if any
      if (report.brokenSymbols > 0) {
        console.log('❌ BROKEN SYMBOLS:');
        const broken = getBrokenSymbols(report);
        broken.forEach(symbol => {
          console.log(`  - ${symbol.symbol} (${symbol.market}): ${symbol.error}`);
        });
        process.exit(1);
      } else {
        console.log('🎉 All symbols are working perfectly!');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('❌ Testing failed:', error);
      process.exit(1);
    });
}
