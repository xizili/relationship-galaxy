import { sites } from "@openai/sites-vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sites()],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 650
  }
});
