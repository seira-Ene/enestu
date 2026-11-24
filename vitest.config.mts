import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "supabase/tests/**/*.test.ts"],
    // DBのテストは、最初にDBを作るため時間がかかる。
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
