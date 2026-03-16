"use client";

import { motion } from "framer-motion";

interface LoadingLogoIconProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function LoadingLogoIcon({ size = "lg", className = "" }: LoadingLogoIconProps) {
  const sizeConfig = {
    sm: { container: "w-16 h-6", barWidth: "w-4", barHeight: "h-6" },
    md: { container: "w-20 h-8", barWidth: "w-5", barHeight: "h-8" },
    lg: { container: "w-56 h-16", barWidth: "w-14", barHeight: "h-16" }
  };

  const config = sizeConfig[size];

  const bars = [
    { color: "#1F2A38", delay: 0 }, // Navy
    { color: "#5C6E81", delay: 0.2 }, // Slate Blue  
    { color: "#EAE4DC", delay: 0.4 }, // Warm Cream
  ];

  return (
    <div className={`${config.container} ${className} flex items-center justify-center gap-2`}>
      {bars.map((bar, index) => (
        <motion.div
          key={index}
          className={`${config.barWidth} ${config.barHeight} rounded-sm`}
          style={{ backgroundColor: bar.color }}
          animate={{
            scaleY: [0.3, 1, 0.3],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            delay: bar.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}
