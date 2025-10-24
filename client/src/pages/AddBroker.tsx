import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AddBroker() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [brokerName, setBrokerName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookMessage, setWebhookMessage] = useState("");

  const userId = localStorage.getItem("userId");

  const addBrokerMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("POST", "/api/brokers", {
        userId,
        name: brokerName,
        apiKey: apiKey || undefined,
        webhookUrl: webhookUrl || undefined,
        webhookMessage: webhookMessage || undefined,
      });
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/brokers/${userId}`] });
      toast({
        title: "Success",
        description: "Broker added successfully",
      });
      setLocation("/settings");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add broker. Please try again.",
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
    addBrokerMutation.mutate();
  };

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
          <h1 className="text-lg font-bold text-white">{t.addBroker}</h1>
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
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#9eb7a8]" htmlFor="webhook-message">
                    Webhook Message Template
                  </label>
                  <textarea
                    className="w-full rounded-xl border-[#29382f] bg-[#29382f] p-3 text-white placeholder-[#6a7f72] focus:border-[#38e07b] focus:ring-2 focus:ring-[#38e07b] font-mono text-sm min-h-[120px]"
                    id="webhook-message"
                    placeholder={'Enter webhook JSON template\nExample:\n{"symbol":"{{ticker}}","side":"{{strategy.order.action}}","qty":"{{strategy.order.contracts}}"}'}
                    value={webhookMessage}
                    onChange={(e) => setWebhookMessage(e.target.value)}
                    data-testid="input-webhook-message"
                  />
                  <p className="text-xs text-[#6a7f72]">
                    Use placeholders like {`{{ticker}}`}, {`{{strategy.order.action}}`}, {`{{strategy.order.contracts}}`}, {`{{timenow}}`}
                  </p>
                </div>
              )}
            </div>
          </form>
        </main>
      </div>

      <footer className="border-t border-[#29382f] p-4">
        <button
          onClick={handleSubmit}
          disabled={addBrokerMutation.isPending}
          className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#38e07b] py-3.5 text-base font-bold text-[#111714] hover:bg-opacity-90 transition-colors disabled:opacity-50"
          data-testid="button-save-broker"
        >
          <span className="truncate">
            {addBrokerMutation.isPending ? "Saving..." : t.saveBroker}
          </span>
        </button>
      </footer>
    </div>
  );
}
