const teacherToken = localStorage.getItem("teacherToken") || "";
const createForm = document.getElementById("teacher-create-form");
const createMessage = document.getElementById("teacher-create-message");
const dashboardMessage = document.getElementById("teacher-dashboard-message");
const refreshButton = document.getElementById("teacher-refresh-button");
const logoutButton = document.getElementById("teacher-logout-button");
const studentGrid = document.getElementById("teacher-student-grid");
const statStudents = document.getElementById("stat-students");
const statActiveSessions = document.getElementById("stat-active-sessions");
const statActiveChapters = document.getElementById("stat-active-chapters");

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}

function formatDate(dateString) {
  if (!dateString) {
    return "-";
  }

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
      Authorization: `Bearer ${teacherToken}`,
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

function renderStudents(students) {
  if (!students.length) {
    studentGrid.innerHTML = `<div class="student-list empty">Сурагчийн дата алга байна.</div>`;
    return;
  }

  studentGrid.innerHTML = students
    .map((student) => {
      const chapters = student.chapters.length
        ? student.chapters
            .map(
              (chapter) => `
                <article class="chapter-pill">
                  <strong>${chapter.title}</strong>
                  <span>Сүүлд нээсэн: ${formatDate(chapter.lastOpenedAt)}</span>
                  <span>Сүүлд шалгасан: ${formatDate(chapter.lastSubmittedAt)}</span>
                  <span>Оролдлого: ${chapter.attempts}</span>
                  <span>Сүүлийн оноо: ${chapter.lastScore ?? "-"}/${chapter.totalQuestions || "-"}</span>
                  <span>Шилдэг оноо: ${chapter.bestScore ?? "-"}/${chapter.totalQuestions || "-"}</span>
                  ${
                    chapter.attemptHistory.length
                      ? `
                        <div class="attempt-history">
                          ${chapter.attemptHistory
                            .map(
                              (attempt, index) => `
                                <article class="attempt-card">
                                  <strong>${chapter.title} тест - ${index + 1}-р оролдлого</strong>
                                  <span>Шалгасан: ${formatDate(attempt.createdAt)}</span>
                                  <span>Оноо: ${attempt.score}/${attempt.total}</span>
                                  <span>Алдсан: ${attempt.wrongCount}</span>
                                  <span>Алдсан асуултууд: ${attempt.wrongQuestionIds.length ? attempt.wrongQuestionIds.join(", ") : "Алдаагүй"}</span>
                                </article>
                              `
                            )
                            .join("")}
                        </div>
                      `
                      : `<span>Энэ бүлгийн нарийвчилсан шалгалтын түүх одоогоор алга.</span>`
                  }
                </article>
              `
            )
            .join("")
        : `<span class="meta-label">Одоогоор бүлэг эхлээгүй.</span>`;

      const activity = student.recentActivity.length
        ? student.recentActivity
            .map(
              (item) => `
                <li>
                  <strong>${item.summary}</strong>
                  <span>${formatDate(item.createdAt)}</span>
                </li>
              `
            )
            .join("")
        : `<li><span>Activity алга байна.</span></li>`;

      return `
        <details class="teacher-student-card">
          <summary class="teacher-student-summary">
            <div>
              <span class="meta-label">Сурагч</span>
              <h3>${student.name}</h3>
              <strong class="student-id-inline">${student.code}</strong>
            </div>
            <div class="teacher-summary-side">
              <span class="status-chip ${
                student.revokedAt ? "status-danger" : student.activeSession ? "status-live" : "status-soon"
              }">
                ${student.revokedAt ? "Цуцлагдсан" : student.activeSession ? "Онлайн" : "Оффлайн"}
              </span>
              <span class="meta-label">Сүүлд нэвтэрсэн: ${formatDate(student.lastLoginAt)}</span>
            </div>
          </summary>

          <div class="teacher-student-meta">
            <div><span class="meta-label">Special ID</span><strong>${student.code}</strong></div>
            <div><span class="meta-label">Нэр</span><strong>${student.name}</strong></div>
            <div><span class="meta-label">Үүсгэсэн</span><strong>${formatDate(student.createdAt)}</strong></div>
            <div><span class="meta-label">Access дуусах</span><strong>${formatDate(student.expiresAt)}</strong></div>
            <div><span class="meta-label">Эрхийн төлөв</span><strong>${student.revokedAt ? `Цуцлагдсан (${formatDate(student.revokedAt)})` : "Идэвхтэй"}</strong></div>
            <div><span class="meta-label">Сүүлд нэвтэрсэн</span><strong>${formatDate(student.lastLoginAt)}</strong></div>
            <div><span class="meta-label">Сүүлд activity</span><strong>${formatDate(student.lastActivityAt)}</strong></div>
          </div>

          <div class="teacher-action-row">
            <button
              class="ghost-button"
              type="button"
              data-action="revoke"
              data-student-id="${student.id}"
              ${student.revokedAt ? "disabled" : ""}
            >
              ${student.revokedAt ? "Эрх цуцлагдсан" : "Эрх цуцлах"}
            </button>
            <button
              class="danger-button"
              type="button"
              data-action="delete"
              data-student-id="${student.id}"
              data-student-name="${student.name}"
            >
              Устгах
            </button>
          </div>

          <div class="teacher-section-block">
            <h4>Бүлгийн явц ба тестийн түүх</h4>
            <div class="chapter-pill-list">${chapters}</div>
          </div>

          <div class="teacher-section-block">
            <h4>Сүүлийн activity</h4>
            <ul class="activity-list">${activity}</ul>
          </div>
        </details>
      `;
    })
    .join("");
}

async function loadDashboard() {
  const data = await request("/api/teacher/dashboard");
  statStudents.textContent = String(data.stats.studentCount);
  statActiveSessions.textContent = String(data.stats.activeSessionCount);
  statActiveChapters.textContent = String(data.stats.activeChapterCount);
  renderStudents(data.students);
  setMessage(dashboardMessage, "Сурагчдын дата амжилттай шинэчлэгдлээ.", "success");
}

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(createForm);
  const name = String(formData.get("name") || "").trim();

  try {
    const data = await request("/api/teacher/students", {
      method: "POST",
      body: JSON.stringify({ name })
    });

    setMessage(
      createMessage,
      `Амжилттай үүслээ.\nСурагч: ${data.student.name}\nSpecial ID: ${data.student.code}\nХүчинтэй хугацаа: ${formatDate(data.student.expiresAt)}`,
      "success"
    );
    createForm.reset();
    await loadDashboard();
  } catch (error) {
    setMessage(createMessage, error.message, "error");
  }
});

