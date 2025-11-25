// Example data: Replace this with your API call fetching real data from backend
const gateOverridesData = [
  {
    id: 1,
    gateId: "GateA",
    action: "Override Open",
    reason: "Resident Emergency",
    userId: "admin01",
    createdAt: "2025-11-17 10:30:45"
  },
  {
    id: 2,
    gateId: "GateB",
    action: "Override Close",
    reason: "Security Alert",
    userId: "security02",
    createdAt: "2025-11-17 11:15:10"
  }
  // ... More rows
];

// Function to render table rows dynamically
function renderGateOverridesTable(data) {
  const tbody = document.querySelector("#gateOverridesTable tbody");
  tbody.innerHTML = "";  // Clear previous rows

  data.forEach(row => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.id}</td>
      <td>${row.gateId}</td>
      <td>${row.action}</td>
      <td>${row.reason}</td>
      <td>${row.userId}</td>
      <td>${row.createdAt}</td>
    `;

    tbody.appendChild(tr);
  });
}

// Simulate fetching data and rendering on page load
document.addEventListener("DOMContentLoaded", () => {
  // In real app, replace this with fetch/AJAX call to your API endpoint
  renderGateOverridesTable(gateOverridesData);
});
