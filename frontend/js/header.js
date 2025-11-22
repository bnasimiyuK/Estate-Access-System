document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("userRole");
  const username = localStorage.getItem("username");

  const profileMenu = document.getElementById("profileMenu");
  const loginLink = document.getElementById("loginLink");
  const adminLink = document.getElementById("adminLink");

  // 🟢 Show/hide profile and login
  if (token) {
    profileMenu.classList.remove("hidden");
    loginLink.classList.add("hidden");

    if (username) {
      document.getElementById("usernameDisplay").textContent = username;
    }

    // 👑 Show admin link if userRole is "Admin"
    if (role && role.toLowerCase() === "admin") {
      adminLink.classList.remove("hidden");
    }
  }

  // 🔽 Dropdown toggle
  const profileBtn = document.getElementById("profileBtn");
  const dropdown = document.getElementById("profileDropdown");
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });

  // ❌ Close dropdown when clicking outside
  document.addEventListener("click", () => dropdown.classList.add("hidden"));

  // 🚪 Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("username");
    localStorage.removeItem("residentStatus");
    window.location.href = "login.html";
  });
});