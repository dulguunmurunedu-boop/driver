#!/usr/bin/env node
/**
 * Imports driving-test question images from the external Desktop folder
 * into the project with a normalized structure:
 *
 *   ~/Desktop/Бүлэг/Бүлэг <N>/<M>.png  →  public/assets/questions/chapter-<NN>/q<MM>.png
 *
 * Validates count, duplicates, missing files and writes a report to
 * scripts/import-report.json.
 *
 * Usage: node scripts/import-images.js [--source <dir>]
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const argSourceIndex = process.argv.indexOf("--source");
const SOURCE_DIR =
  argSourceIndex !== -1
    ? path.resolve(process.argv[argSourceIndex + 1])
    : path.join(os.homedir(), "Desktop", "Бүлэг");
const TARGET_DIR = path.join(__dirname, "..", "public", "assets", "questions");

const EXPECTED_CHAPTERS = 40;
const EXPECTED_QUESTIONS_PER_CHAPTER = 20;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isValidImage(buffer, ext) {
  if (ext === ".png") return buffer.subarray(0, 4).equals(PNG_MAGIC);
  if (ext === ".jpg" || ext === ".jpeg") return buffer.subarray(0, 3).equals(JPG_MAGIC);
  return buffer.length > 0;
}

function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source folder not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sourceDir: SOURCE_DIR,
    targetDir: TARGET_DIR,
    totalImagesFound: 0,
    importedCount: 0,
    missingImages: [],
    duplicateImages: [],
    invalidFiles: [],
    skippedEntries: [],
    chapters: {}
  };

  const chapterDirs = fs
    .readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const match = entry.name.match(/(\d+)\s*$/);
      return match ? { name: entry.name, chapter: Number(match[1]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.chapter - b.chapter);

  const hashIndex = new Map(); // content hash → first occurrence

  for (const { name, chapter } of chapterDirs) {
    if (chapter < 1 || chapter > EXPECTED_CHAPTERS) {
      report.skippedEntries.push(`${name} (chapter ${chapter} out of range)`);
      continue;
    }

    const sourceChapterDir = path.join(SOURCE_DIR, name);
    const targetChapterDir = path.join(TARGET_DIR, `chapter-${pad2(chapter)}`);
    fs.mkdirSync(targetChapterDir, { recursive: true });

    const files = new Map(); // question number → source filename
    for (const file of fs.readdirSync(sourceChapterDir)) {
      const ext = path.extname(file).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) {
        if (!file.startsWith(".")) report.skippedEntries.push(`${name}/${file} (not an image)`);
        continue;
      }
      report.totalImagesFound += 1;
      const match = path.basename(file, ext).match(/^(\d+)$/);
      if (!match) {
        report.skippedEntries.push(`${name}/${file} (unrecognized name pattern)`);
        continue;
      }
      files.set(Number(match[1]), file);
    }

    let imported = 0;
    for (let q = 1; q <= EXPECTED_QUESTIONS_PER_CHAPTER; q += 1) {
      const sourceFile = files.get(q);
      if (!sourceFile) {
        report.missingImages.push(`chapter ${chapter}, question ${q}`);
        continue;
      }

      const ext = path.extname(sourceFile).toLowerCase();
      const sourcePath = path.join(sourceChapterDir, sourceFile);
      const buffer = fs.readFileSync(sourcePath);

      if (!isValidImage(buffer, ext)) {
        report.invalidFiles.push(`${name}/${sourceFile} (corrupt or wrong format)`);
        continue;
      }

      const hash = crypto.createHash("md5").update(buffer).digest("hex");
      const id = `chapter ${chapter}, question ${q}`;
      if (hashIndex.has(hash)) {
        report.duplicateImages.push(`${id} is identical to ${hashIndex.get(hash)}`);
      } else {
        hashIndex.set(hash, id);
      }

      const targetName = `q${pad2(q)}${ext === ".jpeg" ? ".jpg" : ext}`;
      fs.writeFileSync(path.join(targetChapterDir, targetName), buffer);
      imported += 1;
    }

    report.chapters[chapter] = { source: name, imported };
    report.importedCount += imported;
  }

  const foundChapters = Object.keys(report.chapters).map(Number);
  for (let c = 1; c <= EXPECTED_CHAPTERS; c += 1) {
    if (!foundChapters.includes(c)) {
      report.missingImages.push(`chapter ${c} (entire folder missing)`);
    }
  }

  fs.writeFileSync(
    path.join(__dirname, "import-report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log("=== IMPORT VALIDATION REPORT ===");
  console.log(`Source:            ${SOURCE_DIR}`);
  console.log(`Chapters found:    ${foundChapters.length} / ${EXPECTED_CHAPTERS}`);
  console.log(`Total images found:${String(report.totalImagesFound).padStart(5)}`);
  console.log(`Imported:          ${String(report.importedCount).padStart(5)}`);
  console.log(`Missing:           ${report.missingImages.length}`);
  console.log(`Duplicates:        ${report.duplicateImages.length}`);
  console.log(`Invalid files:     ${report.invalidFiles.length}`);
  if (report.missingImages.length) console.log("Missing:", report.missingImages.join("; "));
  if (report.invalidFiles.length) console.log("Invalid:", report.invalidFiles.join("; "));
  if (report.duplicateImages.length) {
    console.log("Duplicates (content-identical, kept both):");
    for (const d of report.duplicateImages) console.log("  -", d);
  }
  console.log(`Full report: scripts/import-report.json`);

  const ok =
    report.importedCount === EXPECTED_CHAPTERS * EXPECTED_QUESTIONS_PER_CHAPTER &&
    report.missingImages.length === 0 &&
    report.invalidFiles.length === 0;
  process.exit(ok ? 0 : 2);
}

main();
