const teacherLoginForm = document.getElementById("teacher-login-form");
const teacherMessage = document.getElementById("teacher-message");
const studentLoginForm = document.getElementById("student-login-form");
const studentAuthMessage = document.getElementById("student-auth-message");

const existingTeacherToken = localStorage.getItem("teacherToken");
const existingStudentToken = localStorage.getItem("studentToken");
if (existingTeacherToken) {
  window.location.href = "/teacher";
}
if (!existingTeacherToken && existingStudentToken) {
  window.location.href = "/student";
}

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
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

teacherLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(teacherLoginForm);
  const password = String(formData.get("password") || "").trim();

  try {
    const data = await request("/api/teacher/login", {
      method: "POST",
      body: JSON.stringify({ password })
    });

    localStorage.setItem("teacherToken", data.token);
    window.location.href = "/teacher";
  } catch (error) {
    setMessage(teacherMessage, error.message, "error");
  }
});

studentLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(studentLoginForm);
  const code = String(formData.get("code") || "").trim();

  try {
    const data = await request("/api/student/login", {
      method: "POST",
      body: JSON.stringify({ code })
    });

    localStorage.setItem("studentToken", data.token);
    window.location.href = "/student";
  } catch (error) {
    setMessage(studentAuthMessage, error.message, "error");
  }
});
