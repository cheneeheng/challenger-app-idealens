/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Keep Playwright specs (e2e/) out of the Vitest run.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
