// login.js
console.log("🚀 login.js loaded");

const API_BASE = "http://localhost:4050/api/auth";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const msg = document.getElementById("msg");

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (msg) msg.textContent = "";

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!email || !password) {
      if (msg) msg.textContent = "Email & Password are required";
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: email, Password: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (msg) msg.textContent = data.error || "Login failed";
        return;
      }

      // Save token & role & other details in localStorage
      const token = data.accessToken;
      const role = data.role.toLowerCase();

      localStorage.setItem("accessToken", token); // ✅ used in dashboard
      localStorage.setItem("role", role);
      localStorage.setItem("fullName", data.fullName || email);

      // 🛑 Save the resident phone number if available
      if (data.phone) {
        localStorage.setItem("residentPhone", data.phone);
      }

      // Redirect based on role
      switch (role) {
        case "resident":
          window.location.href = "residentsdashboard.html";
          break;
        case "security":
          window.location.href = "securitydashboard.html";
          break;
        case "admin":
          window.location.href = "adminsdashboard.html";
          break;
        default:
          alert("Unknown role. Contact admin.");
          window.location.href = "login.html";
      }

    } catch (err) {
      console.error("Login error:", err);
      if (msg) msg.textContent = "Server error. Try again later.";
    }
  });
});
