// residentsdashboard.js
// --------------------
// Handles dynamic content loading, sidebar navigation, and card updates

const mainContent = document.getElementById("dynamic-section-content");
const sidebarBtns = document.querySelectorAll(".sidebarBtn");

// Dashboard cards
const paymentStatusCard = document.getElementById("paymentStatusCard");
const activeVisitorPasses = document.getElementById("activeVisitorPasses");
const lastAccessAttempts = document.getElementById("lastAccessAttempts");
const residentAlerts = document.getElementById("residentAlerts");

// Load default dashboard overview on page load
document.addEventListener("DOMContentLoaded", () => {
  loadSection("sections/resident-overview.html");
  fetchDashboardCards();
});

// Sidebar button click event
sidebarBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    loadSection(target);

    // Highlight active button
    sidebarBtns.forEach(b => b.classList.remove("bg-blue-600", "shadow-inner"));
    btn.classList.add("bg-blue-600", "shadow-inner");
  });
});

// Function to load section HTML dynamically
async function loadSection(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    const html = await response.text();
    mainContent.innerHTML = html;
  } catch (error) {
    mainContent.innerHTML = `<p class="text-red-600 text-center font-semibold">Error loading section: ${error.message}</p>`;
    console.error(error);
  }
}

// Function to fetch and update dashboard cards
async function fetchDashboardCards() {
  try {
    // Replace these endpoints with your actual API
    const [paymentRes, visitorRes, accessRes, alertsRes] = await Promise.all([
      axios.get("/api/resident/payment-status"),
      axios.get("/api/resident/active-visitor-passes"),
      axios.get("/api/resident/last-access-attempts"),
      axios.get("/api/resident/notifications")
    ]);

    paymentStatusCard.textContent = paymentRes.data.status || "N/A";
    activeVisitorPasses.textContent = visitorRes.data.count || 0;
    lastAccessAttempts.textContent = accessRes.data.count || 0;
    residentAlerts.textContent = alertsRes.data.count || 0;
  } catch (error) {
    console.error("Error fetching dashboard cards:", error);
  }
}

// Logout button
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("residentToken"); // Assuming token is stored here
  window.location.href = "/login.html";
});
