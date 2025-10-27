/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Disable the App Router to avoid conflicts with the Pages Router
    experimental: {
        appDir: false,
    },
    env: {
        NEXT_PUBLIC_API_BASE:
            process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000",
    },
};

module.exports = nextConfig;
