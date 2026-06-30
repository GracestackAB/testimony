#!/usr/bin/env node
/**
 * Rasteriserar public/logo-mark.svg till PWA/favicon-storlekar.
 * Palett: mörk parchment-bakgrund (#1a1814) + olivlåga.
 *
 *   node scripts/generate-icons-svg.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const MARK = path.join(PUBLIC, "logo-mark.svg");

/** Site bakgrund för app-ikoner — stone-900 / ink */
const BG = { r: 26, g: 24, b: 20, alpha: 1 };

const SIZES = [
  { file: "icon-512.png", size: 512, padding: 0.14 },
  { file: "icon-192.png", size: 192, padding: 0.14 },
  { file: "icon-maskable-512.png", size: 512, padding: 0.22 },
  { file: "apple-touch-icon.png", size: 180, padding: 0.16 },
  { file: "favicon-32.png", size: 32, padding: 0.1 },
  { file: "favicon-16.png", size: 16, padding: 0.08 },
];

async function renderIcon({ file, size, padding }) {
  const inner = Math.round(size * (1 - padding * 2));
  const offset = Math.round((size - inner) / 2);
  const mark = await sharp(MARK).resize(inner, inner, { fit: "contain" }).png().toBuffer();
  const out = await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: mark, left: offset, top: offset }])
    .png()
    .toBuffer();
  await fs.writeFile(path.join(PUBLIC, file), out);
  console.log(`✓ ${file} (${size}×${size})`);
}

async function main() {
  await fs.access(MARK);
  for (const spec of SIZES) {
    await renderIcon(spec);
  }
  const fav32 = await fs.readFile(path.join(PUBLIC, "favicon-32.png"));
  await fs.writeFile(path.join(PUBLIC, "favicon.ico"), fav32);
  console.log("✓ favicon.ico");
  console.log("\nKlart — uppdatera ?v= i layout.tsx/manifest.json vid deploy.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
