#!/usr/bin/env node
/**
 * Generates the master question dataset and answer database from
 * cards_data_fixed.json (official answer keys scraped from
 * https://bilguuntulga.com/durmiin-test/) plus manual patches for
 * answers missing on the source site.
 *
 * Outputs:
 *   public/data/answers.json   — { "<chapter>": { "<question>": answer } }
 *   public/data/questions.json — flat list of 800 question objects
 *
 * Usage: node scripts/generate-data.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "cards_data_fixed.json");
const OUT_DIR = path.join(ROOT, "public", "data");
const QUESTIONS_DIR = path.join(ROOT, "public", "assets", "questions");

// Answers absent from the source site's answer key, verified manually
// against the question image (chapter 34 q4: bicycle-path sign — motorcycles
// are prohibited on bicycle paths, so option 2).
const PATCHES = { "34": { "4": 2 } };

function pad2(n) {
  return String(n).padStart(2, "0");
}

function main() {
  const cards = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const answers = {};
  const questions = [];
  const errors = [];

  for (let chapter = 1; chapter <= 40; chapter += 1) {
    const key = pad2(chapter);
    const card = cards[key];
    if (!card) {
      errors.push(`Chapter ${chapter}: no card data`);
      continue;
    }

    const chapterAnswers = {};
    for (let q = 1; q <= 20; q += 1) {
      let answer = card.answers ? card.answers[String(q)] : undefined;
      if (answer === undefined && PATCHES[key]) answer = PATCHES[key][String(q)];
      if (!Number.isInteger(answer) || answer < 1 || answer > 5) {
        errors.push(`Chapter ${chapter} question ${q}: missing or invalid answer (${answer})`);
        continue;
      }
      chapterAnswers[q] = answer;

      const imagePath = `/public/assets/questions/chapter-${key}/q${pad2(q)}.webp`;
      const onDisk = path.join(QUESTIONS_DIR, `chapter-${key}`, `q${pad2(q)}.webp`);
      if (!fs.existsSync(onDisk)) {
        errors.push(`Chapter ${chapter} question ${q}: image missing at ${imagePath}`);
      }

      questions.push({
        id: `chapter-${key}-q${pad2(q)}`,
        chapterId: chapter,
        questionNumber: q,
        imagePath,
        correctAnswer: answer
      });
    }
    answers[chapter] = chapterAnswers;
  }

  if (errors.length) {
    console.error("Data generation failed:");
    for (const e of errors) console.error("  -", e);
    process.exit(2);
  }

  fs.writeFileSync(path.join(OUT_DIR, "answers.json"), JSON.stringify(answers, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "questions.json"), JSON.stringify(questions));

  console.log(`Generated ${questions.length} questions across ${Object.keys(answers).length} chapters.`);
  console.log("  public/data/answers.json");
  console.log("  public/data/questions.json");
}

main();
