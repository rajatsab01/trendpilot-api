import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Charity() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const userId = localStorage.getItem("userId");

  const handleDonate = async () => {
    const donationAmount = parseInt(amount);
    
    if (!donationAmount || donationAmount < 10) {
      toast({
        title: t.invalidAmount,
        description: t.minimumDonation,
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: t.error,
        description: t.pleaseLoginFirst,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create Razorpay order for charity
      const orderResponse = await apiRequest("POST", "/api/charity/create-order", {
        userId,
        amount: donationAmount,
      });

      const orderData = await orderResponse.json();

      if (!orderData.orderId) {
        throw new Error(t.failedToCreateDonationOrder);
      }

      // Initialize Razorpay payment
      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.amount,
        currency: "INR",
        name: t.trendPilotCharity,
        description: t.thankYouForDonation,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await apiRequest("POST", "/api/charity/verify", {
              userId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              amount: donationAmount,
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              toast({
                title: t.thankYou,
                description: t.donationReceived,
              });
              setAmount("");
              setTimeout(() => setLocation("/dashboard"), 2000);
            } else {
              throw new Error(t.paymentVerificationFailed);
            }
          } catch (error: any) {
            toast({
              title: t.verificationError,
              description: error.message || t.failedToVerifyDonation,
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            toast({
              title: t.donationCancelled,
              description: t.youCanDonateAnytime,
            });
          },
        },
        theme: {
          color: "#38e07b",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Donation error:", error);
      toast({
        title: t.error,
        description: error.message || t.failedToProcessDonation,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

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
            {t.charityBringsLuck}
          </h1>
        </header>

        <main className="p-6 space-y-6 pb-24">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-[#38e07b] to-[#2ac96c] p-6 rounded-2xl text-center">
            <span className="material-symbols-outlined text-[#111714] text-6xl mb-4 block">
              favorite
            </span>
            <h2 className="text-2xl font-bold text-[#111714] mb-2">
              {t.charityBringsLuck}
            </h2>
            <p className="text-[#111714] text-sm opacity-80">
              {t.charitySubtitle}
            </p>
          </div>

          {/* Donation Amount Input */}
          <div className="bg-[#1c2620] p-6 rounded-2xl">
            <h3 className="text-white text-lg font-bold mb-4">
              {t.enterDonationAmount}
            </h3>
            
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9eb7a8] text-xl font-bold">
                ₹
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                min="10"
                className="w-full h-16 bg-[#29382f] text-white rounded-xl border-2 border-[#38e07b] placeholder:text-[#6a7f72] pl-12 pr-4 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#38e07b]"
                data-testid="input-donation-amount"
              />
            </div>

            <p className="text-[#9eb7a8] text-sm mb-4">
              {t.minimumDonation}
            </p>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[50, 100, 500].map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  className="bg-[#29382f] text-white py-3 rounded-xl font-bold hover:bg-[#38e07b] hover:text-[#111714] transition-colors"
                  data-testid={`button-quick-${quickAmount}`}
                >
                  ₹{quickAmount}
                </button>
              ))}
            </div>

            <button
              onClick={handleDonate}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-[#38e07b] to-[#2ac96c] text-[#111714] font-bold py-4 rounded-full text-center text-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
              data-testid="button-donate"
            >
              {isProcessing ? t.processing : t.donateNow}
            </button>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-[#1c2620] p-4 rounded-2xl flex items-start gap-3">
              <span className="material-symbols-outlined text-[#38e07b] text-2xl">
                verified
              </span>
              <div>
                <h4 className="text-white font-bold mb-1">{t.securePayment}</h4>
                <p className="text-[#9eb7a8] text-sm">
                  {t.securePaymentDescription}
                </p>
              </div>
            </div>

            <div className="bg-[#1c2620] p-6 rounded-2xl">
              <div className="flex items-start gap-3 mb-4">
                <span className="material-symbols-outlined text-[#38e07b] text-2xl">
                  auto_awesome
                </span>
                <h4 className="text-white font-bold text-lg">{t.goodKarma}</h4>
              </div>
              <div className="space-y-3 text-[#9eb7a8] text-sm leading-relaxed">
                <p>{t.goodKarmaDescription}</p>
                
                <p className="pt-2">
                  <span className="font-semibold text-white">{t.moneyHasEnergy}</span><br />
                  {t.moneyEnergyDescription}
                </p>
                
                <p>{t.everyTimeYouShare}</p>
                
                <p>{t.tradingFlowParagraph}</p>
                
                <p className="italic">{t.donationIsMore}</p>
                
                <p className="font-medium text-[#38e07b]">{t.letYourProfits}</p>
                
                <p className="text-center font-semibold text-white pt-2">{t.realWealthQuote}</p>
              </div>
            </div>
          </div>

          {/* Stories Section */}
          <div className="bg-[#1c2620] p-6 rounded-2xl">
            <h3 className="text-white text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#38e07b]">
                auto_stories
              </span>
              {t.storiesHeading}
            </h3>
            
            <div className="space-y-6">
              {/* Story 1 */}
              <div className="border-l-4 border-[#38e07b] pl-4">
                <h4 className="text-white font-bold mb-2">{t.story1Title}</h4>
                <p className="text-[#9eb7a8] text-sm leading-relaxed">
                  {t.story1Content}
                </p>
              </div>

              {/* Story 2 */}
              <div className="border-l-4 border-[#38e07b] pl-4">
                <h4 className="text-white font-bold mb-2">{t.story2Title}</h4>
                <p className="text-[#9eb7a8] text-sm leading-relaxed">
                  {t.story2Content}
                </p>
              </div>

              {/* Story 3 */}
              <div className="border-l-4 border-[#38e07b] pl-4">
                <h4 className="text-white font-bold mb-2">{t.story3Title}</h4>
                <p className="text-[#9eb7a8] text-sm leading-relaxed">
                  {t.story3Content}
                </p>
              </div>

              {/* Story 4 */}
              <div className="border-l-4 border-[#38e07b] pl-4">
                <h4 className="text-white font-bold mb-2">{t.story4Title}</h4>
                <p className="text-[#9eb7a8] text-sm leading-relaxed">
                  {t.story4Content}
                </p>
              </div>

              {/* Story 5 */}
              <div className="border-l-4 border-[#38e07b] pl-4">
                <h4 className="text-white font-bold mb-2">{t.story5Title}</h4>
                <p className="text-[#9eb7a8] text-sm leading-relaxed">
                  {t.story5Content}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
