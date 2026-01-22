import { useEffect, useState } from "react";

declare global {
  interface Window {
    PhoneEmail: any;
  }
}

export default function Login() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://www.phone.email/sign_in_button_v1.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handlePhoneLogin = () => {
    setError("");
    setLoading(true);

    if (!window.PhoneEmail) {
      setError("PhoneEmail SDK not loaded");
      setLoading(false);
      return;
    }

    window.PhoneEmail.open({
      client_id: "166143163031613842048",
      app_name: "TrendPilot",
      redirect_url: "https://trendpilot.in/login",

      callback: async (userObj: any) => {
        console.log("📞 RAW Phone.Email callback object:", userObj);

        try {
          const payload = {
            user_phone_number: userObj.user_phone_number,
            user_country_code: userObj.user_country_code,
            user_json_url: userObj.user_json_url,
          };

          console.log("➡️ Sending payload to backend:", payload);

          const res = await fetch("/api/auth/verify-phone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          console.log("⬅️ Backend response:", data);

          if (!res.ok) throw new Error(data.message || "Verification failed");

          localStorage.setItem("user", JSON.stringify(data));
          window.location.href = "/";
        } catch (err: any) {
          console.error("❌ Verification error:", err);
          setError(err.message || "Verification failed");
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

        {error && (
          <div className="p-3 bg-red-600 text-white rounded text-center">
            {error}
          </div>
        )}

        <button
          onClick={handlePhoneLogin}
          disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 rounded text-white font-semibold"
        >
          {loading ? "Verifying..." : "Sign in with Phone"}
        </button>
      </div>
    </div>
  );
}
