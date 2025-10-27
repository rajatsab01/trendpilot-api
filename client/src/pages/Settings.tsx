import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import type { Broker } from "@shared/schema";
import { APP_VERSION } from "@shared/schema";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [directTradeEnabled, setDirectTradeEnabled] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const userId = localStorage.getItem("userId");

  const { data: brokers } = useQuery<Broker[]>({
    queryKey: [`/api/brokers/${userId}`],
    enabled: !!userId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (brokerId: string) => {
      const result = await apiRequest("DELETE", `/api/brokers/${brokerId}`);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/brokers/${userId}`] });
      toast({
        title: "Success",
        description: "Broker deleted successfully",
      });
      setDeleteConfirmId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete broker. Please try again.",
        variant: "destructive",
      });
    },
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
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setLocation(`/edit-broker/${broker.id}`)}
                          className="text-[#38e07b] hover-elevate active-elevate-2 rounded-full p-2"
                          data-testid={`button-edit-${broker.id}`}
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(broker.id)}
                          className="text-red-500 hover-elevate active-elevate-2 rounded-full p-2"
                          data-testid={`button-delete-${broker.id}`}
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
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

            {/* App Information */}
            <section className="flex flex-col gap-4">
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
                {t.appInformation}
              </h2>
              <div className="rounded-xl bg-[#1C2620] divide-y divide-[#29382f]">
                <div className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#29382f]">
                      <span className="material-symbols-outlined text-[#38e07b]">
                        info
                      </span>
                    </div>
                    <div>
                      <p className="text-base font-medium text-white">{t.version}</p>
                      <p className="text-sm font-normal text-[#9eb7a8]">
                        {t.currentVersion}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-[#38e07b]/20 rounded-lg">
                    <p className="text-[#38e07b] font-semibold" data-testid="text-app-version">
                      v{APP_VERSION}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#29382f]">
                      <span className="material-symbols-outlined text-[#38e07b]">
                        rocket_launch
                      </span>
                    </div>
                    <div>
                      <p className="text-base font-medium text-white">Trend Pilot</p>
                      <p className="text-sm font-normal text-[#9eb7a8]">
                        AI-powered trading assistant
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <BottomNav />

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1c2620] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white text-xl font-bold mb-2">Delete Broker</h3>
            <p className="text-[#9eb7a8] text-sm mb-6">
              Are you sure you want to delete this broker? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-[#29382f] text-white py-3 rounded-full font-medium hover-elevate active-elevate-2"
                data-testid="button-cancel-delete"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-500 text-white py-3 rounded-full font-medium hover:bg-red-600 disabled:opacity-50"
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
