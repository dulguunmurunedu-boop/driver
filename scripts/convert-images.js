#!/usr/bin/env node
/**
 * Converts the question PNGs in public/assets/questions/ to WebP
 * (quality 90), deleting each PNG after a successful conversion.
 * Originals are backed up at ~/Desktop/Бүлэг; re-run this after
 * scripts/import-images.js if the PNGs are ever re-imported.
 *
 * Usage: node scripts/convert-images.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const QUESTIONS_DIR = path.join(ROOT, "public", "assets", "questions");
const CONCURRENCY = 8;

async function main() {
  const jobs = [];
  for (const dir of fs.readdirSync(QUESTIONS_DIR)) {
    const chapterDir = path.join(QUESTIONS_DIR, dir);
    if (!fs.statSync(chapterDir).isDirectory()) continue;
    for (const file of fs.readdirSync(chapterDir)) {
      if (/\.png$/i.test(file)) jobs.push(path.join(chapterDir, file));
    }
  }

  let done = 0;
  let pngBytes = 0;
  let webpBytes = 0;
  const errors = [];

  async function convert(src) {
    const dest = src.replace(/\.png$/i, ".webp");
    try {
      await sharp(src).webp({ quality: 90, effort: 6 }).toFile(dest);
      pngBytes += fs.statSync(src).size;
      webpBytes += fs.statSync(dest).size;
      fs.unlinkSync(src);
    } catch (err) {
      errors.push(`${src}: ${err.message}`);
    }
    done += 1;
    if (done % 100 === 0) console.log(`  ${done}/${jobs.length}`);
  }

  const queue = jobs.slice();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) await convert(queue.shift());
    })
  );

  if (errors.length) {
    console.error(`FAILED — ${errors.length} error(s):`);
    for (const e of errors) console.error("  -", e);
    process.exit(2);
  }
  const mb = (b) => (b / 1024 / 1024).toFixed(1) + "MB";
  console.log(`Converted ${jobs.length} images: ${mb(pngBytes)} → ${mb(webpBytes)}`);
}

main();
