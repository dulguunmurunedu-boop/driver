const token = localStorage.getItem("studentToken") || "";
const params = new URLSearchParams(window.location.search);
const groupId = params.get("group") || "chapter-1";

const pageTitle = document.getElementById("quiz-page-title");
const pageDescription = document.getElementById("quiz-page-description");
const studentName = document.getElementById("quiz-student-name");
const studentExpiry = document.getElementById("quiz-student-expiry");
const quizMessage = document.getElementById("quiz-message");
const quizForm = document.getElementById("quiz-form");
const submitQuizButton = document.getElementById("submit-quiz");
const quizResult = document.getElementById("quiz-result");
let currentQuizzes = [];

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

function renderQuizzes(quizzes) {
  quizForm.innerHTML = quizzes
    .map(
      (quiz) => `
        <article class="quiz-card" data-quiz-id="${quiz.id}">
          <div class="quiz-label-row">
            <span class="quiz-number">${quiz.id}</span>
          </div>
          <h4>${quiz.question}</h4>
          ${quiz.illustration ? `<img class="quiz-illustration" src="${quiz.illustration}" alt="${quiz.id} дүрслэл" />` : ""}
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
      groupId === "chapter-1" && review.explanation
        ? `<p><strong>Тайлбар:</strong> ${review.explanation}</p>`
        : "";

    feedback.innerHTML = `
      <p><strong>${review.correct ? "Зөв хариуллаа." : "Буруу хариуллаа."}</strong></p>
      <p><strong>Зөв хариулт:</strong> ${review.answerText}</p>
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

    studentName.textContent = me.student.name;
    studentExpiry.textContent = formatDate(me.student.expiresAt);
    pageTitle.textContent = quizData.activeGroup.title;
    pageDescription.textContent = quizData.activeGroup.description;

    if (!quizData.quizzes.length) {
      quizForm.innerHTML = "";
      submitQuizButton.disabled = true;
      setMessage(quizMessage, "Энэ бүлгийн асуултууд одоогоор бэлэн болоогүй байна.", "error");
      return;
    }

    currentQuizzes = quizData.quizzes;
    renderQuizzes(currentQuizzes);
    setMessage(quizMessage, `${quizData.activeGroup.quizCount} асуулт бэлэн байна.`, "success");
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

init();
