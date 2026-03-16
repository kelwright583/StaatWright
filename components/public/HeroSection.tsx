"use client";

import { motion } from "framer-motion";

const bars = [
  { color: "#1F2A38", delay: 0 },
  { color: "#5C6E81", delay: 0.15 },
  { color: "#EAE4DC", delay: 0.3 },
];

export default function HeroSection() {
  return (
    <section
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "#0c0c0c", paddingTop: 64 }}
    >
      {/* Subtle grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Thin horizontal rule top */}
      <motion.div
        className="absolute top-[64px] left-0 right-0 h-px bg-white/5"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">

        {/* Animated logo bars */}
        <div className="flex items-end gap-3 mb-16">
          {bars.map((bar, i) => (
            <motion.div
              key={i}
              style={{ backgroundColor: bar.color, width: 28 }}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: [0, 72, 56, 72], opacity: 1 }}
              transition={{
                height: {
                  duration: 1.8,
                  delay: bar.delay,
                  ease: "easeOut",
                  times: [0, 0.6, 0.8, 1],
                  repeat: Infinity,
                  repeatType: "reverse",
                  repeatDelay: 2,
                },
                opacity: { duration: 0.4, delay: bar.delay },
              }}
            />
          ))}
        </div>

        {/* Kicker */}
        <motion.p
          className="label-caps mb-8 text-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          StaatWright Solutions
        </motion.p>

        {/* Main headline */}
        <div className="overflow-hidden mb-3">
          <motion.h1
            className="font-inter font-bold text-white leading-[1.05]"
            style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ delay: 0.9, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            Complexity, managed.
          </motion.h1>
        </div>
        <div className="overflow-hidden mb-10">
          <motion.h1
            className="font-inter font-light text-white/50 leading-[1.05]"
            style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ delay: 1.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            Simplicity, experienced.
          </motion.h1>
        </div>

        {/* Subheading */}
        <motion.p
          className="font-montserrat text-white/40 text-base md:text-lg max-w-md mx-auto mb-12 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
        >
          We build digital platforms, products, and systems for businesses that mean it.
        </motion.p>

        {/* CTA */}
        <motion.a
          href="#partners"
          className="font-inter font-semibold text-sm text-[#0c0c0c] bg-[#EAE4DC] px-8 py-3.5 tracking-wide hover:bg-white transition-colors inline-block"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          See our work ↓
        </motion.a>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, #0c0c0c)" }}
      />
    </section>
  );
}
