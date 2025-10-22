import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import BottomNav from "@/components/BottomNav";
import type { Analysis } from "@shared/schema";

export default function Analyzer() {
  const [location, setLocation] = useLocation();
  const { t } = useLanguage();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const analysisId = searchParams.get("analysisId");

  const [quantity, setQuantity] = useState(100);
  const [broker, setBroker] = useState("Broker A");

  const { data: analysis, isLoading } = useQuery<Analysis>({
    queryKey: ["/api/analysis", analysisId],
    enabled: !!analysisId,
  });

  if (isLoading || !analysis) {
    return (
      <div className="min-h-screen bg-[#111714] flex items-center justify-center">
        <div className="text-white">Loading analysis...</div>
      </div>
    );
  }

  const isBullish = analysis.sentiment === "Bullish";
  const sentimentColor = isBullish ? "text-[#38e07b]" : "text-red-500";

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col">
      <div className="flex-grow">
        <header className="flex items-center p-4 justify-between sticky top-0 bg-[#111714]/80 backdrop-blur-sm z-10">
          <button
            onClick={() => setLocation("/dashboard")}
            className="text-white flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1c2620] hover-elevate active-elevate-2"
            data-testid="button-back"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
            {t.analyzer}
          </h1>
        </header>

        <main className="p-4 space-y-8">
          <div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4">
              {t.leadingIndicators}
            </h2>
            <div className="space-y-3 rounded-2xl bg-[#1c2620] p-4">
              <div className="flex justify-between items-center">
                <span className="text-[#9eb7a8] text-base font-normal">{t.rsi}</span>
                <span className="text-white text-base font-medium" data-testid="text-rsi">
                  {analysis.rsi}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9eb7a8] text-base font-normal">{t.macd}</span>
                <span className="text-white text-base font-medium" data-testid="text-macd">
                  {analysis.macd}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9eb7a8] text-base font-normal">
                  {t.stochastic}
                </span>
                <span className="text-white text-base font-medium" data-testid="text-stochastic">
                  {analysis.stochastic}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9eb7a8] text-base font-normal">
                  {t.bollingerBands}
                </span>
                <span className="text-white text-base font-medium" data-testid="text-bollinger">
                  {analysis.bollingerBands}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#1c2620] p-4">
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4">
              {t.aiAnalysis}
            </h2>
            <div className="flex items-center justify-around mb-4">
              <div className="relative w-40 h-40">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 36 36"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="stroke-current text-[#29382f]"
                    cx="18"
                    cy="18"
                    fill="none"
                    r="16"
                    strokeWidth="3"
                  ></circle>
                  <circle
                    className={`stroke-current ${sentimentColor}`}
                    cx="18"
                    cy="18"
                    fill="none"
                    r="16"
                    strokeDasharray="100"
                    strokeDashoffset={100 - analysis.confidence}
                    strokeLinecap="round"
                    strokeWidth="3"
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-white" data-testid="text-confidence">
                    {analysis.confidence}%
                  </span>
                  <span className={`text-lg font-medium ${sentimentColor}`} data-testid="text-sentiment">
                    {analysis.sentiment}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[#9eb7a8] text-sm font-normal">{t.buyOrSell}</p>
                <p
                  className={`text-2xl font-bold mt-2 ${sentimentColor}`}
                  data-testid="text-recommendation"
                >
                  {analysis.recommendation}
                </p>
              </div>
            </div>
            <p className="text-[#9eb7a8] text-base font-normal leading-relaxed text-center">
              {analysis.analysis}
            </p>
          </div>

          <div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4">
              {t.bracketTrade}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1c2620] p-4 rounded-2xl text-center">
                  <p className="text-[#9eb7a8] text-sm font-normal">{t.entry}</p>
                  <p className="text-white text-lg font-bold mt-1" data-testid="text-entry">
                    {analysis.entry}
                  </p>
                  <div className="flex justify-center mt-2">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="size-4 rounded bg-[#334139] border-none accent-[#38e07b]"
                      data-testid="checkbox-entry"
                    />
                  </div>
                </div>
                <div className="bg-[#1c2620] p-4 rounded-2xl text-center">
                  <p className="text-[#9eb7a8] text-sm font-normal">{t.takeProfit}</p>
                  <p className="text-[#38e07b] text-lg font-bold mt-1" data-testid="text-take-profit">
                    {analysis.takeProfit}
                  </p>
                  <div className="flex justify-center mt-2">
                    <input
                      type="checkbox"
                      className="size-4 rounded bg-[#334139] border-none accent-[#38e07b]"
                      data-testid="checkbox-take-profit"
                    />
                  </div>
                </div>
                <div className="bg-[#1c2620] p-4 rounded-2xl text-center">
                  <p className="text-[#9eb7a8] text-sm font-normal">{t.stopLoss}</p>
                  <p className="text-red-500 text-lg font-bold mt-1" data-testid="text-stop-loss">
                    {analysis.stopLoss}
                  </p>
                  <div className="flex justify-center mt-2">
                    <input
                      type="checkbox"
                      className="size-4 rounded bg-[#334139] border-none accent-[#38e07b]"
                      data-testid="checkbox-stop-loss"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#1c2620] p-4 rounded-2xl flex items-center justify-between">
                <label className="text-[#9eb7a8] text-base font-normal" htmlFor="quantity">
                  {t.quantity}
                </label>
                <input
                  className="w-24 bg-[#334139] text-white text-center rounded-md border-none focus:ring-2 focus:ring-[#38e07b] px-2 py-1"
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  data-testid="input-quantity"
                />
              </div>

              <div className="bg-[#1c2620] p-4 rounded-2xl flex items-center justify-between">
                <label className="text-[#9eb7a8] text-base font-normal" htmlFor="broker">
                  {t.brokerChoice}
                </label>
                <select
                  className="bg-[#334139] text-white rounded-md border-none focus:ring-2 focus:ring-[#38e07b] px-3 py-1 min-w-[120px]"
                  id="broker"
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  data-testid="select-broker"
                >
                  <option>Broker A</option>
                  <option>Broker B</option>
                  <option>Broker C</option>
                </select>
              </div>

              <button
                className="w-full bg-[#38e07b] text-[#111714] font-bold py-4 rounded-full text-center text-lg hover:bg-opacity-90 transition-colors"
                data-testid="button-execute"
              >
                {t.execute}
              </button>
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
