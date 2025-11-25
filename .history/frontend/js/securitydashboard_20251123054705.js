// ========================
// GLOBAL SETTINGS
// ========================
const API_HOST = "http://localhost:4050";
const token = localStorage.getItem("token");

// ========================
// TAB SWITCHING
// ========================
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tabBtn");
  const tabContents = document.querySelectorAll(".tabContent");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabContents.forEach(tab => tab.classList.add("hidden"));
      document.getElementById(btn.dataset.tab).classList.remove("hidden");
    });
  });

  // Load default tab content
  loadAccessLogs();
  loadVisitorRequests();
  loadCharts();
});


// ========================
// LOAD ACCESS LOGS (BACKEND)
// ========================
async function loadAccessLogs() {
  try {
    const response = await fetch(`${API_HOST}/api/access/logs`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Failed to fetch access logs");

    const logs = await response.json();
    renderAccessLogs(logs);

  } catch (err) {
    console.error("Access Log Error:", err);
  }
}

function renderAccessLogs(logs) {
  const tbody = document.getElementById("logsTableBody");
  tbody.innerHTML = "";

  logs.forEach((log, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="p-2 border">${new Date(log.timestamp).toLocaleString()}</td>
      <td class="p-2 border">${log.userId || "—"}</td>
      <td class="p-2 border">${log.action}</td>
      <td class="p-2 border">${log.logType}</td>
    `;

    tbody.appendChild(tr);
  });
}


// ========================
// LOAD VISITOR REQUESTS (BACKEND)
// ========================
async function loadVisitorRequests() {
  try {
    const response = await fetch(`${API_HOST}/api/visitors/pending`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const visitors = await response.json();
    renderVisitorRequests(visitors);

  } catch (err) {
    console.error("Visitor Requests Error:", err);
  }
}

function renderVisitorRequests(visitors) {
  const container = document.getElementById("visitorRequestList");
  container.innerHTML = "";

  visitors.forEach(req => {
    const div = document.createElement("div");
    div.className =
      "p-2 border rounded flex justify-between items-center bg-white";

    div.innerHTML = `
      <span>${req.visitorName} (ID: ${req.visitorId}) → Resident ${req.residentId}</span>
      <div>
        <button class="approveBtn bg-green-600 text-white px-2 py-1 rounded mr-2">Approve</button>
        <button class="rejectBtn bg-red-600 text-white px-2 py-1 rounded">Reject</button>
      </div>
    `;

    // Approve
    div.querySelector(".approveBtn").addEventListener("click", async () => {
      await fetch(`${API_HOST}/api/visitors/approve/${req.visitorId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      loadVisitorRequests();
      loadAccessLogs();
    });

    // Reject
    div.querySelector(".rejectBtn").addEventListener("click", async () => {
      await fetch(`${API_HOST}/api/visitors/reject/${req.visitorId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      loadVisitorRequests();
      loadAccessLogs();
    });

    container.appendChild(div);
  });
}


// ========================
// MANUAL GATE CONTROL
// ========================
document.getElementById("openGateBtn").addEventListener("click", async () => {
  const residentId = document.getElementById("gateResidentId").value;
  const visitorId = document.getElementById("gateVisitorId").value;

  const target = visitorId || residentId;

  document.getElementById("gateStatus").innerText =
    `Gate manually opened for ${target}`;

  await fetch(`${API_HOST}/api/access/manual-open`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ residentId, visitorId })
  });

  loadAccessLogs();
});


// ========================
// CHARTS
// ========================
function loadCharts() {
  const dailyCtx = document.getElementById("dailyAccessChart").getContext("2d");
  new Chart(dailyCtx, {
    type: "bar",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{ label: "Daily Access", data: [5, 7, 3, 6, 8, 4, 2] }]
    }
  });

  const monthlyCtx = document.getElementById("monthlyAccessChart").getContext("2d");
  new Chart(monthlyCtx, {
    type: "line",
    data: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: [{ label: "Monthly Access", data: [120,140,110,150,165,180,190,160,140,150,170,180] }]
    }
  });
}
async function loadAccessLogs() {
  try {
    const response = await fetch("http://localhost:4050/api/accesslogs"); // backend URL
    if (!response.ok) throw new Error("Failed to fetch access logs");
    const logs = await response.json();
    console.log(logs);
  } catch (error) {
    console.error("Access Log Error:", error);
  }
}
