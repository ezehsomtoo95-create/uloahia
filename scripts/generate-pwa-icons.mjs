/**
 * Generate PWA icon sizes from the brand mark.
 *
 * 1) Keeps an immutable raw copy at public/icons/icon-source-raw.png
 * 2) Builds a clean 1024×1024 PNG with transparent background
 *    (removes black plate + grey anti-aliased outline)
 * 3) Writes that master to public/icon.png and regenerates all PWA assets
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC_ICON = path.join(ROOT, "public", "icon.png");
const ICONS_DIR = path.join(ROOT, "public", "icons");
const RAW_SOURCE = path.join(ICONS_DIR, "icon-source-raw.png");
const MASTER_SIZE = 1024;

/** Matches CSS `--background: #faf7f0` */
const APP_BG = { r: 250, g: 247, b: 240, alpha: 1 };

const SQUARE_OUTPUTS = [
  { file: path.join(ICONS_DIR, "icon-192x192.png"), size: 192, opaque: false },
  { file: path.join(ICONS_DIR, "icon-512x512.png"), size: 512, opaque: false },
  { file: path.join(ICONS_DIR, "icon-maskable-192x192.png"), size: 192, opaque: true },
  { file: path.join(ICONS_DIR, "icon-maskable-512x512.png"), size: 512, opaque: true },
  { file: path.join(ICONS_DIR, "apple-touch-icon.png"), size: 180, opaque: true },
  { file: path.join(ICONS_DIR, "apple-touch-icon-152x152.png"), size: 152, opaque: true },
  { file: path.join(ICONS_DIR, "apple-touch-icon-167x167.png"), size: 167, opaque: true },
  { file: path.join(ICONS_DIR, "apple-touch-icon-180x180.png"), size: 180, opaque: true },
  { file: path.join(ROOT, "public", "apple-touch-icon.png"), size: 180, opaque: true },
  { file: path.join(ROOT, "public", "favicon-32x32.png"), size: 32, opaque: true },
  { file: path.join(ROOT, "public", "favicon-16x16.png"), size: 16, opaque: true },
];

const SPLASHES = [
  { file: "apple-splash-1290x2796.png", width: 1290, height: 2796 },
  { file: "apple-splash-1179x2556.png", width: 1179, height: 2556 },
  { file: "apple-splash-1170x2532.png", width: 1170, height: 2532 },
  { file: "apple-splash-1284x2778.png", width: 1284, height: 2778 },
  { file: "apple-splash-1125x2436.png", width: 1125, height: 2436 },
  { file: "apple-splash-1242x2688.png", width: 1242, height: 2688 },
  { file: "apple-splash-828x1792.png", width: 828, height: 1792 },
  { file: "apple-splash-750x1334.png", width: 750, height: 1334 },
  { file: "apple-splash-2048x2732.png", width: 2048, height: 2732 },
  { file: "apple-splash-1668x2388.png", width: 1668, height: 2388 },
  { file: "apple-splash-1640x2360.png", width: 1640, height: 2360 },
  { file: "apple-splash-1536x2048.png", width: 1536, height: 2048 },
];

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function chroma(r, g, b) {
  const avg = (r + g + b) / 3;
  return Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
}

/** Outer black plate + grey squircle outline (not logo green/yellow). */
function isOuterBackground(r, g, b) {
  const L = luminance(r, g, b);
  const C = chroma(r, g, b);
  if (L < 40) return true;
  if (C < 28 && L < 175) return true;
  return false;
}

function floodKnockout(raw, width, height) {
  const data = Buffer.from(raw);
  const visited = new Uint8Array(width * height);
  const stack = [];

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    stack.push(y * width + x);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (stack.length) {
    const idx = stack.pop();
    if (visited[idx]) continue;
    visited[idx] = 1;

    const i = idx * 4;
    if (!isOuterBackground(data[i], data[i + 1], data[i + 2])) continue;

    data[i + 3] = 0;

    const x = idx % width;
    const y = (idx / width) | 0;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  // Second pass: clear remaining grey fringe that touches transparency
  const out = Buffer.from(data);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = (y * width + x) * 4;
      if (data[i + 3] === 0) continue;
      if (!isOuterBackground(data[i], data[i + 1], data[i + 2])) continue;

      let touchesClear = false;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        if (data[((y + dy) * width + (x + dx)) * 4 + 3] === 0) {
          touchesClear = true;
          break;
        }
      }
      if (touchesClear) out[i + 3] = 0;
    }
  }

  return out;
}

