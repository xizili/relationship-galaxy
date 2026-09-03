import { sites } from "@openai/sites-vite-plugin";
import { defineConfig } from "vite";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

function stageStaticWorker() {
  return {
    name: "stage-static-worker",
    apply: "build",
    closeBundle() {
      const outputDirectory = resolve("dist/server");
      mkdirSync(outputDirectory, { recursive: true });
      copyFileSync(resolve("worker/index.js"), resolve(outputDirectory, "index.js"));
    }
  };
}

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/relationship-galaxy/" : "/",
  plugins: [sites(), stageStaticWorker()],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 650
  }
});
