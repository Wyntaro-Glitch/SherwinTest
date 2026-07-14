"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";

export default function RegisterPage() {
  const router = useRouter();
  const { register, verify, pendingVerification } = useAuthStore();

  const [step, setStep] = useState<"register" | "verify">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);

    if (result.ok) {
      setShowCode(result.code || "");
      setStep("verify");
    } else {
      setError(result.error || "Registration failed.");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) { setError("Please enter the verification code."); return; }

    setLoading(true);
    const result = verify(email, code);
    setLoading(false);

    if (result.ok) {
      router.push("/");
    } else {
      setError(result.error || "Verification failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">SherwinMail</h1>
          </div>
          <p className="text-sm text-slate-500">Privacy-centric AI email assistant</p>
        </div>

        {step === "register" ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1">Create Account</h2>
            <p className="text-xs text-slate-500 mb-6">Set up your account to get started.</p>

            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              {error && (
                <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl px-4 py-2.5 text-xs text-rose-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-tr from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="text-xs text-slate-500 text-center mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1">Verify Your Email</h2>
            <p className="text-xs text-slate-500 mb-2">
              We sent a verification code to <span className="text-slate-300 font-semibold">{email}</span>
            </p>

            {showCode && (
              <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl px-4 py-3 mb-4">
                <p className="text-[10px] text-indigo-400 uppercase font-mono font-semibold mb-1">Your verification code</p>
                <p className="text-2xl font-mono font-bold text-indigo-300 tracking-[0.3em]">{showCode}</p>
                <p className="text-[9px] text-slate-500 mt-1">Enter this code below to verify your account.</p>
              </div>
            )}

            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Verification Code</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors text-center font-mono text-lg tracking-[0.2em]"
                />
              </div>

              {error && (
                <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl px-4 py-2.5 text-xs text-rose-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-tr from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>
            </form>

            <p className="text-xs text-slate-500 text-center mt-6">
              Wrong email?{" "}
              <button
                onClick={() => { setStep("register"); setError(""); setCode(""); setShowCode(""); }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
              >
                Go back
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
