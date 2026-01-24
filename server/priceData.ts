import axios from "axios";

// Basic price data fetcher (mock version for now)
export const fetchPriceData = async (
  symbol: string,
  timeframe: string = "1h",
  hours: number = 24,
  market?: string
): Promise<any[]> => {
  try {
    console.log(`📈 Fetching price data for ${symbol} (${timeframe}, ${hours}h)`);

    // Mock data for demo (replace later with Binance, NSE, etc.)
    const prices = Array.from({ length: hours }, (_, i) => ({
      time: Date.now() - i * 3600 * 1000,
      open: 100 + i,
      high: 102 + i,
      low: 98 + i,
      close: 101 + i,
    }));

    return prices.reverse();
  } catch (error: any) {
    console.error("Error fetching price data:", error);
    throw new Error("Failed to fetch price data");
  }
};

// --- Compatibility export for routes.ts (Render/esbuild)
// If your actual function name is different, keep this wrapper and map it below.
export async function fetchMarketPrice(...args: any[]) {
  // Try to call the most likely existing function names safely
  const mod: any = await import('./priceData');
  const fn = mod.fetchMarketPrice || mod.getMarketPrice || mod.getPrice || mod.fetchPrice;
  if (typeof fn !== 'function') {
    throw new Error('No price fetch function found in priceData.ts');
  }
  return fn(...args);
}

