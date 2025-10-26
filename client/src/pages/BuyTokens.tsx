import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useVersionGuard } from "@/hooks/useVersionGuard";
import BottomNav from "@/components/BottomNav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BuyTokens() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { guardAction, UpdateModal } = useVersionGuard();
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    { id: "small", tokens: 10, price: 99, popular: false },
    { id: "medium", tokens: 100, price: 899, popular: true },
    { id: "large", tokens: 500, price: 3999, popular: false },
  ];

  const handlePurchase = async (packageId: string, tokens: number, price: number) => {
    // VERSION CHECKPOINT: Check version before allowing purchase
    const versionOk = await guardAction();
    if (!versionOk) {
      // Version mismatch - modal will show, block the action
      return;
    }
    
    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast({
        title: "Error",
        description: "Please login first",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }

    setLoading(packageId);

    try {
      const response = await apiRequest("POST", "/api/payment/create-order", {
        userId,
        tokenPackage: packageId,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      const orderData = await response.json();

      if (orderData.demoMode) {
        // Demo mode - simulate payment
        toast({
          title: "Demo Mode",
          description: "Razorpay not configured. This is a demo payment - tokens will be added for free!",
        });

        // Simulate payment success after a short delay
        setTimeout(async () => {
          const verifyResponse = await apiRequest("POST", "/api/payment/verify", {
            userId,
            tokens,
            demoMode: true,
          });
          const result = await verifyResponse.json();

          if (result.success) {
            toast({
              title: "Success!",
              description: `${tokens} tokens added to your account (Demo mode)`,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/user", userId] });
            setLocation("/dashboard");
          }
        }, 1000);
        return;
      }

      // Real Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "Trend Pilot",
        description: `${tokens} Analysis Tokens`,
        handler: async function (response: any) {
          try {
            const verifyResponse = await apiRequest("POST", "/api/payment/verify", {
              userId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              tokens,
              demoMode: false,
            });
            const result = await verifyResponse.json();

            if (!verifyResponse.ok) {
              // Handle token cap reached case
              if (result.tokenCapReached) {
                toast({
                  title: "Token Limit Reached",
                  description: result.error || "Maximum token limit reached. Payment was successful but tokens cannot be added.",
                  variant: "destructive",
                });
                queryClient.invalidateQueries({ queryKey: ["/api/user", userId] });
                setLocation("/dashboard");
                return;
              }
              
              // Handle other verification errors
              throw new Error(result.error || "Payment verification failed");
            }

            if (result.success) {
              toast({
                title: "Payment Successful!",
                description: `${tokens} tokens added to your account`,
              });
              queryClient.invalidateQueries({ queryKey: ["/api/user", userId] });
              setLocation("/dashboard");
            }
          } catch (error: any) {
            toast({
              title: "Payment Verification Failed",
              description: error.message || "Please contact support",
              variant: "destructive",
            });
          } finally {
            setLoading(null);
          }
        },
        modal: {
          ondismiss: function() {
            setLoading(null);
            toast({
              title: "Payment Cancelled",
              description: "You cancelled the payment",
            });
          }
        },
        theme: {
          color: "#38e07b"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      setLoading(null);
    } catch (error: any) {
      console.error("Payment error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: error.message || error.toString() || "Failed to initiate payment. Please check your connection.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

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
                  onClick={() => handlePurchase(plan.id, plan.tokens, plan.price)}
                  disabled={loading === plan.id}
                  className="flex h-12 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#38e07b] text-base font-bold leading-normal tracking-[0.015em] text-[#111714] hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid={`button-purchase-${plan.tokens}`}
                >
                  <span className="truncate">
                    {loading === plan.id ? "Processing..." : t.purchase}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
      <UpdateModal />
    </div>
  );
}
