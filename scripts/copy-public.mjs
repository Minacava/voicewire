import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "public");
const dest = path.join(root, "dist", "public");

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
