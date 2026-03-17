"use client";

import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      [data-reveal] {
        opacity: 0;
        transform: translateY(22px);
        transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }
      [data-reveal].visible {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);

    // Target sections/cards/headings/paragraphs below the hero only
    // Hero (#services starts below) — skip anything inside the first section
    const revealSections = document.querySelectorAll<HTMLElement>(
      "#services, #partners, #contact, footer"
    );

    const targets: HTMLElement[] = [];

    revealSections.forEach((section) => {
      section.setAttribute("data-reveal", "");
      targets.push(section);

      // Children to stagger within each section
      section.querySelectorAll<HTMLElement>("h2, h3, p, a[href^='#'], .reveal-card").forEach((child) => {
        child.setAttribute("data-reveal", "");
        targets.push(child);
      });
    });

    // Apply stagger delays
    targets.forEach((el, i) => {
      const delay = Math.min(i * 35, 250);
      el.style.transitionDelay = `${delay}ms`;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      style.remove();
      targets.forEach((el) => {
        el.removeAttribute("data-reveal");
        el.classList.remove("visible");
        el.style.transitionDelay = "";
      });
    };
  }, []);

  return null;
}
