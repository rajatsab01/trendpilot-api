import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import BottomNav from "@/components/BottomNav";

export default function TermsOfService() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col pb-20">
      {/* Header */}
      <div className="bg-[#1a241f] border-b border-[#2a3c33] p-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => setLocation("/")}
          className="text-white"
          data-testid="button-back"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="text-white font-semibold text-lg">{t.termsOfService || "Terms of Service"}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="bg-[#1a241f] rounded-xl p-6 border border-[#2a3c33] space-y-4">
          <div>
            <h2 className="text-white font-bold text-xl mb-2">{t.termsOfServiceTitle || "Terms of Service"}</h2>
            <p className="text-[#9eb7a8] text-sm">{t.lastUpdated || "Last Updated"}: October 28, 2025</p>
          </div>

          <div className="space-y-4 text-[#9eb7a8] text-sm">
            {/* Agreement to Terms */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.agreementToTerms || "1. Agreement to Terms"}</h3>
              <p>
                {t.termsIntro || "By accessing or using Trend Pilot (\"Service\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service."}
              </p>
            </section>

            {/* Service Description */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.serviceDescription || "2. Service Description"}</h3>
              <p className="mb-2">
                {t.serviceDesc || "Trend Pilot is an AI-powered financial market analysis tool that provides:"}
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.aiAnalysis || "AI-generated market analysis for stocks, commodities, forex, and cryptocurrencies"}</li>
                <li>{t.tradingRecommendations || "Buy/sell recommendations with technical indicators and bracket orders"}</li>
                <li>{t.multiLanguage || "Multi-language support (12 languages)"}</li>
                <li>{t.multiCurrency || "Multi-currency analysis (20+ currencies)"}</li>
                <li>{t.communityFeatures || "Community features for sharing and discussing analyses"}</li>
              </ul>
            </section>

            {/* IMPORTANT: Analysis Only - Not Advice */}
            <section className="bg-[#29382f] rounded-lg p-4 border-2 border-[#38e07b]/30">
              <h3 className="text-[#38e07b] font-bold text-base mb-2">{t.importantDisclaimer || "⚠️ IMPORTANT DISCLAIMER"}</h3>
              <div className="space-y-2">
                <p className="font-semibold text-white">
                  {t.analysisNotAdvice || "This Service Provides ANALYSIS Only - NOT Financial Advice"}
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t.notFinancialAdvisor || "Trend Pilot is an analysis tool, NOT a financial advisor or investment service"}</li>
                  <li>{t.noLicensedAdvisor || "We do NOT provide financial advice, investment advice, or trading advice"}</li>
                  <li>{t.aiGenerated || "All analyses are AI-generated and for informational purposes only"}</li>
                  <li>{t.yourResponsibility || "You are solely responsible for your trading and investment decisions"}</li>
                  <li>{t.tradingRisks || "Trading involves substantial risk of loss - never invest more than you can afford to lose"}</li>
                  <li>{t.noGuarantees || "Past performance does not guarantee future results"}</li>
                </ul>
              </div>
            </section>

            {/* Token System */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.tokenSystem || "3. Token System & Payments"}</h3>
              <p className="mb-2">{t.tokenSystemDesc || "Our Service operates on a token-based system:"}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.tokenPurchase || "You purchase tokens to access AI analysis features"}</li>
                <li>{t.tokenConsumption || "Each analysis consumes tokens based on complexity"}</li>
                <li>{t.noRefunds || "Tokens are non-refundable once purchased"}</li>
                <li>{t.noExpiry || "Tokens do not expire as long as your account is active"}</li>
                <li>{t.paymentProcessor || "Payments are processed securely through Razorpay"}</li>
                <li>{t.pricingChanges || "We reserve the right to change pricing with 30 days notice"}</li>
              </ul>
            </section>

            {/* User Responsibilities */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.userResponsibilities || "4. User Responsibilities"}</h3>
              <p className="mb-2">{t.youAgree || "You agree to:"}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.accurateInfo || "Provide accurate registration information"}</li>
                <li>{t.accountSecurity || "Maintain the security of your account credentials"}</li>
                <li>{t.lawfulUse || "Use the Service only for lawful purposes"}</li>
                <li>{t.noMisuse || "Not misuse, abuse, or attempt to manipulate the Service"}</li>
                <li>{t.respectCommunity || "Respect other users in community features"}</li>
                <li>{t.ownDecisions || "Make your own independent trading decisions"}</li>
              </ul>
            </section>

            {/* Prohibited Activities */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.prohibitedActivities || "5. Prohibited Activities"}</h3>
              <p className="mb-2">{t.youMayNot || "You may NOT:"}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.shareAccount || "Share your account with others"}</li>
                <li>{t.reverseEngineer || "Reverse engineer or attempt to extract the Service's code"}</li>
                <li>{t.automatedAccess || "Use automated systems or bots to access the Service"}</li>
                <li>{t.republish || "Republish our analyses as your own without attribution"}</li>
                <li>{t.harassment || "Harass, abuse, or harm other users"}</li>
                <li>{t.spamming || "Spam or post misleading content"}</li>
              </ul>
            </section>

            {/* Intellectual Property */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.intellectualProperty || "6. Intellectual Property"}</h3>
              <p>
                {t.ipRights || "All content, features, and functionality of Trend Pilot are owned by us and protected by international copyright, trademark, and other intellectual property laws. You may use the Service for personal use only."}
              </p>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.limitationOfLiability || "7. Limitation of Liability"}</h3>
              <div className="space-y-2">
                <p className="font-semibold text-white">
                  {t.noLiability || "TO THE MAXIMUM EXTENT PERMITTED BY LAW:"}
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t.asIsService || "The Service is provided \"AS IS\" without warranties of any kind"}</li>
                  <li>{t.noAccuracyGuarantee || "We do NOT guarantee the accuracy of AI-generated analyses"}</li>
                  <li>{t.noTradingLiability || "We are NOT liable for any trading losses or financial damages"}</li>
                  <li>{t.noIndirectDamages || "We are NOT liable for indirect, incidental, or consequential damages"}</li>
                  <li>{t.maxLiability || "Our maximum liability is limited to the amount you paid for tokens in the last 30 days"}</li>
                </ul>
              </div>
            </section>

            {/* Account Termination */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.accountTermination || "8. Account Termination"}</h3>
              <p>
                {t.terminationPolicy || "We reserve the right to suspend or terminate your account if you violate these Terms. You may also delete your account at any time. Unused tokens are non-refundable upon termination."}
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.changesToTerms || "9. Changes to Terms"}</h3>
              <p>
                {t.termsChanges || "We may update these Terms from time to time. We will notify you of material changes via email or in-app notification. Continued use after changes constitutes acceptance of new Terms."}
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.governingLaw || "10. Governing Law"}</h3>
              <p>
                {t.lawJurisdiction || "These Terms are governed by and construed in accordance with applicable laws. Any disputes shall be resolved through binding arbitration."}
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.contactUs || "11. Contact Us"}</h3>
              <p>
                {t.questionsContact || "If you have questions about these Terms, please contact us through the Contact Us page in the app."}
              </p>
            </section>

            {/* Final Acknowledgment */}
            <section className="bg-[#1a1f1c] rounded-lg p-4 border border-[#38e07b]/20">
              <p className="text-white font-semibold mb-2">
                {t.acknowledgment || "By using Trend Pilot, you acknowledge that:"}
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.readTerms || "You have read and understood these Terms of Service"}</li>
                <li>{t.analysisToolOnly || "This is an analysis tool, NOT financial advice"}</li>
                <li>{t.tradingAtOwnRisk || "You trade at your own risk and accept full responsibility for your decisions"}</li>
                <li>{t.noLiabilityAccepted || "We are NOT liable for any trading losses or financial outcomes"}</li>
              </ul>
            </section>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
