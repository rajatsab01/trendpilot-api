import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("POST", "/api/auth/login", {
        name,
        mobile,
        language,
      });
      return result;
    },
    onSuccess: (data) => {
      localStorage.setItem("userId", data.userId);
      setLocation("/welcome");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to login. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && mobile.trim()) {
      loginMutation.mutate();
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#111714]">
      <header className="flex items-center justify-between p-4">
        <button
          onClick={() => setLocation("/")}
          className="text-white"
          data-testid="button-back"
        >
          <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-8">
          {t.login}
        </h2>
      </header>

      <main className="flex-grow flex flex-col justify-center px-6">
        <div className="w-full max-w-md mx-auto">
          <h1 className="text-white text-3xl font-bold tracking-tight text-left mb-8">
            {t.welcomeBack}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className="sr-only" htmlFor="name">
                {t.name}
              </label>
              <input
                className="w-full h-14 bg-[#29382f] text-white rounded-xl border border-transparent placeholder:text-[#6a7f72] px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#38e07b] transition-shadow duration-200"
                id="name"
                placeholder={t.name}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-name"
              />
            </div>

            <div className="relative">
              <label className="sr-only" htmlFor="mobile">
                {t.mobileNumber}
              </label>
              <input
                className="w-full h-14 bg-[#29382f] text-white rounded-xl border border-transparent placeholder:text-[#6a7f72] px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#38e07b] transition-shadow duration-200"
                id="mobile"
                placeholder={t.mobileNumber}
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                data-testid="input-mobile"
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-8 flex w-full items-center justify-center rounded-full h-12 px-5 bg-[#38e07b] text-[#111714] text-base font-bold leading-normal tracking-[0.015em] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111714] focus:ring-[#38e07b] transition-all duration-300 disabled:opacity-50"
              data-testid="button-send-otp"
            >
              <span className="truncate">
                {loginMutation.isPending ? "Loading..." : t.sendOTP}
              </span>
            </button>
          </form>
        </div>
      </main>

      <footer className="flex-shrink-0 py-16"></footer>
    </div>
  );
}