refreshButton.addEventListener("click", async () => {
  try {
    await loadDashboard();
  } catch (error) {
    setMessage(dashboardMessage, error.message, "error");
  }
});

studentGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const studentId = button.dataset.studentId;
  const studentName = button.dataset.studentName || "энэ сурагч";
  if (!studentId) {
    return;
  }

  try {
    if (action === "revoke") {
      const confirmed = window.confirm("Энэ сурагчийн access-ийг цуцлах уу?");
      if (!confirmed) {
        return;
      }

      await request(`/api/teacher/students/${studentId}/revoke`, {
        method: "POST"
      });
      setMessage(dashboardMessage, "Сурагчийн access амжилттай цуцлагдлаа.", "success");
      await loadDashboard();
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(`${studentName} сурагчийн ID болон бүх мэдээллийг бүр мөсөн устгах уу?`);
      if (!confirmed) {
        return;
      }

      await request(`/api/teacher/students/${studentId}`, {
        method: "DELETE"
      });
      setMessage(dashboardMessage, "Сурагчийн мэдээлэл амжилттай устгагдлаа.", "success");
      await loadDashboard();
    }
  } catch (error) {
    setMessage(dashboardMessage, error.message, "error");
  }
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("teacherToken");
  window.location.href = "/";
});

async function init() {
  if (!teacherToken) {
    window.location.href = "/";
    return;
  }

  try {
    await request("/api/teacher/me");
    await loadDashboard();
  } catch (error) {
    localStorage.removeItem("teacherToken");
    setMessage(dashboardMessage, error.message, "error");
    setTimeout(() => {
      window.location.href = "/";
    }, 800);
  }
}

init();
