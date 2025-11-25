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
    loadaccesslogs(); // 🟢 Updated function call
    loadVisitorRequests();
    loadCharts();
});

// ========================
// LOAD ACCESS LOGS (BACKEND)
// ========================
async function loadaccesslogs() { // 🟢 Updated function name
    try {
        // Endpoint uses the corrected lowercase base path /api/accesslogs/logs
        const response = await fetch(`${API_HOST}/api/accesslogs/logs`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const logs = await response.json();
        renderaccesslogs(logs); // 🟢 Updated function call

    } catch (err) {
        console.error("Access Log Error:", err);
    }
}

function renderaccesslogs(logs) { // 🟢 Updated function name
    const tbody = document.getElementById("logsTableBody");
    tbody.innerHTML = "";

    logs.forEach(log => {
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
        // Path corrected in previous step: /api/visitorsaccess/requests
        const response = await fetch(`${API_HOST}/api/visitorsaccess/requests`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

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
        div.className = "p-2 border rounded flex justify-between items-center bg-white";

        div.innerHTML = `
            <span>${req.VisitorName} (ID: ${req.VisitorID}) → Resident ${req.ResidentID}</span>
            <div>
                <button class="approveBtn bg-green-600 text-white px-2 py-1 rounded mr-2">Approve</button>
                <button class="rejectBtn bg-red-600 text-white px-2 py-1 rounded">Reject</button>
            </div>
        `;

        // Approve
        div.querySelector(".approveBtn").addEventListener("click", async () => {
            try {
                const res = await fetch(`${API_HOST}/api/visitorsaccess/${req.VisitorID}/approve`, {
                    method: "PUT",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                loadVisitorRequests();
                loadaccesslogs(); // 🟢 Updated function call
            } catch (err) {
                console.error("Approve Error:", err);
            }
        });

        // Reject
        div.querySelector(".rejectBtn").addEventListener("click", async () => {
            try {
                const res = await fetch(`${API_HOST}/api/visitorsaccess/${req.VisitorID}/reject`, {
                    method: "PUT",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                loadVisitorRequests();
                loadaccesslogs(); // 🟢 Updated function call
            } catch (err) {
                console.error("Reject Error:", err);
            }
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
    document.getElementById("gateStatus").innerText = `Gate manually opened for ${target}`;

    try {
        const response = await fetch(`${API_HOST}/api/access/manual-open`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ residentId, visitorId })
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        loadaccesslogs(); // 🟢 Updated function call
    } catch (err) {
        console.error("Manual Gate Error:", err);
    }
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