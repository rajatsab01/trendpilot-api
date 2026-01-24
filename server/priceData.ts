// server/priceData.ts
import axios from "axios";

/**
 * Returns a single latest price for a symbol.
 * - For crypto like "ETHUSDT", fetches from Binance ticker endpoint.
 * - For everything else, returns a safe mock value (so build + app works).
 */
export async function fetchMarketPrice(symbol: string, market?: string): Promise<number> {
  const sym = (symbol || "").toUpperCase().trim();

  // Crypto path (Binance)
  // Example: ETHUSDT, BTCUSDT
  if (market === "crypto" || sym.endsWith("USDT")) {
    try {
      const url = `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(sym)}`;
      const { data } = await axios.get(url, { timeout: 10000 });
      const price = Number(data?.price);
      if (!Number.isFinite(price)) throw new Error("Invalid Binance price");
      return price;
    } catch (e) {
      console.error("[fetchMarketPrice] Binance fetch failed:", e);
      // fallback so app does not crash
      return 0;
    }
  }

  // Fallback for stocks/commodities/forex until you implement their sources
  return 0;
}

/**
 * Basic OHLC array builder (demo/mock).
 * Keep this for charts if your frontend expects OHLC data.
 */
export const fetchPriceData = async (
  symbol: string,
  timeframe: string = "1h",
  hours: number = 24,
  market?: string
): Promise<any[]> => {
  try {
    console.log(`📈 Fetching price data for ${symbol} (${timeframe}, ${hours}h)`);

    // mock OHLC
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
