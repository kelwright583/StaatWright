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
    "w-full border-b border-steel/20 font-montserrat text-sm text-navy placeholder:text-steel/40 py-3 outline-none bg-transparent focus:border-navy transition-colors";

  return (
    <section id="contact" className="py-24 md:py-32 px-6 md:px-12 bg-navy">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-6 mb-16">
          <p className="label-caps" style={{ color: "#5C6E81" }}>Get in touch</p>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
          <div>
            <h2
              className="font-inter font-bold text-cream mb-6"
              style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", lineHeight: 1.1 }}
            >
              Let&apos;s talk.
            </h2>
            <p className="font-montserrat text-base leading-relaxed mb-8 text-steel">
              We&apos;re selective about what we take on.<br />
              If you&apos;re building something that matters, so are we.
            </p>
            {contactEmail && (
              <a href={`mailto:${contactEmail}`} className="font-montserrat text-sm text-cream/60 hover:text-cream transition-colors">
                {contactEmail}
              </a>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {[
              { placeholder: "Name", key: "name", type: "text", required: true },
              { placeholder: "Company (optional)", key: "company", type: "text", required: false },
              { placeholder: "Email", key: "email", type: "email", required: true },
            ].map((field) => (
              <input
                key={field.key}
                type={field.type}
                className="w-full border-b font-montserrat text-sm text-cream placeholder:text-cream/20 py-3 outline-none bg-transparent focus:border-cream/60 transition-colors"
                style={{ borderBottomColor: "rgba(255,255,255,0.12)" }}
                placeholder={field.placeholder}
                value={form[field.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                required={field.required}
              />
            ))}
            <textarea
              className="w-full border-b font-montserrat text-sm text-cream placeholder:text-cream/20 py-3 outline-none bg-transparent resize-none focus:border-cream/60 transition-colors"
              style={{ borderBottomColor: "rgba(255,255,255,0.12)" }}
              rows={4}
              placeholder="Message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full font-inter font-semibold text-sm py-4 bg-cream text-navy hover:bg-linen transition-colors disabled:opacity-50 mt-2"
            >
              {status === "sending" ? "Sending..." : "Send message"}
            </button>
            {status === "sent" && <p className="font-montserrat text-sm text-steel">Message sent — we&apos;ll be in touch.</p>}
            {status === "error" && <p className="font-montserrat text-sm text-red-400">Something went wrong. Try emailing us directly.</p>}
          </form>
        </div>
      </div>
    </section>
  );
}
