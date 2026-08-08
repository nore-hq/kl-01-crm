import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

console.log("=========================================");
console.log("🚀 BOOTING UP CLOUDFLARE DEV PLATFORM...");
console.log("=========================================");

try {
    await setupDevPlatform();
    console.log("✅ CLOUDFLARE BINDINGS INJECTED SUCCESSFULLY!");
} catch (e) {
    console.error("❌ FAILED TO INJECT BINDINGS:", e);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    // your existing config options
};

export default nextConfig;