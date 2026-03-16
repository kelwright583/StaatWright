"use client";

import { useState } from "react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    work: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.work,
          purpose: "general",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message. Please try again.");
      }

      setIsSubmitting(false);
      setSubmitted(true);
      
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: "", email: "", work: "" });
      }, 8000);
    } catch (err) {
      setIsSubmitting(false);
      setError(
        err instanceof Error 
          ? err.message 
          : "An unexpected error occurred. Please try again later."
      );
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (submitted) {
    return (
      <div>
        <p className="font-poppins text-2xl md:text-3xl text-charcoal mb-4">
          Thanks.
        </p>
        <p className="font-montserrat text-lg text-charcoal leading-relaxed">
          We read everything carefully and reply when there&apos;s a clear fit.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="border border-red-300 text-red-800 px-4 py-3 font-montserrat text-base">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="block font-montserrat text-base text-charcoal mb-3 font-medium">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-white border border-charcoal/20 font-montserrat text-base text-charcoal focus:outline-none focus:border-charcoal"
        />
      </div>

      <div>
        <label htmlFor="email" className="block font-montserrat text-base text-charcoal mb-3 font-medium">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-white border border-charcoal/20 font-montserrat text-base text-charcoal focus:outline-none focus:border-charcoal"
        />
      </div>

      <div>
        <label htmlFor="work" className="block font-montserrat text-base text-charcoal mb-3 font-medium">
          What are you working on?
        </label>
        <textarea
          id="work"
          name="work"
          value={formData.work}
          onChange={handleChange}
          required
          rows={6}
          className="w-full px-4 py-3 bg-white border border-charcoal/20 font-montserrat text-base text-charcoal leading-relaxed focus:outline-none focus:border-charcoal resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="font-montserrat text-base text-charcoal border border-charcoal px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Submitting..." : "Start right"}
      </button>
    </form>
  );
}
