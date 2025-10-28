import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import BottomNav from "@/components/BottomNav";

export default function ContactUs() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col pb-20">
      {/* Header */}
      <div className="bg-[#1a241f] border-b border-[#2a3c33] p-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => setLocation("/privacy")}
          className="text-white"
          data-testid="button-back"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="text-white font-semibold text-lg">{t.contactUs || "Contact Us"}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-[#1a241f] rounded-xl p-6 border border-[#2a3c33] space-y-6">
          <div className="text-center">
            <span className="material-symbols-outlined text-[#38e07b] text-5xl mb-3 block">support_agent</span>
            <h2 className="text-white font-bold text-xl mb-2">{t.getInTouch || "Get in Touch"}</h2>
            <p className="text-[#9eb7a8] text-sm">
              {t.contactIntro || "We're here to help! Reach out to us for support, questions, or feedback."}
            </p>
          </div>

          {/* Contact Methods */}
          <div className="space-y-4">
            {/* Email Support */}
            <div className="bg-[#111714] rounded-lg p-4 border border-[#2a3c33]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#38e07b]/20 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#38e07b]">mail</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">{t.emailSupport || "Email Support"}</h3>
                  <p className="text-[#9eb7a8] text-sm mb-2">
                    {t.emailDesc || "Send us an email and we'll respond within 24-48 hours"}
                  </p>
                  <a 
                    href="mailto:info@trendpilot.in"
                    className="text-[#38e07b] hover:underline text-sm font-medium"
                    data-testid="link-email-support"
                  >
                    info@trendpilot.in
                  </a>
                </div>
              </div>
            </div>

            {/* Support Categories */}
            <div className="bg-[#111714] rounded-lg p-4 border border-[#2a3c33]">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#38e07b]">help</span>
                {t.supportCategories || "Support Categories"}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-[#38e07b] mt-0.5">•</span>
                  <div>
                    <p className="text-white font-medium">{t.technicalSupport || "Technical Support"}</p>
                    <p className="text-[#9eb7a8] text-xs">{t.techSupportDesc || "App issues, bugs, errors"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#38e07b] mt-0.5">•</span>
                  <div>
                    <p className="text-white font-medium">{t.accountHelp || "Account & Billing"}</p>
                    <p className="text-[#9eb7a8] text-xs">{t.accountHelpDesc || "Token purchases, refunds, account issues"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#38e07b] mt-0.5">•</span>
                  <div>
                    <p className="text-white font-medium">{t.communityIssues || "Community & Content"}</p>
                    <p className="text-[#9eb7a8] text-xs">{t.communityIssuesDesc || "Report abuse, inappropriate content"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#38e07b] mt-0.5">•</span>
                  <div>
                    <p className="text-white font-medium">{t.generalInquiries || "General Inquiries"}</p>
                    <p className="text-[#9eb7a8] text-xs">{t.generalInquiriesDesc || "Questions, feedback, suggestions"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-[#111714] rounded-lg p-4 border border-[#2a3c33]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#38e07b]/20 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#38e07b]">schedule</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{t.responseTime || "Response Time"}</h3>
                  <p className="text-[#9eb7a8] text-sm">
                    {t.responseTimeDesc || "We typically respond within 24-48 hours during business days. For urgent issues, please mark your email as 'Urgent' in the subject line."}
                  </p>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="bg-[#111714] rounded-lg p-4 border border-[#2a3c33]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#38e07b]/20 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#38e07b]">business</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{t.businessHours || "Business Hours"}</h3>
                  <p className="text-[#9eb7a8] text-sm">
                    {t.businessHoursDesc || "Monday - Friday: 9:00 AM - 6:00 PM (IST)"}
                  </p>
                  <p className="text-[#9eb7a8] text-sm">
                    {t.weekendSupport || "Weekend: Limited support"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-[#111714] rounded-lg p-4 border border-[#38e07b]/30">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#38e07b] text-2xl">info</span>
              <div>
                <h3 className="text-white font-semibold mb-1">{t.importantNotice || "Important Notice"}</h3>
                <p className="text-[#9eb7a8] text-sm">
                  {t.noticeDesc || "Trend Pilot is an advisory-only service. We do not execute trades or manage funds. All trading decisions and actions are your sole responsibility. Please include your user ID or registered phone number when contacting us for faster assistance."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLocation("/privacy")}
            className="bg-[#1a241f] text-white py-3 rounded-xl font-semibold border border-[#2a3c33] hover-elevate active-elevate-2"
            data-testid="button-privacy-policy"
          >
            <span className="material-symbols-outlined text-xl block mb-1">policy</span>
            <span className="text-xs">{t.privacyPolicy || "Privacy Policy"}</span>
          </button>
          <a
            href="mailto:support@trendpilot.com"
            className="bg-[#38e07b] text-[#111714] py-3 rounded-xl font-semibold hover:bg-[#2fc76a] transition-colors flex flex-col items-center justify-center"
            data-testid="button-email-now"
          >
            <span className="material-symbols-outlined text-xl block mb-1">send</span>
            <span className="text-xs">{t.emailNow || "Email Now"}</span>
          </a>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
