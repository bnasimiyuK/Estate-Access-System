// js/navbar.js
document.addEventListener("DOMContentLoaded", async () => {
  const headerContainer = document.getElementById("header");
  if (!headerContainer) return;

  // ✅ role is already normalized to lowercase
  const role = localStorage.getItem("role") || "";
  let headerFile = "";

  if (role === "admin") headerFile = "partials/header-adminsdashboard.html";
  else if (role === "resident") headerFile = "partials/header-residentsdashboard.html";
  else if (role === "security") headerFile = "partials/header-securitydashboard.html";

  if (!headerFile) {
    console.warn("No header available for role:", role);
    return;
  }

  try {
    const res = await fetch(headerFile);
    if (!res.ok) throw new Error("Header file not found");
    headerContainer.innerHTML = await res.text();

    setupDropdown();
    setupLogoutButton();
  } catch (err) {
    console.error("❌ Navbar load failed:", err);
  }
});

/* ======================================================
   🔽 Profile Dropdown + Logout
====================================================== */
function setupDropdown() {
  const btn = document.getElementById("profileBtn");
  const menu = document.getElementById("dropdownMenu");
  const parent = document.getElementById("profileMenu");

  if (!btn || !menu) return;

  btn.addEventListener("click", () => menu.classList.toggle("hidden"));
  document.addEventListener("click", (e) => {
    if (!parent.contains(e.target)) menu.classList.add("hidden");
  });

  const usernameDisplay = document.getElementById("usernameDisplay");
  const username = localStorage.getItem("fullName") || localStorage.getItem("username") || "User";
  if (usernameDisplay) usernameDisplay.textContent = username;
}

function setupLogoutButton() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (confirm("Are you sure you want to log out?")) {
      localStorage.clear();
      window.location.href = "login.html";
    }
  });
}
