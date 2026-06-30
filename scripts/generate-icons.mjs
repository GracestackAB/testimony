#!/usr/bin/env node
// Genererar 3 ikonvarianter via OpenRouter (Gemini 2.5 Flash Image).
// Användning: OPENROUTER_API_KEY=... node scripts/generate-icons.mjs
//   eller efter val: node scripts/generate-icons.mjs --finalize=v2

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image-preview";

const PROMPTS = {
  v1: `App icon design, 1024×1024, square format. Subject: a stylized speech bubble with a small Christian cross subtly integrated inside it, representing testimony and faith. Style: minimalist, modern, flat design, very high contrast, clean geometric shapes. Color palette: emerald green #10b981 mark on a deep dark navy background #0a1f1a. The mark must sit within the central 80% safe area (iOS rounds the corners). NO text, NO letters, NO words anywhere. Pure iconographic design. Crisp edges, scalable down to 48×48 pixels while remaining recognizable. Symmetric, centered, balanced. Do not write the word Testimony or any other text.`,

  v2: `App icon design, 1024×1024, square format. Subject: a single warm flame, stylized as a soft elegant teardrop shape, evoking the Holy Spirit and testimony. Style: minimalist, modern, flat design with subtle depth, very high contrast. Color palette: bright emerald green #10b981 flame with a soft inner glow, on a deep dark navy background #0a1f1a. The flame must sit within the central 80% safe area. NO text, NO letters, NO words. Pure symbolic art. Crisp clean curves, scalable down to 48×48 pixels. Centered, symmetric. Do not write Testimony or any other text.`,

  v3: `App icon design, 1024×1024, square format. Subject: an open book with a single ribbon bookmark and a soft light radiating upward from the pages, evoking scripture and a story being told. Style: minimalist, modern, flat geometric design, high contrast. Color palette: emerald green #10b981 book and ribbon on a deep dark navy background #0a1f1a, with a faint light beam in pale gold #e6c875. The book must sit within the central 80% safe area. NO text, NO letters, NO words on the book or anywhere. Pure iconography. Scalable down to 48×48. Centered. Do not write Testimony or any other text.`,
};

async function callOpenRouter(prompt) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY saknas");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://testimony.se",
      "X-Title": "testimony.se icon generator",
    },
    body: JSON.stringify({
      model: MODEL,
      modalities: ["image", "text"],
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = await res.json();
  const message = json?.choices?.[0]?.message;
  // Look for image data in different possible shapes
  const images = message?.images;
  if (Array.isArray(images) && images.length > 0) {
    const img = images[0];
    const url = img?.image_url?.url || img?.url || img;
    if (typeof url === "string" && url.startsWith("data:")) {
      const b64 = url.split(",")[1];
      return Buffer.from(b64, "base64");
    }
    if (typeof url === "string" && url.startsWith("http")) {
      const r = await fetch(url);
      return Buffer.from(await r.arrayBuffer());
    }
  }
  // Fallback: scan content for data URLs
  const content = message?.content;
  if (typeof content === "string") {
    const m = content.match(/data:image\/[a-zA-Z]+;base64,([A-Za-z0-9+/=]+)/);
    if (m) return Buffer.from(m[1], "base64");
  }
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part?.type === "image_url" && part?.image_url?.url?.startsWith("data:")) {
        return Buffer.from(part.image_url.url.split(",")[1], "base64");
      }
    }
  }
  throw new Error("Inget bildinnehåll i svaret: " + JSON.stringify(json).slice(0, 800));
}

async function generateVariants() {
  for (const [key, prompt] of Object.entries(PROMPTS)) {
    const out = path.join(PUBLIC_DIR, `icon-source-${key}.png`);
    process.stdout.write(`→ Genererar ${key}... `);
    try {
      const buf = await callOpenRouter(prompt);
      // Normalisera till exakt 1024x1024 PNG
      const norm = await sharp(buf).resize(1024, 1024, { fit: "cover" }).png().toBuffer();
      await fs.writeFile(out, norm);
      console.log(`OK (${norm.length} bytes) → ${path.relative(ROOT, out)}`);
    } catch (e) {
      console.error(`FEL: ${e.message}`);
    }
  }
  console.log("\nVälj variant:  node scripts/generate-icons.mjs --finalize=v1|v2|v3");
}

async function finalize(variant) {
  const source = path.join(PUBLIC_DIR, `icon-source-${variant}.png`);
  await fs.access(source).catch(() => {
    throw new Error(`Hittar inte ${source}. Kör först utan --finalize.`);
  });
  const buf = await fs.readFile(source);
  const sizes = [
    { file: "icon-512.png", size: 512, padding: 0 },
    { file: "icon-192.png", size: 192, padding: 0 },
    { file: "icon-maskable-512.png", size: 512, padding: 0.2 },
    { file: "apple-touch-icon.png", size: 180, padding: 0 },
    { file: "favicon-32.png", size: 32, padding: 0 },
    { file: "favicon-16.png", size: 16, padding: 0 },
  ];
  // Solid background for maskable + iOS (iOS doesn't support transparency well)
  const bg = { r: 10, g: 31, b: 26, alpha: 1 };

  for (const { file, size, padding } of sizes) {
    const inner = Math.round(size * (1 - padding * 2));
    const offset = Math.round((size - inner) / 2);
    const resized = await sharp(buf).resize(inner, inner, { fit: "contain" }).png().toBuffer();
    const composed = await sharp({
      create: { width: size, height: size, channels: 4, background: bg },
    })
      .composite([{ input: resized, left: offset, top: offset }])
      .png()
      .toBuffer();
    await fs.writeFile(path.join(PUBLIC_DIR, file), composed);
    console.log(`✓ ${file} (${size}×${size}${padding ? `, padding ${padding * 100}%` : ""})`);
  }

  // favicon.ico (multi-size, png-encoded ICO via sharp)
  // Sharp can't write .ico directly — generate a PNG-only fallback that browsers accept.
  const fav32 = await sharp(buf).resize(32, 32).png().toBuffer();
  await fs.writeFile(path.join(PUBLIC_DIR, "favicon.ico"), fav32);
  console.log("✓ favicon.ico (32×32 PNG-encoded)");

  console.log("\nAlla ikoner genererade i public/.");
}

const args = process.argv.slice(2);
const finalizeArg = args.find((a) => a.startsWith("--finalize="));
if (finalizeArg) {
  const variant = finalizeArg.split("=")[1];
  if (!["v1", "v2", "v3"].includes(variant)) {
    console.error("Ogiltig variant. Använd v1, v2 eller v3.");
    process.exit(1);
  }
  finalize(variant).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  generateVariants().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
