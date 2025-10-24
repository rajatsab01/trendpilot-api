import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Broker } from "@shared/schema";

export default function EditBroker() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/edit-broker/:id");
  const { t } = useLanguage();
  const { toast } = useToast();
  const [brokerName, setBrokerName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookMessage, setWebhookMessage] = useState("");
  const [strategyId, setStrategyId] = useState("");

  const userId = localStorage.getItem("userId");
  const brokerId = params?.id;

  // Fetch broker data
  const { data: broker, isLoading } = useQuery<Broker>({
    queryKey: [`/api/brokers/${brokerId}`],
    enabled: !!brokerId,
  });

  // Pre-fill form when broker data loads
  useEffect(() => {
    if (broker) {
      setBrokerName(broker.name);
      setApiKey(broker.apiKey || "");
      setWebhookUrl(broker.webhookUrl || "");
      setWebhookMessage(broker.webhookMessage || "");
      setStrategyId(broker.strategyId || "");
    }
  }, [broker]);

  const updateBrokerMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("PATCH", `/api/brokers/${brokerId}`, {
        name: brokerName,
        apiKey: apiKey || null,
        webhookUrl: webhookUrl || null,
        webhookMessage: webhookMessage || null,
        strategyId: strategyId || null,
      });
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/brokers/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/brokers/${brokerId}`] });
      toast({
        title: "Success",
        description: "Broker updated successfully",
      });
      setLocation("/settings");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update broker. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a broker name",
        variant: "destructive",
      });
      return;
    }
    if (!apiKey.trim() && !webhookUrl.trim()) {
      toast({
        title: "Error",
        description: "Please provide either an API key or webhook URL",
        variant: "destructive",
      });
      return;
    }
    updateBrokerMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111714] flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!broker) {
    return (
      <div className="min-h-screen bg-[#111714] flex items-center justify-center">
        <p className="text-white">Broker not found</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#111714]">
      <div className="flex flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-b-[#29382f] px-4">
          <button
            onClick={() => setLocation("/settings")}
            className="flex items-center justify-center text-white hover-elevate active-elevate-2 rounded-full p-2"
            data-testid="button-close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 className="text-lg font-bold text-white">Edit Broker</h1>
          <div className="w-8"></div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#9eb7a8]" htmlFor="broker-name">
                {t.brokerName}
              </label>
              <input
                className="w-full rounded-xl border-[#29382f] bg-[#29382f] p-3 text-white placeholder-[#6a7f72] focus:border-[#38e07b] focus:ring-2 focus:ring-[#38e07b]"
                id="broker-name"
                placeholder={t.enterBrokerName}
                value={brokerName}
                onChange={(e) => setBrokerName(e.target.value)}
                data-testid="input-broker-name"
              />
            </div>

            <div className="relative flex flex-col gap-4">
              <p className="text-sm font-medium text-[#9eb7a8]">
                {t.chooseIntegrationMethod}
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#9eb7a8]" htmlFor="api-key">
                  {t.apiKey}
                </label>
                <input
                  className="w-full rounded-xl border-[#29382f] bg-[#29382f] p-3 text-white placeholder-[#6a7f72] focus:border-[#38e07b] focus:ring-2 focus:ring-[#38e07b]"
                  id="api-key"
                  placeholder={t.enterApiKey}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  data-testid="input-api-key"
                />
              </div>

              <div className="relative flex items-center justify-center">
                <hr className="w-full border-t border-[#29382f]" />
                <span className="absolute bg-[#111714] px-2 text-sm text-[#6a7f72]">
                  {t.or}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#9eb7a8]" htmlFor="webhook-url">
                  {t.webhookUrl}
                </label>
                <input
                  className="w-full rounded-xl border-[#29382f] bg-[#29382f] p-3 text-white placeholder-[#6a7f72] focus:border-[#38e07b] focus:ring-2 focus:ring-[#38e07b]"
                  id="webhook-url"
                  placeholder={t.enterWebhookUrl}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  data-testid="input-webhook"
                />
              </div>

              {webhookUrl && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#9eb7a8]" htmlFor="webhook-message">
                      Webhook Message Template
                    </label>
                    <textarea
                      className="w-full rounded-xl border-[#29382f] bg-[#29382f] p-3 text-white placeholder-[#6a7f72] focus:border-[#38e07b] focus:ring-2 focus:ring-[#38e07b] font-mono text-sm min-h-[120px]"
                      id="webhook-message"
                      placeholder={'Enter webhook JSON template\nExample:\n{"symbol":"{{ticker}}","side":"{{strategy.order.action}}","qty":"{{strategy.order.contracts}}","strategy_id":"{{strategy_id}}"}'}
                      value={webhookMessage}
                      onChange={(e) => setWebhookMessage(e.target.value)}
                      data-testid="input-webhook-message"
                    />
                    <p className="text-xs text-[#6a7f72]">
                      Use placeholders like {`{{ticker}}`}, {`{{strategy.order.action}}`}, {`{{strategy.order.contracts}}`}, {`{{timenow}}`}, {`{{strategy_id}}`}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#9eb7a8]" htmlFor="strategy-id">
                      Strategy ID
                    </label>
                    <input
                      className="w-full rounded-xl border-[#29382f] bg-[#29382f] p-3 text-white placeholder-[#6a7f72] focus:border-[#38e07b] focus:ring-2 focus:ring-[#38e07b]"
                      id="strategy-id"
                      placeholder="Enter broker's strategy ID (from webhook message)"
                      value={strategyId}
                      onChange={(e) => setStrategyId(e.target.value)}
                      data-testid="input-strategy-id"
                    />
                    <p className="text-xs text-[#6a7f72]">
                      This is the encrypted strategy_id provided by your broker when creating the webhook
                    </p>
                  </div>
                </>
              )}
            </div>
          </form>
        </main>
      </div>

      <footer className="border-t border-[#29382f] p-4">
        <button
          onClick={handleSubmit}
          disabled={updateBrokerMutation.isPending}
          className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#38e07b] py-3.5 text-base font-bold text-[#111714] hover:bg-opacity-90 transition-colors disabled:opacity-50"
          data-testid="button-save-broker"
        >
          <span className="truncate">
            {updateBrokerMutation.isPending ? "Updating..." : t.saveBroker}
          </span>
        </button>
      </footer>
    </div>
  );
}
