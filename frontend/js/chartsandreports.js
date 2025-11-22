document.addEventListener("DOMContentLoaded", () => {
  loadDashboardData();
});

async function loadDashboardData() {
  try {
    // Replace URLs below with your backend API endpoints
    const [
      paymentDataRes,
      accessLogsRes,
      visitorPassesRes,
      overridesRes,
      summaryRes
    ] = await Promise.all([
      axios.get("http://localhost:4050/api/payment-status"),
      axios.get("http://localhost:4050/api/access-logs-summary"),
      axios.get("http://localhost:4050/api/visitor-passes-status"),
      axios.get("http://localhost:4050/api/manual-overrides-summary"),
      axios.get("http://localhost:4050/api/summary-metrics")
    ]);

    renderPaymentStatusChart(paymentDataRes.data);
    renderAccessAttemptsChart(accessLogsRes.data);
    renderVisitorPassesChart(visitorPassesRes.data);
    renderManualOverridesChart(overridesRes.data);
    renderSummaryTable(summaryRes.data);

  } catch (error) {
    console.error("Error loading dashboard data:", error);
    alert("Failed to load dashboard data. Check console for details.");
  }
}

// Payment Status: { paid: x, pending: y, overdue: z }
function renderPaymentStatusChart(data) {
  const ctx = document.getElementById("paymentStatusChart").getContext("2d");
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Paid", "Pending", "Overdue"],
      datasets: [{
        data: [data.paid, data.pending, data.overdue],
        backgroundColor: ["#22c55e", "#facc15", "#ef4444"],
      }]
    }
  });
}

// Access Attempts: { success: x, denied: y }
function renderAccessAttemptsChart(data) {
  const ctx = document.getElementById("accessAttemptsChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Success", "Denied"],
      datasets: [{
        label: "Access Attempts",
        data: [data.success, data.denied],
        backgroundColor: ["#3b82f6", "#ef4444"]
      }]
    },
    options: {
      scales: { y: { beginAtZero: true } }
    }
  });
}

// Visitor Passes: { active: x, expired: y, revoked: z }
function renderVisitorPassesChart(data) {
  const ctx = document.getElementById("visitorPassesChart").getContext("2d");
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Active", "Expired", "Revoked"],
      datasets: [{
        data: [data.active, data.expired, data.revoked],
        backgroundColor: ["#2563eb", "#6b7280", "#dc2626"]
      }]
    }
  });
}

// Manual Overrides: { approve: x, reject: y }
function renderManualOverridesChart(data) {
  const ctx = document.getElementById("manualOverridesChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Approved", "Rejected"],
      datasets: [{
        label: "Overrides",
        data: [data.approve, data.reject],
        backgroundColor: ["#22c55e", "#ef4444"]
      }]
    },
    options: {
      scales: { y: { beginAtZero: true } }
    }
  });
}

// Summary Table expects an array like [{ metric: "Total Residents", value: 1000 }, ...]
function renderSummaryTable(data) {
  const tbody = document.getElementById("summaryTableBody");
  tbody.innerHTML = "";
  data.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border px-4 py-2 font-semibold">${item.metric}</td>
      <td class="border px-4 py-2">${item.value}</td>
    `;
    tbody.appendChild(row);
  });
}
