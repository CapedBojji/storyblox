import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "docs",
  base: "/storyblox/",
  build: {
    outDir: "../dist/docs",
    emptyOutDir: true,
  },
});
