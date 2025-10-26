/**
 * Currency Conversion Utility
 * Uses Frankfurter API (European Central Bank data) for real-time exchange rates
 * No API key required
 */

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  date: string;
}

// Cache exchange rates for 1 hour to reduce API calls
const rateCache: Map<string, { rates: ExchangeRates; timestamp: number }> = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetch latest exchange rates from Frankfurter API
 */
export async function fetchExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRates> {
  const cacheKey = baseCurrency;
  const cached = rateCache.get(cacheKey);
  
  // Return cached rates if still valid
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.rates;
  }

  try {
    const response = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status}`);
    }
    
    const data: ExchangeRates = await response.json();
    
    // Cache the rates
    rateCache.set(cacheKey, { rates: data, timestamp: Date.now() });
    
    console.log(`✅ Fetched exchange rates for ${baseCurrency}:`, Object.keys(data.rates).length, 'currencies');
    
    return data;
  } catch (error: any) {
    console.error('❌ Failed to fetch exchange rates:', error.message);
    
    // Fallback to cached data if available, even if expired
    if (cached) {
      console.log('⚠️ Using expired cached exchange rates');
      return cached.rates;
    }
    
    // Ultimate fallback: no conversion (1:1 rate)
    console.log('⚠️ No exchange rates available - using 1:1 fallback');
    return {
      base: baseCurrency,
      rates: {},
      date: new Date().toISOString().split('T')[0]
    };
  }
}

/**
 * Convert amount from USD to target currency using pre-fetched exchange rates
 */
export function convertCurrencyWithRate(
  amountInUSD: number,
  exchangeRate: number
): number {
  return amountInUSD * exchangeRate;
}

/**
 * Convert amount from USD to target currency (fetches rates)
 */
export async function convertCurrency(
  amountInUSD: number,
  targetCurrency: string
): Promise<number> {
  // If target is USD, no conversion needed
  if (targetCurrency === 'USD') {
    return amountInUSD;
  }

  try {
    const exchangeData = await fetchExchangeRates('USD');
    const rate = exchangeData.rates[targetCurrency];
    
    if (!rate) {
      console.warn(`⚠️ Exchange rate not found for ${targetCurrency}, using original USD value`);
      return amountInUSD;
    }
    
    const convertedAmount = amountInUSD * rate;
    console.log(`💱 Converted ${amountInUSD} USD → ${convertedAmount.toFixed(2)} ${targetCurrency} (rate: ${rate})`);
    
    return convertedAmount;
  } catch (error: any) {
    console.error(`❌ Currency conversion failed for ${targetCurrency}:`, error.message);
    return amountInUSD; // Return original USD value as fallback
  }
}

/**
 * Convert a price string (e.g., "1234.56") from USD to target currency
 * Returns the converted price as a string with 2 decimal places
 */
export async function convertPriceString(
  priceUSD: string | number,
  targetCurrency: string
): Promise<string> {
  const amount = typeof priceUSD === 'string' ? parseFloat(priceUSD) : priceUSD;
  
  if (isNaN(amount)) {
    console.warn('⚠️ Invalid price value:', priceUSD);
    return String(priceUSD); // Return original if invalid
  }
  
  const converted = await convertCurrency(amount, targetCurrency);
  return converted.toFixed(2);
}

/**
 * Get current exchange rate for a currency pair
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  try {
    const exchangeData = await fetchExchangeRates(fromCurrency);
    const rate = exchangeData.rates[toCurrency];
    
    return rate || 1;
  } catch (error) {
    console.error('❌ Failed to get exchange rate:', error);
    return 1; // Fallback to 1:1
  }
}
