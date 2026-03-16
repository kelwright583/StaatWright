"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface VentureTileProps {
  name: string;
  tagline: string;
  description: string;
  href?: string;
}

export default function VentureTile({ name, tagline, description, href }: VentureTileProps) {
  const content = (
    <motion.div
      className={`relative h-80 bg-navy rounded-lg p-8 flex flex-col justify-between overflow-hidden ${
        href ? "cursor-pointer group" : ""
      }`}
      whileHover={href ? { scale: 1.02 } : {}}
      transition={{ duration: 0.3 }}
    >
      <div className="relative z-10">
        <h3 className="font-poppins text-3xl md:text-4xl text-offwhite mb-2">
          {name}
        </h3>
        <p className="font-montserrat text-lg text-slate">
          {tagline}
        </p>
      </div>

      {href ? (
        <motion.div
          className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          initial={{ opacity: 0 }}
        >
          <p className="font-montserrat text-base text-cream">
            {description}
          </p>
        </motion.div>
      ) : (
        <div className="relative z-10">
          <p className="font-montserrat text-base text-cream">
            {description}
          </p>
        </div>
      )}

      {href && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

