const token = localStorage.getItem("studentToken") || "";
const params = new URLSearchParams(window.location.search);
const groupId = params.get("group") || "card-01";

const pageTitle = document.getElementById("quiz-page-title");
const pageDescription = document.getElementById("quiz-page-description");
const studentName = document.getElementById("quiz-student-name");
const studentExpiry = document.getElementById("quiz-student-expiry");
const quizMessage = document.getElementById("quiz-message");
const quizForm = document.getElementById("quiz-form");
const submitQuizButton = document.getElementById("submit-quiz");
const quizResult = document.getElementById("quiz-result");
const securityWatermark = document.getElementById("security-watermark");
let currentQuizzes = [];
let currentStudent = null;
const securityEventThrottle = new Map();

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Алдаа гарлаа.");
  }
  return data;
}

function escapeSvgText(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function updateWatermark() {
  if (!currentStudent || !securityWatermark) {
    return;
  }

  const timestamp = formatDate(new Date().toISOString());
  const lineOne = `${currentStudent.name} • ${currentStudent.code}`;
  const lineTwo = `${groupId} • ${timestamp}`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="220">
      <g transform="rotate(-24 180 110)">
        <text x="20" y="100" fill="white" fill-opacity="0.95" font-size="20" font-family="Segoe UI, sans-serif">${escapeSvgText(lineOne)}</text>
        <text x="20" y="132" fill="white" fill-opacity="0.82" font-size="16" font-family="Segoe UI, sans-serif">${escapeSvgText(lineTwo)}</text>
      </g>
    </svg>
  `;
  securityWatermark.style.setProperty(
    "--watermark-image",
    `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  );
}

async function logSecurityEvent(type, summary) {
  const throttleKey = `${type}:${summary}`;
  const now = Date.now();
  const lastSent = securityEventThrottle.get(throttleKey) || 0;
  if (now - lastSent < 10000) {
    return;
  }

  securityEventThrottle.set(throttleKey, now);
  try {
    await request("/api/student/security-event", {
      method: "POST",
      body: JSON.stringify({
        type,
        summary,
        groupId
      })
    });
  } catch (error) {
    console.error("Security event log failed:", error.message);
  }
}

function registerSecurityGuards() {
  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    logSecurityEvent("contextmenu", "Right click хийхийг оролдсон");
  });

  document.addEventListener("copy", () => {
    logSecurityEvent("copy", "Хуулах үйлдэл хийсэн");
  });

  document.addEventListener("cut", () => {
    logSecurityEvent("cut", "Cut хийх үйлдэл хийсэн");
  });

  document.addEventListener("paste", () => {
    logSecurityEvent("paste", "Paste хийх үйлдэл хийсэн");
  });

  window.addEventListener("blur", () => {
    logSecurityEvent("window_blur", "Browser цонхноос гарсан");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      logSecurityEvent("visibility_change", "Tab солих эсвэл page нуусан");
    }
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "printscreen") {
      logSecurityEvent("printscreen", "PrintScreen товч дарсан");
    }
    if ((event.ctrlKey || event.metaKey) && key === "p") {
      event.preventDefault();
      logSecurityEvent("print_shortcut", "Print shortcut ашиглахыг оролдсон");
    }
    if ((event.ctrlKey || event.metaKey) && key === "s") {
      event.preventDefault();
      logSecurityEvent("save_shortcut", "Save shortcut ашиглахыг оролдсон");
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && (key === "s" || key === "4")) {
      logSecurityEvent("screenshot_shortcut", "Screenshot shortcut ашиглахыг оролдсон");
    }
  });

  window.addEventListener("beforeprint", () => {
    logSecurityEvent("beforeprint", "Print dialog нээсэн");
  });
}

function openImageModal(src) {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("image-modal-img");
  if (modal && modalImg) {
    modal.style.display = "flex";
    modalImg.src = src;
  }
}

