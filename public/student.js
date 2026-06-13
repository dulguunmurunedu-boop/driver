const token = localStorage.getItem("studentToken") || "";
const studentName = document.getElementById("student-name");
const studentExpiry = document.getElementById("student-expiry");
const dashboardMessage = document.getElementById("dashboard-message");
const groupGrid = document.getElementById("group-grid");
const logoutButton = document.getElementById("logout-button");

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

function renderGroups(groups) {
  groupGrid.innerHTML = groups
    .map(
      (group) => `
        <article class="group-card ${group.available ? "group-card-active" : "group-card-locked"}">
          <div class="group-card-head">
            <span class="quiz-number">${group.title}</span>
            <span class="status-chip ${group.available ? "status-live" : "status-soon"}">
              ${group.available ? "Нээлттэй" : "Тун удахгүй"}
            </span>
          </div>
          <h3>${group.title}</h3>
          <p>${group.description}</p>
          <div class="group-card-footer">
            <span>${group.quizCount} асуулт</span>
            ${
              group.available
                ? `<a class="card-link" href="/quiz?group=${group.id}">Эхлэх</a>`
                : `<span class="card-link disabled">Хаалттай</span>`
            }
          </div>
        </article>
      `
    )
    .join("");
}

function formatAvailableGroups(groups) {
  const availableTitles = groups.filter((group) => group.available).map((group) => group.title);
  if (!availableTitles.length) {
    return "Бүлгийн жагсаалт бэлэн боллоо.";
  }
  return `${availableTitles.join(", ")} нээлттэй байна.`;
}

async function init() {
  if (!token) {
    window.location.href = "/";
    return;
  }

  try {
    const [me, groupsData] = await Promise.all([
      request("/api/student/me"),
      request("/api/quiz-groups")
    ]);

    studentName.textContent = me.student.name;
    studentExpiry.textContent = formatDate(me.student.expiresAt);
    renderGroups(groupsData.groups);
    setMessage(dashboardMessage, formatAvailableGroups(groupsData.groups), "success");
  } catch (error) {
    localStorage.removeItem("studentToken");
    setMessage(dashboardMessage, error.message, "error");
    setTimeout(() => {
      window.location.href = "/";
    }, 800);
  }
}

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("studentToken");
  window.location.href = "/";
});

init();
