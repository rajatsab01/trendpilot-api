import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import BottomNav from "@/components/BottomNav";
import type { Broker } from "@shared/schema";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [directTradeEnabled, setDirectTradeEnabled] = useState(false);

  const userId = localStorage.getItem("userId");

  const { data: brokers } = useQuery<Broker[]>({
    queryKey: ["/api/brokers", userId],
    enabled: !!userId,
  });

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col">
      <div className="flex flex-col gap-6 flex-grow">
        <header className="flex items-center p-4">
          <button
            onClick={() => setLocation("/dashboard")}
            className="text-white hover-elevate active-elevate-2 rounded-full"
            data-testid="button-back"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1 className="flex-1 text-center text-xl font-bold text-white pr-8">
            {t.settings}
          </h1>
        </header>

        <main className="px-4 pb-32">
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-4">
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
                {t.brokerIntegrations}
              </h2>
              <div className="flex flex-col divide-y divide-[#29382f] rounded-xl bg-[#1C2620]">
                {brokers && brokers.length > 0 ? (
                  brokers.map((broker) => (
                    <div key={broker.id} className="flex items-center gap-4 p-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#29382f]">
                        <span className="material-symbols-outlined text-[#38e07b]">
                          account_balance
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium text-white" data-testid={`text-broker-${broker.id}`}>
                          {broker.name}
                        </p>
                        <p className="text-sm font-normal text-[#9eb7a8]">
                          {broker.isConnected ? t.connected : "Disconnected"}
                        </p>
                      </div>
                      <button className="text-white hover-elevate active-elevate-2 rounded-full p-2">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-[#9eb7a8]">
                    No brokers connected yet
                  </div>
                )}
                <button
                  onClick={() => setLocation("/add-broker")}
                  className="flex items-center justify-center gap-2 p-4 text-[#38e07b] hover-elevate active-elevate-2"
                  data-testid="button-add-broker"
                >
                  <span className="material-symbols-outlined">add</span>
                  <span className="text-base font-medium">{t.addNewBroker}</span>
                </button>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
                {t.tradeSettings}
              </h2>
              <div className="rounded-xl bg-[#1C2620] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-medium text-white">
                      {t.directTradeExecution}
                    </p>
                    <p className="text-sm font-normal text-[#9eb7a8]">
                      {t.enableDirectTrade}
                    </p>
                  </div>
                  <label className="relative flex h-8 w-14 cursor-pointer items-center rounded-full bg-[#29382f] transition-colors has-[:checked]:bg-[#38e07b]">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={directTradeEnabled}
                      onChange={(e) => setDirectTradeEnabled(e.target.checked)}
                      data-testid="toggle-direct-trade"
                    />
                    <span className="absolute left-1 size-6 rounded-full bg-white shadow-md transition-transform peer-checked:translate-x-6"></span>
                  </label>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
