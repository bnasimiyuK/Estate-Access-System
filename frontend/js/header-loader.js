document.addEventListener("DOMContentLoaded", async () => {
  const headerContainer = document.getElementById("header");
  if (!headerContainer) return;

  const role = (localStorage.getItem("role") || "").toLowerCase();
  let headerFile = "";

  if (role === "resident") headerFile = "partials/header-residentsdashboard.html";
  else if (role === "admin") headerFile = "partials/header-adminsdashboard.html";
  else if (role === "security") headerFile = "partials/header-securitydashboard.html";
  else {
    // Redirect to login if role not found
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(headerFile);
    headerContainer.innerHTML = await res.text();

    // Initialize dropdowns or logout
    setupLogoutButton();
    setupDropdown();
  } catch (err) {
    console.error("❌ Navbar load failed:", err);
  }
});

// Dropdown for profile menu (if any)
function setupDropdown() {
  const btn = document.getElementById("profileBtn");
  const menu = document.getElementById("dropdownMenu");
  const parent = document.getElementById("profileMenu");
  if (!btn || !menu || !parent) return;

  btn.addEventListener("click", () => menu.classList.toggle("hidden"));
  document.addEventListener("click", (e) => {
    if (!parent.contains(e.target)) menu.classList.add("hidden");
  });
}

// Logout button
function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return console.warn("Logout button not found");

  logoutBtn.addEventListener("click", () => {
    if (!confirm("Are you sure you want to logout?")) return;
    localStorage.clear();
    window.location.href = "login.html";
  });
}
