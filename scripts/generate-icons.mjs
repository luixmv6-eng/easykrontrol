import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");
const iconsDir = path.join(publicDir, "icons");

mkdirSync(iconsDir, { recursive: true });

const svgBuffer = readFileSync(path.join(iconsDir, "icon-512.svg"));

const sizes = [
  { file: "icon-72.png",   size: 72  },
  { file: "icon-96.png",   size: 96  },
  { file: "icon-128.png",  size: 128 },
  { file: "icon-144.png",  size: 144 },
  { file: "icon-152.png",  size: 152 },
  { file: "icon-192.png",  size: 192 },
  { file: "icon-384.png",  size: 384 },
  { file: "icon-512.png",  size: 512 },
];

for (const { file, size } of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(path.join(iconsDir, file));
  console.log(`✓ ${file}`);
}

// apple-touch-icon (180x180) — requerido por iOS Safari
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(path.join(publicDir, "apple-touch-icon.png"));
console.log("✓ apple-touch-icon.png");

// favicon.ico como PNG 32x32 (browsers modernos lo aceptan)
await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(path.join(publicDir, "favicon.ico"));
console.log("✓ favicon.ico");

// favicon.png 32x32
await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(path.join(publicDir, "favicon.png"));
console.log("✓ favicon.png");

console.log("\n✅ Todos los íconos generados correctamente.");
