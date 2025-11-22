document.addEventListener("DOMContentLoaded", () => {
  // --- Tab Switching ---
  const tabButtons = document.querySelectorAll(".tabBtn");
  const tabContents = document.querySelectorAll(".tabContent");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      tabContents.forEach(tc => tc.classList.add("hidden"));
      document.getElementById(target).classList.remove("hidden");
    });
  });

  // --- Logout ---
  document.getElementById("logoutBtn").addEventListener("click", () => {
    alert("Logged out!"); // Replace with real backend
  });

  // --- Mock Data ---
  const accessLogs = [
    { timestamp: "2025-11-15T08:30:00Z", user: "R100", type: "Resident", status: "success" },
    { timestamp: "2025-11-15T09:00:00Z", user: "VP123", type: "Visitor", status: "denied" },
  ];

  const visitorRequests = [
    { visitorId: "VP123", visitorName: "Mark Lee", residentId: "R100" },
    { visitorId: "VP124", visitorName: "Jane Doe", residentId: "R102" },
  ];

  // --- Load Access Logs ---
  function loadAccessLogs() {
    const tbody = document.getElementById("logsTableBody");
    tbody.innerHTML = "";
    accessLogs.forEach(log => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="p-2 border">${new Date(log.timestamp).toLocaleString()}</td>
                      <td class="p-2 border">${log.user}</td>
                      <td class="p-2 border">${log.type}</td>
                      <td class="p-2 border">${log.status}</td>`;
      tbody.appendChild(tr);
    });
  }

  loadAccessLogs();

  // --- Visitor Approvals ---
  function loadVisitorRequests() {
    const container = document.getElementById("visitorRequestList");
    container.innerHTML = "";
    visitorRequests.forEach(req => {
      const div = document.createElement("div");
      div.className = "p-2 border rounded flex justify-between items-center";
      div.innerHTML = `<span>${req.visitorName} (ID: ${req.visitorId}) for Resident: ${req.residentId}</span>
        <div>
          <button class="approveBtn bg-green-600 text-white px-2 py-1 rounded mr-2">Approve</button>
          <button class="rejectBtn bg-red-600 text-white px-2 py-1 rounded">Reject</button>
        </div>`;
      container.appendChild(div);

      div.querySelector(".approveBtn").addEventListener("click", () => {
        alert(`Visitor ${req.visitorName} approved`);
        accessLogs.push({ timestamp: new Date(), user: req.visitorId, type: "Visitor", status: "success" });
        visitorRequests.splice(visitorRequests.indexOf(req), 1);
        loadVisitorRequests();
        loadAccessLogs();
      });

      div.querySelector(".rejectBtn").addEventListener("click", () => {
        alert(`Visitor ${req.visitorName} rejected`);
        accessLogs.push({ timestamp: new Date(), user: req.visitorId, type: "Visitor", status: "denied" });
        visitorRequests.splice(visitorRequests.indexOf(req), 1);
        loadVisitorRequests();
        loadAccessLogs();
      });
    });
  }

  loadVisitorRequests();

  // --- Manual Gate Control ---
  document.getElementById("openGateBtn").addEventListener("click", () => {
    const residentId = document.getElementById("gateResidentId").value;
    const visitorId = document.getElementById("gateVisitorId").value;
    const target = visitorId || residentId;
    document.getElementById("gateStatus").textContent = `Gate manually opened for ${target}`;
    accessLogs.push({ timestamp: new Date(), user: target, type: visitorId ? "Visitor" : "Resident", status: "manual_open" });
    loadAccessLogs();
  });

  // --- Reports & Analysis ---
  function loadCharts() {
    // Daily Access Chart
    const dailyCtx = document.getElementById("dailyAccessChart").getContext("2d");
    const dailyData = {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{ label: "Access Attempts", data: [5, 7, 3, 8, 6, 4, 2], backgroundColor: "rgba(75, 192, 192, 0.7)" }]
    };
    new Chart(dailyCtx, { type: "bar", data: dailyData, options: { responsive: true } });

    // Monthly Access Chart
    const monthlyCtx = document.getElementById("monthlyAccessChart").getContext("2d");
    const monthlyData = {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: [{ label: "Access Attempts", data: [120, 130, 110, 140, 150, 160, 145, 135, 125, 150, 155, 160], backgroundColor: "rgba(153, 102, 255, 0.7)" }]
    };
    new Chart(monthlyCtx, { type: "line", data: monthlyData, options: { responsive: true } });
  }

  loadCharts();
});
