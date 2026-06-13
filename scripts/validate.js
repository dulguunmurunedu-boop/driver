#!/usr/bin/env node
/**
 * Final integrity check for the learning platform:
 *   - 40 chapters, 20 questions each, 800 images on disk
 *   - 800 answer mappings, all in range 1–5
 *   - questions.json paths resolve to real files
 *   - no duplicate question IDs
 *
 * Usage: node scripts/validate.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const QUESTIONS_FILE = path.join(ROOT, "public", "data", "questions.json");
const ANSWERS_FILE = path.join(ROOT, "public", "data", "answers.json");
const IMAGES_DIR = path.join(ROOT, "public", "assets", "questions");

const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };

function main() {
  check(fs.existsSync(QUESTIONS_FILE), "questions.json is missing");
  check(fs.existsSync(ANSWERS_FILE), "answers.json is missing");
  if (errors.length) return finish();

  const questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, "utf8"));
  const answers = JSON.parse(fs.readFileSync(ANSWERS_FILE, "utf8"));

  /* Chapters & answers */
  check(Object.keys(answers).length === 40, `answers.json has ${Object.keys(answers).length} chapters, expected 40`);
  let answerCount = 0;
  for (let c = 1; c <= 40; c += 1) {
    const ch = answers[String(c)];
    check(!!ch, `Chapter ${c}: missing from answers.json`);
    if (!ch) continue;
    check(Object.keys(ch).length === 20, `Chapter ${c}: ${Object.keys(ch).length} answers, expected 20`);
    for (let q = 1; q <= 20; q += 1) {
      const a = ch[String(q)];
      check(Number.isInteger(a) && a >= 1 && a <= 5, `Chapter ${c} q${q}: invalid answer ${a}`);
      if (a !== undefined) answerCount += 1;
    }
  }
  check(answerCount === 800, `Total answers: ${answerCount}, expected 800`);

  /* Questions */
  check(questions.length === 800, `questions.json has ${questions.length} items, expected 800`);
  const ids = new Set();
  const perChapter = {};
  for (const q of questions) {
    check(!ids.has(q.id), `Duplicate question id: ${q.id}`);
    ids.add(q.id);
    perChapter[q.chapterId] = (perChapter[q.chapterId] || 0) + 1;

    const expectedAnswer = answers[String(q.chapterId)] && answers[String(q.chapterId)][String(q.questionNumber)];
    check(q.correctAnswer === expectedAnswer,
      `${q.id}: correctAnswer ${q.correctAnswer} disagrees with answers.json (${expectedAnswer})`);

    const diskPath = path.join(ROOT, q.imagePath.replace(/^\/public\//, "public/"));
    check(fs.existsSync(diskPath), `${q.id}: broken image path ${q.imagePath}`);
  }
  for (let c = 1; c <= 40; c += 1) {
    check(perChapter[c] === 20, `Chapter ${c}: ${perChapter[c] || 0} questions, expected 20`);
  }

  /* Images on disk */
  let imageCount = 0;
  if (fs.existsSync(IMAGES_DIR)) {
    for (const dir of fs.readdirSync(IMAGES_DIR)) {
      const chapterDir = path.join(IMAGES_DIR, dir);
      if (fs.statSync(chapterDir).isDirectory()) {
        imageCount += fs.readdirSync(chapterDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).length;
      }
    }
  }
  check(imageCount === 800, `Images on disk: ${imageCount}, expected 800`);

  finish(questions.length, answerCount, imageCount);
}

function finish(qCount, aCount, iCount) {
  console.log("=== PLATFORM VALIDATION REPORT ===");
  if (qCount !== undefined) {
    console.log(`Questions:        ${qCount} / 800`);
    console.log(`Answer mappings:  ${aCount} / 800`);
    console.log(`Images on disk:   ${iCount} / 800`);
  }
  if (errors.length) {
    console.log(`\nFAILED — ${errors.length} problem(s):`);
    for (const e of errors) console.log("  ✗ " + e);
    process.exit(2);
  }
  console.log("Duplicate IDs:    0");
  console.log("Broken paths:     0");
  console.log("\nAll checks passed ✓");
}

main();
