// residentsdashboard.js

// -----------------------------
// DOM Elements
// -----------------------------
const mainContent = document.getElementById("main-content-area");
const dynamicContent = document.getElementById("dynamic-section-content");
const sidebarBtns = document.querySelectorAll(".sidebarBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Dashboard cards
const paymentStatusCard = document.getElementById("paymentStatusCard");
const activeVisitorPasses = document.getElementById("activeVisitorPasses");
const lastAccessAttempts = document.getElementById("lastAccessAttempts");

// -----------------------------
// Sidebar Navigation
// -----------------------------
sidebarBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    loadSection(target);

    // Highlight active sidebar button
    sidebarBtns.forEach(b => b.classList.remove("bg-blue-600"));
    btn.classList.add("bg-blue-600");
  });
});

// -----------------------------
// Load section HTML dynamically
// -----------------------------
async function loadSection(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const html = await res.text();

    // Replace only the dynamic section content
    dynamicContent.innerHTML = html;
  } catch (error) {
    console.error(`Error: Failed to load ${url}`, error);
    dynamicContent.innerHTML = `<p class="text-red-500 text-center">Failed to load content.</p>`;
  }
}

// -----------------------------
// Fetch & update dashboard cards
// -----------------------------
async function fetchDashboardCards() {
  try {
    // TODO: Replace mock data with API calls
    const data = {
      paymentStatus: "Paid",
      activeVisitorPasses: 3,
      lastAccessAttempts: 5
    };

    paymentStatusCard.textContent = data.paymentStatus;
    activeVisitorPasses.textContent = data.activeVisitorPasses;
    lastAccessAttempts.textContent = data.lastAccessAttempts;
  } catch (error) {
    console.error("Error fetching dashboard cards:", error);
  }
}

// -----------------------------
// Logout handler
// -----------------------------
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("residentToken"); // remove session token if any
  window.location.href = "/login.html"; // redirect to login page
});

// -----------------------------
// Initialize dashboard
// -----------------------------
function initDashboard() {
  fetchDashboardCards();

  // Load default section (first sidebar button)
  const firstSectionBtn = sidebarBtns[0];
  const firstSection = firstSectionBtn.dataset.target;
  loadSection(firstSection);
  firstSectionBtn.classList.add("bg-blue-600");
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initDashboard);
