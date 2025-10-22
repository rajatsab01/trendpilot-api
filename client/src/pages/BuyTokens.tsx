import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import BottomNav from "@/components/BottomNav";

export default function BuyTokens() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const plans = [
    { tokens: 10, price: 500, popular: false },
    { tokens: 100, price: 2500, popular: true },
  ];

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col">
      <div className="flex flex-col gap-6">
        <div className="flex items-center p-4 pb-0">
          <button
            onClick={() => setLocation("/dashboard")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full hover-elevate active-elevate-2"
            data-testid="button-back"
          >
            <span className="material-symbols-outlined text-2xl text-white">
              arrow_back_ios_new
            </span>
          </button>
          <h2 className="flex-1 text-center text-xl font-bold leading-tight tracking-[-0.015em] pr-10 text-white">
            {t.buyTokens}
          </h2>
        </div>

        <div className="flex flex-col gap-8 px-4 pb-32">
          <h2 className="text-2xl font-bold leading-tight tracking-[-0.015em] text-white">
            {t.choosePlan}
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`flex flex-col gap-4 rounded-2xl p-6 relative ${
                  plan.popular
                    ? "border-2 border-[#38e07b] bg-[#1a241f]"
                    : "border border-[#2a3c33] bg-[#1a241f]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 right-6 bg-[#38e07b] text-[#111714] text-xs font-bold px-3 py-1 rounded-full">
                    {t.mostPopular}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold leading-tight text-white">
                    {plan.tokens} {t.tokens}
                  </h3>
                  <p className="flex items-baseline gap-2">
                    <span className="text-5xl font-black leading-tight tracking-[-0.033em] text-white">
                      ₹{plan.price}
                    </span>
                  </p>
                </div>
                <button
                  className="flex h-12 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#38e07b] text-base font-bold leading-normal tracking-[0.015em] text-[#111714] hover:bg-opacity-90 transition-colors"
                  data-testid={`button-purchase-${plan.tokens}`}
                >
                  <span className="truncate">{t.purchase}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
