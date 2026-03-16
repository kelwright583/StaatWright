"use client";

import { motion } from "framer-motion";

interface LogoIconProps {
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
}

export default function LogoIcon({ size = "md", animated = false, className = "" }: LogoIconProps) {
  const sizeConfig = {
    sm: { container: "w-16 h-6", barWidth: "w-4", barHeight: "h-6" },
    md: { container: "w-20 h-8", barWidth: "w-5", barHeight: "h-8" },
    lg: { container: "w-40 h-12", barWidth: "w-10", barHeight: "h-12" }
  };

  const config = sizeConfig[size];

  const bars = [
    { color: "#1F2A38", delay: 0 }, // Navy
    { color: "#5C6E81", delay: 0.2 }, // Slate Blue  
    { color: "#EAE4DC", delay: 0.4 }, // Warm Cream
  ];

  return (
    <div className={`${config.container} ${className} flex items-center justify-center gap-1`}>
      {bars.map((bar, index) => (
        <motion.div
          key={index}
          className={`${config.barWidth} ${config.barHeight} rounded-sm`}
          style={{ 
            backgroundColor: bar.color,
            transformOrigin: "bottom" 
          }}
          initial={animated ? { scaleY: 0 } : { scaleY: 1 }}
          animate={{ scaleY: 1 }}
          transition={{
            duration: 0.6,
            delay: bar.delay,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
}
