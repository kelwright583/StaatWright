"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Wordmark */}
        <h1
          className="text-navy font-inter font-bold text-2xl tracking-tight mb-10 text-center"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          StaatWright
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="text-xs font-montserrat text-steel uppercase tracking-widest"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent border-0 border-b border-ink/30 focus:border-navy outline-none py-2 text-ink font-montserrat text-sm transition-colors"
              style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="text-xs font-montserrat text-steel uppercase tracking-widest"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-transparent border-0 border-b border-ink/30 focus:border-navy outline-none py-2 text-ink font-montserrat text-sm transition-colors"
              style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-600 text-xs font-montserrat" style={{ fontFamily: "var(--font-montserrat)" }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-white font-montserrat text-sm font-medium py-3 px-4 hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
