import { useEffect, useState } from "react";

declare global {
  interface Window {
    PhoneEmail?: any;
  }
}

const PHONEEMAIL_SCRIPT_ID = "phoneemail-sdk";

export default function Login() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    // If already loaded
    if (window.PhoneEmail) {
      setSdkReady(true);
      return;
    }

    // If script already exists, just wait a bit for it to attach
    const existing = document.getElementById(PHONEEMAIL_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      const t = setInterval(() => {
        if (window.PhoneEmail) {
          setSdkReady(true);
          clearInterval(t);
        }
      }, 200);
      setTimeout(() => clearInterval(t), 8000);
      return;
    }

    const script = document.createElement("script");
    script.id = PHONEEMAIL_SCRIPT_ID;
    script.src = "https://www.phone.email/sign_in_button_v1.js";
    script.async = true;

    script.onload = () => {
      if (window.PhoneEmail) setSdkReady(true);
    };

    script.onerror = () => {
      setError("PhoneEmail SDK failed to load. Please refresh and try again.");
      setSdkReady(false);
    };

    document.head.appendChild(script);
  }, []);

  const handlePhoneLogin = () => {
    setError("");

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Please enter your name first.");
      return;
    }

    if (!window.PhoneEmail || typeof window.PhoneEmail.open !== "function") {
      setError("PhoneEmail SDK not loaded. Please refresh the page.");
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/login`;

    window.PhoneEmail.open({
      client_id: "166143163031613842048",
      app_name: "TrendPilot",
      redirect_url: redirectUrl,

      callback: async (userObj: any) => {
        try {
          console.log("📞 RAW Phone.Email callback object:", userObj);

          // Phone.Email typically returns user_json_url
          const userJsonUrl = userObj?.user_json_url || userObj?.userJsonUrl;
          if (!userJsonUrl) {
            throw new Error("Phone verification failed: missing user_json_url.");
          }

          // 1) Verify phone via backend (your backend expects userJsonUrl)
          const verifyRes = await fetch("/api/auth/verify-phone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userJsonUrl }),
          });

          const verifyData = await verifyRes.json();
          console.log("⬅️ /api/auth/verify-phone:", verifyData);

          if (!verifyRes.ok) {
            throw new Error(verifyData?.error || "Failed to verify phone number.");
          }

          const phoneNumber = verifyData?.phoneNumber;
          if (!phoneNumber) {
            throw new Error("Verification did not return a phone number.");
          }

          // 2) Create/Get user (this gives you userId + tokens)
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: cleanName,
              mobile: phoneNumber,
              language: "en",
            }),
          });

          const loginData = await loginRes.json();
          console.log("⬅️ /api/auth/login:", loginData);

          if (!loginRes.ok) {
            throw new Error(loginData?.error || "Login failed.");
          }

          // Store a single user object your app can use
          const userToStore = {
            name: cleanName,
            mobile: phoneNumber,
            userId: loginData.userId,
            tokens: loginData.tokens,
          };

          localStorage.setItem("user", JSON.stringify(userToStore));
          window.location.href = "/";
        } catch (err: any) {
          console.error("❌ Login/Verification error:", err);
          setError(err?.message || "Login failed");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-6 space-y-4 bg-zinc-900 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center">Login</h1>

        <input
          type="text"
          placeholder="Your name"
          className="w-full p-3 rounded bg-zinc-800 text-white outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {!sdkReady && (
          <div className="p-3 bg-zinc-800 text-white rounded text-center">
            Loading Phone login...
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-600 text-white rounded text-center">
            {error}
          </div>
        )}

        <button
          onClick={handlePhoneLogin}
          disabled={loading || !sdkReady}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 rounded text-white font-semibold"
        >
          {loading ? "Verifying..." : "Sign in with Phone"}
        </button>
      </div>
    </div>
  );
}
