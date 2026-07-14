"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const router = useRouter();
  const { login, pendingVerification } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email."); return; }
    if (!password) { setError("Please enter your password."); return; }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.ok) {
      router.push("/");
    } else {
      setError(result.error || "Login failed.");
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

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-1">Welcome Back</h2>
          <p className="text-xs text-slate-500 mb-6">Sign in to your account.</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