function softenFringe(raw, width, height) {
  const data = Buffer.from(raw);

  // Pass A: fully clear leftover grey rim next to transparency (kills the thin dark outline)
  for (let pass = 0; pass < 3; pass += 1) {
    const snapshot = Buffer.from(data);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const i = (y * width + x) * 4;
        if (snapshot[i + 3] === 0) continue;

        let clearNeighbors = 0;
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ]) {
          if (snapshot[((y + dy) * width + (x + dx)) * 4 + 3] === 0) clearNeighbors += 1;
        }
        if (clearNeighbors === 0) continue;

        const L = luminance(snapshot[i], snapshot[i + 1], snapshot[i + 2]);
        const C = chroma(snapshot[i], snapshot[i + 1], snapshot[i + 2]);
        // Neutral rim / anti-alias — not the cream face or logo colors
        if (C < 40 && L < 230) {
          data[i + 3] = 0;
        }
      }
    }
  }

  return data;
}

async function buildTransparentMaster(sourcePath) {
  const { data, info } = await sharp(sourcePath)
    .resize(MASTER_SIZE, MASTER_SIZE, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let cleaned = floodKnockout(data, info.width, info.height);
  cleaned = softenFringe(cleaned, info.width, info.height);

  const trimmed = await sharp(cleaned, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 0 })
    .png()
    .toBuffer();

  const meta = await sharp(trimmed).metadata();
  const maxSide = Math.max(meta.width ?? MASTER_SIZE, meta.height ?? MASTER_SIZE);
  const contentSize = Math.round(MASTER_SIZE * 0.92);
  const scale = contentSize / maxSide;

  const fitted = await sharp(trimmed)
    .resize(
      Math.max(1, Math.round((meta.width ?? MASTER_SIZE) * scale)),
      Math.max(1, Math.round((meta.height ?? MASTER_SIZE) * scale)),
      {
        fit: "inside",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    )
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: MASTER_SIZE,
      height: MASTER_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted, gravity: "centre" }])
    .png()
    .toBuffer();
}

async function writeSquare(sourcePng, size, outFile, opaque) {
  const resized = await sharp(sourcePng)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  if (opaque) {
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: APP_BG,
      },
    })
      .composite([{ input: resized, gravity: "centre" }])
      .png()
      .toFile(outFile);
  } else {
    await sharp(resized).png().toFile(outFile);
  }

  console.log(`wrote ${path.relative(ROOT, outFile)} (${size}x${size})`);
}

async function logoOnlyBuffer(sourcePng) {
  // Splash: keep the green/yellow mark only, drop the near-white plate so
  // there's no hard square edge or faint rim on the cream background.
  const { data, info } = await sharp(sourcePng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const L = luminance(data[i], data[i + 1], data[i + 2]);
    const C = chroma(data[i], data[i + 1], data[i + 2]);
    if (C < 35 && L > 220) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function writeSplash(sourcePng, width, height, outFile) {
  const logoSrc = await logoOnlyBuffer(sourcePng);
  const logoSize = Math.round(Math.min(width, height) * 0.32);
  const logo = await sharp(logoSrc)
    .trim({ threshold: 0 })
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: APP_BG,
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(outFile);

  console.log(`wrote ${path.relative(ROOT, outFile)} (${width}x${height})`);
}

async function main() {
  if (!fs.existsSync(PUBLIC_ICON) && !fs.existsSync(RAW_SOURCE)) {
    console.error(`Missing source icon: ${PUBLIC_ICON}`);
    process.exit(1);
  }

  fs.mkdirSync(ICONS_DIR, { recursive: true });

  // Immutable raw: prefer an existing raw, else seed from current public/icon.png
  // only when that file still looks like the original (opaque, no alpha).
  if (!fs.existsSync(RAW_SOURCE)) {
    const meta = await sharp(PUBLIC_ICON).metadata();
    if (meta.hasAlpha) {
      console.error(
        "public/icon.png is already transparent and no icon-source-raw.png exists.\n" +
          "Restore the original icon asset first, then re-run.",
      );
      process.exit(1);
    }
    await sharp(PUBLIC_ICON).png().toFile(RAW_SOURCE);
    console.log(`saved raw source → ${path.relative(ROOT, RAW_SOURCE)}`);
  }

  console.log("Building clean 1024×1024 transparent master…");
  const master = await buildTransparentMaster(RAW_SOURCE);

  await sharp(master).toFile(PUBLIC_ICON);
  await sharp(master).toFile(path.join(ICONS_DIR, "icon-1024.png"));
  console.log(`wrote public/icon.png (${MASTER_SIZE}x${MASTER_SIZE}, transparent)`);
  console.log("wrote public/icons/icon-1024.png");

  for (const item of SQUARE_OUTPUTS) {
    await writeSquare(master, item.size, item.file, item.opaque);
  }

  for (const splash of SPLASHES) {
    await writeSplash(
      master,
      splash.width,
      splash.height,
      path.join(ICONS_DIR, splash.file),
    );
  }

  console.log("Done — transparent master + all PWA icons regenerated");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
