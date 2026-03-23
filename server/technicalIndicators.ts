/** Minimal OHLC shape (matches CandleData in perplexity.ts) */
export type OHLCBar = { high: number; low: number; close: number };

function closesHighsLows(candles: OHLCBar[]) {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  return { closes, highs, lows };
}

/** Wilder RSI(period) on the last bar */
export function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch > 0) avgGain += ch;
    else avgLoss -= ch;
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    const g = ch > 0 ? ch : 0;
    const l = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function emaLast(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < period; i++) ema += values[i];
  ema /= period;
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

/** MACD line (EMA12 − EMA26) at last close */
export function computeMACDLine(closes: number[]): number | null {
  const fast = emaLast(closes, 12);
  const slow = emaLast(closes, 26);
  if (fast === null || slow === null) return null;
  return fast - slow;
}

/** Stochastic %K(period) using last candle */
export function computeStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number | null {
  if (highs.length !== closes.length || lows.length !== closes.length) return null;
  if (closes.length < period) return null;
  const n = closes.length;
  let lowest = Infinity;
  let highest = -Infinity;
  for (let i = n - period; i < n; i++) {
    lowest = Math.min(lowest, lows[i]);
    highest = Math.max(highest, highs[i]);
  }
  const c = closes[n - 1];
  if (!Number.isFinite(lowest) || !Number.isFinite(highest) || highest === lowest) return 50;
  return ((c - lowest) / (highest - lowest)) * 100;
}

/** Bollinger %B (20, 2σ) — position within band, 0–100 scale */
export function computeBollingerPercentB(closes: number[], period = 20): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((s, x) => s + (x - mean) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  if (std === 0) return 50;
  const upper = mean + 2 * std;
  const lower = mean - 2 * std;
  const last = closes[closes.length - 1];
  if (upper === lower) return 50;
  return ((last - lower) / (upper - lower)) * 100;
}

export interface ComputedIndicatorStrings {
  rsi: string;
  macd: string;
  stochastic: string;
  bollingerBands: string;
}

export function computeIndicatorsFromCandles(candles: OHLCBar[]): ComputedIndicatorStrings | null {
  if (!candles?.length) return null;
  const { closes, highs, lows } = closesHighsLows(candles);
  const rsi = computeRSI(closes, 14);
  const macd = computeMACDLine(closes);
  const stoch = computeStochastic(highs, lows, closes, 14);
  const pctB = computeBollingerPercentB(closes, 20);

  if (rsi === null && macd === null && stoch === null && pctB === null) return null;

  return {
    rsi: rsi !== null ? rsi.toFixed(1) : "",
    macd: macd !== null ? macd.toFixed(4) : "",
    stochastic: stoch !== null ? stoch.toFixed(1) : "",
    bollingerBands:
      pctB !== null
        ? `%B ${pctB.toFixed(1)}`
        : "",
  };
}
