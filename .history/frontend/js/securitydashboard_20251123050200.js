const API_HOST = "http://localhost:4050";
const token = localStorage.getItem("token");

// ----------------------------
// TAB SWITCHING
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tabBtn");
  const tabContents = document.querySelectorAll(".tabContent");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      tabContents.forEach(tc => tc.classList.add("hidden"));
      document.getElementById(target).classList.remove("hidden");
    });
  });

  loadAccessLogs();
  loadVisitorRequests();
  loadCharts();
});

// ----------------------------
// BACKEND: LOAD ACCESS LOGS
// ----------------------------
async function loadAccessLogs() {
  try {
    const response = await fetch(`${API_HOST}/api/access/logs`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Unable to fetch logs");

    const logs = await response.json();
    renderAccessLogs(logs);

  } catch (err) {
    console.error("Access Logs Error:", err);
  }
}

function renderAccessLogs(list) {
  const tbody = document.getElementById("logsTableBody");
  tbody.innerHTML = "";

  list.forEach((log, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-2 border">${i + 1}</td>
      <td class="p-2 border">${log.timestamp}</td>
      <td class="p-2 border">${log.userId ?? "—"}</td>
      <td class="p-2 border">${log.action}</td>
      <td class="p-2 border">${log.resource}</td>
      <td class="p-2 border">${log.ipAddress}</td>
      <td class="p-2 border">${log.userAgent}</td>
      <td class="p-2 border">${log.logType}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ----------------------------
// BACKEND: VISITOR REQUESTS
// ----------------------------
async function loadVisitorRequests() {
  try {
    const resp = await fetch(`${API_HOST}/api/visitors/pending`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const reqs = await resp.json();
    renderVisitorRequests(reqs);

  } catch (e) {
    console.log("Visitor Request Error:", e);
  }
}

function renderVisitorRequests(data) {
  const container = document.getElementById("visitorRequestList");
  container.innerHTML = "";

  data.forEach(req => {
    const div = document.createElement("div");
    div.className =
      "p-2 border rounded flex justify-between items-center bg-white";

    div.innerHTML = `
      <span>${req.visitorName} (ID: ${req.visitorId}) → Resident: ${req.residentId}</span>
      <div>
        <button class="approveBtn bg-green-600 text-white px-2 py-1 rounded mr-2">Approve</button>
        <button class="rejectBtn bg-red-600 text-white px-2 py-1 rounded">Reject</button>
      </div>
    `;

    // Approve
    div.querySelector(".approveBtn").addEventListener("click", async () => {
      await fetch(`${API_HOST}/api/visitors/approve/${req.visitorId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });

      loadVisitorRequests();
      loadAccessLogs();
    });

    // Reject
    div.querySelector(".rejectBtn").addEventListener("click", async () => {
      await fetch(`${API_HOST}/api/visitors/reject/${req.visitorId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });

      loadVisitorRequests();
      loadAccessLogs();
    });

    container.appendChild(div);
  });
}

// ----------------------------
// CHARTS
// ----------------------------
function loadCharts() {
  new Chart(document.getElementById("dailyAccessChart"), {
    type: "bar",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{ label: "Access Attempts", data: [5, 7, 3, 8, 6, 4, 2] }]
    }
  });

  new Chart(document.getElementById("monthlyAccessChart"), {
    type: "line",
    data: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: [{ label: "Access Attempts", data: [120,130,110,150,160,170,165,140,120,155,160,170] }]
    }
  });
}
