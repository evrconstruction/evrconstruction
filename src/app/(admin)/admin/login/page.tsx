"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";

export default function AdminLoginPage() {
  const { signIn, user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (user && isAdmin) {
      router.push("/admin");
    }
  }, [user, isAdmin, router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
      router.push("/admin");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1f2521] p-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#252c27] p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="font-heading text-3xl font-bold tracking-tight text-white">
              EVR<span className="text-[#f4b400]">.</span>
            </span>
            <span className="rounded-md bg-[#f4b400]/20 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-[#f4b400]">
              Admin
            </span>
          </div>
          <h1 className="font-heading text-xl font-bold text-white">
            Operations Portal
          </h1>
          <p className="mt-1 text-xs text-white/50">
            Authorized administrator access for EVR Construction LLC.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
            <p className="font-bold mb-0.5">Authentication Restricted</p>
            <p>{error}</p>
          </div>
        )}

        {/* Sign In Button */}
        <div className="space-y-4">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#1f2521] transition hover:bg-slate-100 disabled:opacity-60 cursor-pointer shadow-md"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-[#1f2521]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Authenticating...</span>
              </div>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-white/40">
            Access strictly restricted to <span className="font-mono text-white/60">contact@evrconstructions.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
