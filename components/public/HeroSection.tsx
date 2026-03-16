"use client";

import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6"
      style={{ background: "#FFFFFF", paddingTop: 64 }}
    >
      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">

        {/* Kicker */}
        <motion.p
          className="label-caps mb-10"
          style={{ color: "#5C6E81" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          StaatWright Solutions
        </motion.p>

        {/* Main headline — no overflow:hidden so descenders aren't clipped */}
        <motion.h1
          className="font-inter font-bold text-navy mb-3"
          style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)", lineHeight: 1.08, letterSpacing: "-0.02em" }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          Complexity, managed.
        </motion.h1>
        <motion.h1
          className="font-inter font-light mb-10"
          style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)", lineHeight: 1.08, letterSpacing: "-0.02em", color: "#5C6E81" }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          Simplicity, experienced.
        </motion.h1>

        {/* Sequential loading bar animation */}
        <motion.div
          className="flex items-end gap-2 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          {[
            { color: "#1F2A38", delay: 0 },
            { color: "#5C6E81", delay: 0.25 },
            { color: "#EAE4DC", borderColor: "#c8c2b8", delay: 0.5 },
          ].map((bar, i) => (
            <motion.div
              key={i}
              style={{
                width: 20,
                height: 32,
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
        </motion.div>

        {/* Subheading */}
        <motion.p
          className="font-montserrat text-base md:text-lg max-w-md mx-auto mb-12 leading-relaxed"
          style={{ color: "#5C6E81" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          We build digital platforms, products, and systems for businesses that mean it.
        </motion.p>

        {/* CTA */}
        <motion.a
          href="#partners"
          className="font-inter font-semibold text-sm px-8 py-3.5 tracking-wide hover:bg-navy transition-colors inline-block"
          style={{ background: "#1F2A38", color: "#FFFFFF" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.5 }}
        >
          See our work ↓
        </motion.a>
      </div>
    </section>
  );
}
