document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const msg = document.getElementById("msg");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const Email = document.getElementById("email").value.trim();
    const Password = document.getElementById("password").value.trim();

    if (!Email || !Password) {
      msg.textContent = "Email & Password required";
      return;
    }

    try {
      const res = await fetch("http://localhost:4050/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email, Password }),
      });

      const data = await res.json();

      if (!res.ok) {
        msg.textContent = data.error || "Login failed";
        return;
      }

      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("role", data.role);
      localStorage.setItem("roleId", data.roleId);
      localStorage.setItem("fullName", data.fullName);

      switch (data.role.toLowerCase()) {
        case "admin": window.location.href = "/adminsdashboard.html"; break;
        case "resident": window.location.href = "/residentsdashboard.html"; break;
        case "security": window.location.href = "/securitydashboard.html"; break;
        default: window.location.href = "/index.html";
      }

    } catch (err) {
      console.error(err);
      msg.textContent = "Server error";
    }
  });
});
const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    const contentContainer = document.getElementById('contentContainer');

    sidebarBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const file = btn.dataset.file;
        try {
          const res = await fetch(file);
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          const html = await res.text();
          contentContainer.innerHTML = html;

          // Highlight active button
          sidebarBtns.forEach(b => b.classList.remove('bg-blue-700'));
          btn.classList.add('bg-blue-700');
        } catch (err) {
          contentContainer.innerHTML = `<p class="text-red-500">Failed to load file: ${err.message}</p>`;
          console.error('File load error:', err);
        }
      });
    });

    // Load first section by default
    if (sidebarBtns[0]) {
      fetch(sidebarBtns[0].dataset.file)
        .then(res => res.text())
        .then(html => (contentContainer.innerHTML = html))
        .catch(err => console.error('Initial load error:', err));
      sidebarBtns[0].classList.add('bg-blue-700');
    }

import {
  validateNationalID,
  validatePhone,
  validateEmail,
  validateRequired,
  showFormError,
  clearFormError
} from "./validation.js";
