import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import BottomNav from "@/components/BottomNav";

export default function PrivacyPolicy() {
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
        <h1 className="text-white font-semibold text-lg">{t.privacyPolicy || "Privacy Policy"}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="bg-[#1a241f] rounded-xl p-6 border border-[#2a3c33] space-y-4">
          <div>
            <h2 className="text-white font-bold text-xl mb-2">{t.privacyPolicyTitle || "Privacy Policy"}</h2>
            <p className="text-[#9eb7a8] text-sm">{t.lastUpdated || "Last Updated"}: October 27, 2025</p>
          </div>

          <div className="space-y-4 text-[#9eb7a8] text-sm">
            {/* Introduction */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.introduction || "1. Introduction"}</h3>
              <p>
                {t.privacyIntro || "Welcome to Trend Pilot. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect, how we use it, and what rights you have in relation to it."}
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.infoWeCollect || "2. Information We Collect"}</h3>
              <p className="mb-2">{t.weCollectInfo || "We collect the following types of information:"}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.personalInfo || "Personal Information: Phone number, email address (when you register)"}</li>
                <li>{t.profileInfo || "Profile Information: Alias/username, language preference, currency preference"}</li>
                <li>{t.usageData || "Usage Data: Trading analysis history, symbols analyzed, market preferences"}</li>
                <li>{t.paymentInfo || "Payment Information: Processed securely through Razorpay (we do not store credit card details)"}</li>
                <li>{t.deviceInfo || "Device Information: Browser type, device type, IP address"}</li>
              </ul>
            </section>

            {/* How We Use Information */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.howWeUse || "3. How We Use Your Information"}</h3>
              <p className="mb-2">{t.useInfoFor || "We use your information to:"}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.provideService || "Provide and maintain our AI trading advisory service"}</li>
                <li>{t.processPayments || "Process payments and manage your token balance"}</li>
                <li>{t.personalizeExp || "Personalize your experience with language and currency preferences"}</li>
                <li>{t.analyzeMarkets || "Generate market analysis based on your requests"}</li>
                <li>{t.communityFeatures || "Enable community features (publishing analyses, reactions, following traders)"}</li>
                <li>{t.sendNotifications || "Send you important service updates and notifications"}</li>
                <li>{t.improveService || "Improve our service and develop new features"}</li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.dataSharing || "4. Data Sharing and Disclosure"}</h3>
              <p className="mb-2">{t.sharingPolicy || "We do not sell your personal information. We may share your information with:"}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.serviceProviders || "Service Providers: Perplexity AI for analysis, Razorpay for payments, Phone.Email for authentication"}</li>
                <li>{t.legalReq || "Legal Requirements: When required by law or to protect our rights"}</li>
                <li>{t.communityData || "Community: Your alias, published analyses, and reactions are visible to other users (your phone number and real name are NEVER shared)"}</li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.dataSecurity || "5. Data Security"}</h3>
              <p>
                {t.securityMeasures || "We implement industry-standard security measures to protect your data, including HTTPS encryption, secure database storage, and regular security updates. However, no method of transmission over the internet is 100% secure."}
              </p>
            </section>

            {/* Privacy Features */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.privacyFeatures || "6. Privacy Protection Features"}</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.aliasOnly || "Alias Names Only: Your real name and phone number are NEVER displayed in the community"}</li>
                <li>{t.controlPublishing || "Publishing Control: You decide what analyses to publish"}</li>
                <li>{t.blockUsers || "Blocking: You can block users you don't want to interact with"}</li>
                <li>{t.reporting || "Reporting: Report inappropriate content or behavior"}</li>
              </ul>
            </section>

            {/* Your Rights */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.yourRights || "7. Your Rights"}</h3>
              <p className="mb-2">{t.rightsDesc || "You have the right to:"}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.accessData || "Access your personal data"}</li>
                <li>{t.correctData || "Correct inaccurate data"}</li>
                <li>{t.deleteData || "Request deletion of your data"}</li>
                <li>{t.exportData || "Export your data"}</li>
                <li>{t.optOut || "Opt-out of certain data collection"}</li>
                <li>{t.withdrawConsent || "Withdraw consent at any time"}</li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.dataRetention || "8. Data Retention"}</h3>
              <p>
                {t.retentionPolicy || "We retain your data for as long as your account is active or as needed to provide services. You can request deletion of your account and data at any time by contacting us."}
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.cookies || "9. Cookies and Tracking"}</h3>
              <p>
                {t.cookiesPolicy || "We use essential cookies for authentication and session management. We do not use tracking cookies or third-party advertising cookies."}
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.childrenPrivacy || "10. Children's Privacy"}</h3>
              <p>
                {t.childrenPolicy || "Our service is not intended for users under 18 years of age. We do not knowingly collect information from children under 18."}
              </p>
            </section>

            {/* Changes to Policy */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.policyChanges || "11. Changes to This Policy"}</h3>
              <p>
                {t.changesPolicy || "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the 'Last Updated' date."}
              </p>
            </section>

            {/* Contact */}
            <section>
              <h3 className="text-white font-semibold text-base mb-2">{t.contactUs || "12. Contact Us"}</h3>
              <p className="mb-2">
                {t.privacyQuestions || "If you have any questions about this Privacy Policy, please contact us:"}
              </p>
              <div className="bg-[#111714] rounded-lg p-3 border border-[#2a3c33]">
                <p className="text-white font-semibold mb-1">{t.email || "Email"}:</p>
                <a href="mailto:info@trendpilot.in" className="text-[#38e07b] hover:underline">
                  info@trendpilot.in
                </a>
              </div>
            </section>

            {/* Razorpay Compliance */}
            <section className="border-t border-[#2a3c33] pt-4">
              <h3 className="text-white font-semibold text-base mb-2">{t.paymentSecurity || "Payment Security & Razorpay Compliance"}</h3>
              <p>
                {t.razorpayCompliance || "All payments are processed securely through Razorpay, a PCI DSS Level 1 compliant payment gateway. We do not store your credit card, debit card, or banking information. Your payment information is encrypted and transmitted directly to Razorpay's secure servers."}
              </p>
            </section>
          </div>
        </div>

        {/* Contact Us Button */}
        <button
          onClick={() => setLocation("/contact")}
          className="w-full bg-[#38e07b] text-[#111714] py-3 rounded-xl font-semibold hover:bg-[#2fc76a] transition-colors"
          data-testid="button-contact-us"
        >
          {t.contactUs || "Contact Us"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
