// public/js/accesslogs.js

const API_HOST = "http://localhost:4050";  // adjust if needed
const token = localStorage.getItem("token"); // Admin JWT

async function loadAccessLogs() {
  try {
    const response = await fetch(`${API_HOST}/api/access/logs`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error("Failed to fetch logs");

    const logs = await response.json();
    renderLogs(logs);
  } catch (error) {
    console.error("Error loading logs:", error);
  }
}

function renderLogs(data) {
  const tbody = document.getElementById("logsTableBody");
  tbody.innerHTML = "";

  data.forEach((log, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${log.timestamp}</td>
      <td>${log.userId || "—"}</td>
      <td>${log.action}</td>
      <td>${log.resource}</td>
      <td>${log.ipAddress}</td>
      <td>${log.userAgent}</td>
      <td>${log.logType}</td>
    `;

    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", loadAccessLogs);
