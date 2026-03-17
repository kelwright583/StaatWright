"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

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

    window.location.href = "/admin/dashboard";
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#FAFAF9" }}>
      <div className="w-full max-w-[400px]">

        {/* Animated icon */}
        <div className="flex flex-col items-center mb-8">
          {/* Animated bars — same as hero */}
          <div className="flex items-end gap-2 mb-6">
            {[
              { color: "#1F2A38", delay: 0 },
              { color: "#5C6E81", delay: 0.25 },
              { color: "#EAE4DC", borderColor: "#c8c2b8", delay: 0.5 },
            ].map((bar, i) => (
              <motion.div
                key={i}
                style={{
                  width: 16,
                  height: 26,
                  backgroundColor: bar.color,
                  border: bar.borderColor ? `1px solid ${bar.borderColor}` : undefined,
                }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 1.2,
                  delay: bar.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 0.3,
                }}
              />
            ))}
          </div>

          <p
            className="text-xs uppercase tracking-widest text-steel"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Admin Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-linen p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-xs uppercase tracking-widest text-steel"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm text-ink bg-linen/30 border border-linen focus:border-navy focus:bg-white outline-none transition-colors"
                style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-xs uppercase tracking-widest text-steel"
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
                className="w-full px-3 py-2.5 text-sm text-ink bg-linen/30 border border-linen focus:border-navy focus:bg-white outline-none transition-colors"
                style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-600 text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-white text-sm font-medium py-3 px-4 hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
              style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
