/**
 * Compress / convert marketplace static images for production delivery.
 * - Category tiles → 512×512 WebP (display ≤120–200px @2×)
 * - Heroes → 1280w WebP
 * - Top-bar mark → 72×72 WebP (displayed at 36px)
 *
 * Usage: node scripts/optimize-static-images.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const CATEGORY_SIZE = 512;
const CATEGORY_QUALITY = 78;
const HERO_WIDTH = 1280;
const HERO_QUALITY = 78;
const LOGO_SIZE = 72;
const LOGO_QUALITY = 82;

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {{ quality: number, resize: (img: sharp.Sharp) => sharp.Sharp }} options
 */
async function writeWebp(inputPath, outputPath, options) {
  const before = fs.statSync(inputPath).size;
  const pipeline = options.resize(sharp(inputPath).rotate());
  const buffer = await pipeline
    .webp({ quality: options.quality, effort: 6 })
    .toBuffer();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  console.log(
    `${path.relative(ROOT, inputPath)} → ${path.relative(ROOT, outputPath)}  ${kb(before)} → ${kb(buffer.length)}`,
  );
  return buffer.length;
}

async function optimizeCategories() {
  const dir = path.join(PUBLIC, "categories");
  const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f));

  for (const file of files) {
    const input = path.join(dir, file);
    const output = path.join(dir, file.replace(/\.(png|jpe?g)$/i, ".webp"));
    await writeWebp(input, output, {
      quality: CATEGORY_QUALITY,
      resize: (img) =>
        img.resize(CATEGORY_SIZE, CATEGORY_SIZE, {
          fit: "cover",
          withoutEnlargement: true,
        }),
    });
  }
}

async function optimizeHeroes() {
  const dir = path.join(PUBLIC, "marketplace");
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f));
  for (const file of files) {
    const input = path.join(dir, file);
    const output = path.join(dir, file.replace(/\.(png|jpe?g)$/i, ".webp"));
    await writeWebp(input, output, {
      quality: HERO_QUALITY,
      resize: (img) =>
        img.resize(HERO_WIDTH, null, {
          fit: "inside",
          withoutEnlargement: true,
        }),
    });
  }
}

async function optimizeLogoMark() {
  const source = path.join(PUBLIC, "icons", "icon-192x192.png");
  const fallback = path.join(PUBLIC, "icon.png");
  const input = fs.existsSync(source) ? source : fallback;
  const output = path.join(PUBLIC, "icons", "logo-mark.webp");
  await writeWebp(input, output, {
    quality: LOGO_QUALITY,
    resize: (img) =>
      img.resize(LOGO_SIZE, LOGO_SIZE, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        withoutEnlargement: true,
      }),
  });
}

async function recompressPngIcons() {
  const targets = [
    path.join(PUBLIC, "icon.png"),
    path.join(PUBLIC, "icons", "icon-1024.png"),
  ];

  for (const file of targets) {
    if (!fs.existsSync(file)) continue;
    const before = fs.statSync(file).size;
    const buffer = await sharp(file)
      .png({ compressionLevel: 9, palette: false })
      .toBuffer();
    if (buffer.length < before) {
      fs.writeFileSync(file, buffer);
      console.log(`recompress ${path.relative(ROOT, file)}  ${kb(before)} → ${kb(buffer.length)}`);
    }
  }
}

async function main() {
  console.log("Optimizing static marketplace images…");
  await optimizeCategories();
  await optimizeHeroes();
  await optimizeLogoMark();
  await recompressPngIcons();
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
