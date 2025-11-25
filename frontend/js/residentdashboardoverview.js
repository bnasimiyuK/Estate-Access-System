// residentdashboardoverview.js

// -----------------------------
// DOM Elements
// -----------------------------
const currentPaymentStatus = document.getElementById("currentPaymentStatus");
const nextPaymentDueDate = document.getElementById("nextPaymentDueDate");
const accessPrivileges = document.getElementById("accessPrivileges");

// If you plan to add a chart later
const accessChartEl = document.getElementById("accessChart");

// -----------------------------
// Fetch resident operations data
// -----------------------------
async function fetchResidentOverview() {
  try {
    // Replace with real API call if available
    // Example:
    // const response = await axios.get("/api/resident/overview");
    // const data = response.data;

    // Mock data for demonstration
    const data = {
      currentPaymentStatus: "Paid",
      nextPaymentDueDate: "2025-12-10",
      accessPrivileges: "100%"
    };

    // Update DOM
    currentPaymentStatus.textContent = data.currentPaymentStatus;
    nextPaymentDueDate.textContent = data.nextPaymentDueDate;
    accessPrivileges.textContent = data.accessPrivileges;

  } catch (error) {
    console.error("Error fetching resident overview data:", error);

    currentPaymentStatus.textContent = "Error";
    nextPaymentDueDate.textContent = "Error";
    accessPrivileges.textContent = "Error";
  }
}

// -----------------------------
// Optional: Render access chart
// -----------------------------
function renderAccessChart() {
  if (!accessChartEl) return;

  const ctx = accessChartEl.getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{
        label: "Access Attempts",
        data: [5, 7, 4, 6, 3, 8, 5],
        borderColor: "rgba(37, 99, 235, 1)",
        backgroundColor: "rgba(37, 99, 235, 0.2)",
        tension: 0.3,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: { enabled: true }
      },
      scales: {
        y: { beginAtZero: true, stepSize: 1 },
        x: { beginAtZero: true }
      }
    }
  });
}

// -----------------------------
// Initialize
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  fetchResidentOverview();
  renderAccessChart();
});
