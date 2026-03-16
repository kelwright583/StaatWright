"use client";

import { motion } from "framer-motion";
import LoadingLogoIcon from "./LoadingLogoIcon";

interface AnimatedCenterLogoProps {
  className?: string;
}

export default function AnimatedCenterLogo({ className = "" }: AnimatedCenterLogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <LoadingLogoIcon size="lg" />
      </motion.div>
    </div>
  );
}