function closeImageModal() {
  const modal = document.getElementById("image-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function renderQuizzes(quizzes) {
  quizForm.innerHTML = quizzes
    .map(
      (quiz) => `
        <article class="quiz-card" data-quiz-id="${quiz.id}">
          <div class="quiz-label-row">
            <span class="quiz-number">${quiz.id}</span>
          </div>
          <h4>${quiz.question}</h4>
          ${quiz.illustration ? `<img class="quiz-illustration" src="${quiz.illustration}" alt="${quiz.id} дүрслэл" onclick="openImageModal('${quiz.illustration}')" style="cursor:pointer;" title="Дарж том харна уу" />` : ""}
          <div class="option-list">
            ${quiz.options
              .map(
                (option, optionIndex) => `
                  <label class="option" data-option-index="${optionIndex}">
                    <input type="radio" name="quiz-${quiz.id}" value="${optionIndex}" />
                    <span>${option}</span>
                  </label>
                `
              )
              .join("")}
          </div>
          <div class="quiz-feedback" hidden></div>
        </article>
      `
    )
    .join("");
}

function renderAnswerReview(results) {
  const resultMap = new Map(results.map((result) => [result.id, result]));

  Array.from(quizForm.querySelectorAll(".quiz-card")).forEach((card) => {
    const quizId = card.dataset.quizId;
    const review = resultMap.get(quizId);
    const quiz = currentQuizzes.find((item) => item.id === quizId);
    const feedback = card.querySelector(".quiz-feedback");

    card.classList.remove("quiz-card-correct", "quiz-card-wrong");
    if (!review || !quiz) {
      feedback.hidden = true;
      feedback.innerHTML = "";
      return;
    }

    card.classList.add(review.correct ? "quiz-card-correct" : "quiz-card-wrong");

    Array.from(card.querySelectorAll(".option")).forEach((optionLabel) => {
      const optionIndex = Number(optionLabel.dataset.optionIndex);
      optionLabel.classList.remove("option-correct", "option-wrong");

      if (optionIndex === review.answer) {
        optionLabel.classList.add("option-correct");
      }

      if (!review.correct && optionIndex === review.selected) {
        optionLabel.classList.add("option-wrong");
      }
    });

    const explanationHtml =
      review.answerText
        ? `<p><strong>Зөв хариулт:</strong> ${review.answerText}</p>`
        : "";

    feedback.innerHTML = `
      <p><strong>${review.correct ? "Зөв хариуллаа." : "Буруу хариуллаа."}</strong></p>
      ${explanationHtml}
    `;
    feedback.hidden = false;
  });
}

function collectAnswers() {
  return Array.from(quizForm.querySelectorAll(".quiz-card")).map((card) => {
    const id = card.dataset.quizId;
    const selectedInput = card.querySelector("input:checked");
    return {
      id,
      selected: selectedInput ? Number(selectedInput.value) : null
    };
  });
}

async function init() {
  if (!token) {
    window.location.href = "/";
    return;
  }

  try {
    const [me, quizData] = await Promise.all([
      request("/api/student/me"),
      request(`/api/quizzes?group=${encodeURIComponent(groupId)}`)
    ]);

    currentStudent = me.student;
    studentName.textContent = me.student.name;
    studentExpiry.textContent = formatDate(me.student.expiresAt);
    pageTitle.textContent = quizData.activeGroup.title;
    pageDescription.textContent = quizData.activeGroup.description;
    updateWatermark();

    if (!quizData.quizzes.length) {
      quizForm.innerHTML = "";
      submitQuizButton.disabled = true;
      setMessage(quizMessage, "Энэ бүлгийн асуултууд одоогоор бэлэн болоогүй байна.", "error");
      return;
    }

    currentQuizzes = quizData.quizzes;
    renderQuizzes(currentQuizzes);
    setMessage(quizMessage, `${quizData.activeGroup.quizCount} асуулт бэлэн байна. Зураг дээр дарж том харна уу.`, "success");
  } catch (error) {
    setMessage(quizMessage, error.message, "error");
  }
}

submitQuizButton.addEventListener("click", async () => {
  try {
    const data = await request("/api/quizzes/submit", {
      method: "POST",
      body: JSON.stringify({
        groupId,
        answers: collectAnswers()
      })
    });

    const percentage = Math.round((data.score / data.total) * 100);
    setMessage(
      quizResult,
      `${data.group.title} оноо: ${data.score}/${data.total}\nХувь: ${percentage}%`,
      "success"
    );
    renderAnswerReview(data.results);
  } catch (error) {
    setMessage(quizResult, error.message, "error");
  }
});

registerSecurityGuards();
setInterval(updateWatermark, 60000);
init();
