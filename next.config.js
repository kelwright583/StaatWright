/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable file tracing — prevents OneDrive from locking .next/trace
  outputFileTracingExcludes: {
    "*": ["**/*"],
  },
};

module.exports = nextConfig

