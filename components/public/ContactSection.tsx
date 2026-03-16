"use client";

import { useState } from "react";

interface Props {
  contactEmail: string | null;
}

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
    "w-full bg-cream/10 border border-steel/40 text-cream placeholder:text-steel font-montserrat text-sm px-4 py-3 outline-none focus:border-cream transition-colors";

  return (
    <section id="contact" className="bg-navy py-24 md:py-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
        {/* Left */}
        <div>
          <h2 className="font-inter font-bold text-cream text-5xl md:text-6xl mb-6">
            Let&apos;s talk.
          </h2>
          <p className="font-montserrat text-steel text-base leading-relaxed mb-8 max-w-sm">
            We&apos;re selective about what we take on. If you&apos;re building something that matters, so are we.
          </p>
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              className="font-montserrat text-cream text-sm underline underline-offset-4 hover:text-steel transition-colors"
            >
              {contactEmail}
            </a>
          )}
        </div>

        {/* Right */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className={inputClass}
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className={inputClass}
            placeholder="Company (optional)"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
          <input
            type="email"
            className={inputClass}
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <textarea
            className={`${inputClass} resize-none`}
            rows={4}
            placeholder="Message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full bg-cream text-navy font-inter font-semibold text-sm py-4 hover:bg-linen transition-colors disabled:opacity-60"
          >
            {status === "sending" ? "Sending..." : "Send message"}
          </button>
          {status === "sent" && (
            <p className="font-montserrat text-sm text-steel">
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
    </section>
  );
}
