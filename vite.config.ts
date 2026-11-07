import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {cloudflare} from "@cloudflare/vite-plugin";
import {fileURLToPath} from "node:url";
export default defineConfig({resolve:{alias:{"@":fileURLToPath(new URL(".",import.meta.url))}},server:{host:"0.0.0.0",allowedHosts:["terminal.local"]},plugins:[react(),cloudflare()]});
