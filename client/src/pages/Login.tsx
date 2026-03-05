import { useEffect, useMemo, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../lib/firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: any;
  }
}

export default function Login() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(""); // +9199xxxxxxxx
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  const canSendOtp = useMemo(() => {
    return phone.trim().startsWith("+") && phone.trim().length >= 10;
  }, [phone]);

  useEffect(() => {
    // Create reCAPTCHA only once (AFTER DOM has the container)
    const initRecaptcha = async () => {
      try {
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new RecaptchaVerifier(
            "recaptcha-container",
            { size: "invisible" },
            auth
          );

          // IMPORTANT: render it once
          await window.recaptchaVerifier.render();
        }
        setRecaptchaReady(true);
      } catch (e) {
        console.error("reCAPTCHA init failed:", e);
        setError("reCAPTCHA failed to load. Please refresh and try again.");
      }
    };

    initRecaptcha();
  }, []);

  const sendOtp = async () => {
    setError("");

    if (!recaptchaReady) {
      setError("Please wait… reCAPTCHA is loading.");
      return;
    }

    if (!canSendOtp) {
      setError("Enter phone in international format, like +9198XXXXXXXX");
      return;
    }

    setLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier!;
      const confirmation = await signInWithPhoneNumber(
        auth,
        phone.trim(),
        appVerifier
      );

      window.confirmationResult = confirmation;

      localStorage.setItem("tp_name", name.trim());
      localStorage.setItem("tp_phone", phone.trim());

      setStep("otp");
    } catch (err: any) {
      console.error("sendOtp error:", err);

      // If reCAPTCHA gets into a bad state, reset it
      try {
        window.recaptchaVerifier?.clear();
        window.recaptchaVerifier = undefined;
        setRecaptchaReady(false);
      } catch {}

      setError(err?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");

    if (!otp.trim() || otp.trim().length < 4) {
      setError("Enter the OTP you received");
      return;
    }

    setLoading(true);
    try {
      const confirmation = window.confirmationResult;
      if (!confirmation) {
        setError("OTP session missing. Please go back and request OTP again.");
        setStep("phone");
        return;
      }

      const result = await confirmation.confirm(otp.trim());
      const user = result.user;

      localStorage.setItem(
        "user",
        JSON.stringify({
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          name: localStorage.getItem("tp_name") || "",
        })
      );

      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("verifyOtp error:", err);
      setError(err?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError("");
    setOtp("");
    setStep("phone");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-6 space-y-4 bg-zinc-900 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center">Login</h1>

        {/* MUST exist in DOM before RecaptchaVerifier */}
        <div id="recaptcha-container" />

        <input
          type="text"
          placeholder="Your name"
          className="w-full p-3 rounded bg-zinc-800 text-white outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {step === "phone" && (
          <>
            <input
              type="tel"
              placeholder="Phone (e.g. +9198XXXXXXXX)"
              className="w-full p-3 rounded bg-zinc-800 text-white outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {error && (
              <div className="p-3 bg-red-600 rounded text-center">{error}</div>
            )}

            <button
              onClick={sendOtp}
              disabled={loading || !recaptchaReady}
              className="w-full py-3 bg-green-600 hover:bg-green-700 rounded text-white font-semibold disabled:opacity-60"
            >
              {loading
                ? "Sending OTP..."
                : recaptchaReady
                ? "Send OTP"
                : "Loading Phone login..."}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="text-sm text-zinc-300">
              OTP sent to <b>{phone}</b>
            </div>

            <input
              type="text"
              placeholder="Enter OTP"
              className="w-full p-3 rounded bg-zinc-800 text-white outline-none"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />

            {error && (
              <div className="p-3 bg-red-600 rounded text-center">{error}</div>
            )}

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-700 rounded text-white font-semibold"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              onClick={goBack}
              disabled={loading}
              className="w-full py-3 bg-zinc-700 hover:bg-zinc-600 rounded text-white font-semibold"
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
