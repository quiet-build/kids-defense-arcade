import { defineConfig } from "@playwright/test";
export default defineConfig({
testDir:"./tests",testMatch:"component.spec.js",workers:1,timeout:30000,outputDir:"test-results/component",
use:{baseURL:"http://127.0.0.1:5302",viewport:{width:1280,height:1000},launchOptions:{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}},
webServer:[
{command:"pnpm exec vite preview --host 127.0.0.1 --port 5301 --strictPort",url:"http://127.0.0.1:5301"},
{command:"node tests/component-host.mjs",url:"http://127.0.0.1:5302"}
]});
