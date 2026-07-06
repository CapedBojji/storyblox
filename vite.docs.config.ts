import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: "docs",
  base: "/storyblox/",
  build: {
    outDir: "../dist/docs",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(rootDir, "docs/index.html"),
        api: resolve(rootDir, "docs/api/index.html"),
      },
    },
  },
});
