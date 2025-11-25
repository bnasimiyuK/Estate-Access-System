// residentsdashboard.js
// Resident Dashboard JS

// -----------------------------
// DOM Elements
// -----------------------------
const mainContent = document.getElementById("main-content-area");
const sidebarBtns = document.querySelectorAll(".sidebarBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Dashboard cards
const paymentStatusCard = document.getElementById("paymentStatusCard");
const activeVisitorPasses = document.getElementById("activeVisitorPasses");
const lastAccessAttempts = document.getElementById("lastAccessAttempts");
const residentAlerts = document.getElementById("residentAlerts");

// -----------------------------
// Sidebar navigation
// -----------------------------
sidebarBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    loadSection(target);
    
    // Highlight active button
    sidebarBtns.forEach(b => b.classList.remove("bg-blue-600"));
    btn.classList.add("bg-blue-600");
  });
});

// -----------------------------
// Load section into main content
// -----------------------------
async function loadSection(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const html = await res.text();
    const dynamicContent = mainContent.querySelector("#dynamic-section-content");
    dynamicContent.innerHTML = html;
  } catch (error) {
    console.error(`Error: Failed to load ${url}`, error);
    const dynamicContent = mainContent.querySelector("#dynamic-section-content");
    dynamicContent.innerHTML = `<p class="text-red-500 text-center">Failed to load content.</p>`;
  }
}

// -----------------------------
// Fetch and populate dashboard cards
// -----------------------------
async function fetchDashboardCards() {
  try {
    // Replace below mock data with real API calls
    const dashboardData = {
      paymentStatus: "Paid",
      activeVisitorPasses: 3,
      lastAccessAttempts: 5,
      notifications: 1
    };

    paymentStatusCard.textContent = dashboardData.paymentStatus;
    activeVisitorPasses.textContent = dashboardData.activeVisitorPasses;
    lastAccessAttempts.textContent = dashboardData.lastAccessAttempts;
    residentAlerts.textContent = dashboardData.notifications;

  } catch (error) {
    console.error("Error fetching dashboard cards:", error);
  }
}

// -----------------------------
// Logout handler
// -----------------------------
logoutBtn.addEventListener("click", () => {
  // Clear session or token if using authentication
  localStorage.removeItem("residentToken");
  window.location.href = "/login.html"; // redirect to login page
});

// -----------------------------
// Initialize dashboard
// -----------------------------
function initDashboard() {
  fetchDashboardCards();

  // Load default section
  const firstSection = sidebarBtns[0].dataset.target;
  loadSection(firstSection);
  sidebarBtns[0].classList.add("bg-blue-600");
}

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", initDashboard);
