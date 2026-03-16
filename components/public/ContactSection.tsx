"use client";

import { useState } from "react";

interface Props { contactEmail: string | null; }

export default function ContactSection({ contactEmail }: Props) {
  const [form, setForm] = useState({ name: "", company: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      setForm({ name: "", company: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  const inputClass =
    "w-full border-b font-montserrat text-sm text-white placeholder:text-white/20 py-3 outline-none transition-colors bg-transparent focus:border-white/40";

  return (
    <section id="contact" className="py-24 md:py-32 px-6 md:px-12" style={{ background: "#0c0c0c" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-6 mb-16">
          <p className="label-caps" style={{ color: "#5C6E81" }}>Get in touch</p>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
          {/* Left */}
          <div>
            <h2 className="font-inter font-bold text-white mb-6" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", lineHeight: 1.1 }}>
              Let&apos;s talk.
            </h2>
            <p className="font-montserrat text-base leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.35)" }}>
              We&apos;re selective about what we take on.<br />
              If you&apos;re building something that matters, so are we.
            </p>
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="font-montserrat text-sm transition-colors"
                style={{ color: "#5C6E81" }}
              >
                {contactEmail}
              </a>
            )}
          </div>

          {/* Right */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <input
              className={inputClass}
              style={{ borderBottomColor: "rgba(255,255,255,0.1)" }}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className={inputClass}
              style={{ borderBottomColor: "rgba(255,255,255,0.1)" }}
              placeholder="Company (optional)"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
            <input
              type="email"
              className={inputClass}
              style={{ borderBottomColor: "rgba(255,255,255,0.1)" }}
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <textarea
              className={`${inputClass} resize-none`}
              style={{ borderBottomColor: "rgba(255,255,255,0.1)" }}
              rows={4}
              placeholder="Message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full font-inter font-semibold text-sm py-4 transition-colors disabled:opacity-50 mt-2"
              style={{ background: "#EAE4DC", color: "#0c0c0c" }}
            >
              {status === "sending" ? "Sending..." : "Send message"}
            </button>
            {status === "sent" && (
              <p className="font-montserrat text-sm" style={{ color: "#5C6E81" }}>
                Message sent — we&apos;ll be in touch.
              </p>
            )}
            {status === "error" && (
              <p className="font-montserrat text-sm text-red-400">
                Something went wrong. Try emailing us directly.
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
