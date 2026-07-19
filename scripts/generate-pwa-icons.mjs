/**
 * Generate PWA icon sizes from the existing brand asset at public/icon.png.
 * Does not invent new artwork — only resizes the source file.
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "public", "icon.png");
const ICONS_DIR = path.join(ROOT, "public", "icons");

const OUTPUTS = [
  { file: path.join(ICONS_DIR, "icon-192x192.png"), size: 192 },
  { file: path.join(ICONS_DIR, "icon-512x512.png"), size: 512 },
  { file: path.join(ICONS_DIR, "icon-maskable-192x192.png"), size: 192 },
  { file: path.join(ICONS_DIR, "icon-maskable-512x512.png"), size: 512 },
  { file: path.join(ICONS_DIR, "apple-touch-icon.png"), size: 180 },
  { file: path.join(ICONS_DIR, "apple-touch-icon-152x152.png"), size: 152 },
  { file: path.join(ICONS_DIR, "apple-touch-icon-167x167.png"), size: 167 },
  { file: path.join(ICONS_DIR, "apple-touch-icon-180x180.png"), size: 180 },
  { file: path.join(ROOT, "public", "apple-touch-icon.png"), size: 180 },
  { file: path.join(ROOT, "public", "favicon-32x32.png"), size: 32 },
  { file: path.join(ROOT, "public", "favicon-16x16.png"), size: 16 },
];

const SPLASHES = [
  { file: path.join(ICONS_DIR, "apple-splash-1170x2532.png"), width: 1170, height: 2532 },
  { file: path.join(ICONS_DIR, "apple-splash-1290x2796.png"), width: 1290, height: 2796 },
  { file: path.join(ICONS_DIR, "apple-splash-2048x2732.png"), width: 2048, height: 2732 },
];

async function resizeSquare(size, outFile) {
  await sharp(SOURCE)
    .resize(size, size, {
      fit: "cover",
      withoutEnlargement: false,
    })
    .png()
    .toFile(outFile);
  console.log(`wrote ${path.relative(ROOT, outFile)} (${size}x${size})`);
}

async function writeSplash(width, height, outFile) {
  // Splash uses the same icon.png centered on the app background color — no new art.
  const logoSize = Math.round(Math.min(width, height) * 0.22);
  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: "cover" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 250, g: 247, b: 240, alpha: 1 }, // #FAF7F0
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(outFile);

  console.log(`wrote ${path.relative(ROOT, outFile)} (${width}x${height})`);
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing source icon: ${SOURCE}`);
    process.exit(1);
  }

  fs.mkdirSync(ICONS_DIR, { recursive: true });

  for (const item of OUTPUTS) {
    await resizeSquare(item.size, item.file);
  }

  for (const splash of SPLASHES) {
    await writeSplash(splash.width, splash.height, splash.file);
  }

  console.log("Done — all PWA icons generated from public/icon.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
