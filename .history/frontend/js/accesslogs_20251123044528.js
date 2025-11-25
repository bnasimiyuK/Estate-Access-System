// ===============================
// Access Logs Page Script
// ===============================

// Backend API
const API_HOST = "http://localhost:4050";

// Load logs immediately when page loads
document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    loadAccessLogs();
});

// ===============================
// AUTH CHECK (JWT)
// ===============================
function checkAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("You must login first");
        window.location.href = "/login.html";
    }
}

// ===============================
// FETCH ACCESS LOGS
// ===============================
async function loadAccessLogs() {
    const tableBody = document.getElementById("logsTableBody");
    tableBody.innerHTML = `
        <tr><td colspan="8" style="text-align:center;">Loading...</td></tr>
    `;

    const fromDate = document.getElementById("fromDate").value;
    const toDate = document.getElementById("toDate").value;

    let url = `${API_HOST}/api/access/logs`;

    // add filters dynamically
    if (fromDate && toDate) {
        url += `?from=${fromDate}&to=${toDate}`;
    }

    try {
        const token = localStorage.getItem("token");

        const res = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP Error ${res.status}`);
        }

        const logs = await res.json();
        renderAccessLogs(logs);

    } catch (error) {
        console.error("Failed to load access logs:", error);
        tableBody.innerHTML = `
            <tr><td colspan="8" style="text-align:center;color:red;">
                Failed to load logs. ${error.message}
            </td></tr>
        `;
    }
}

// ===============================
// RENDER TABLE
// ===============================
function renderAccessLogs(logs) {
    const tableBody = document.getElementById("logsTableBody");
    tableBody.innerHTML = "";

    if (!logs.length) {
        tableBody.innerHTML = `
            <tr><td colspan="8" style="text-align:center;">No logs available</td></tr>
        `;
        return;
    }

    logs.forEach((log, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${log.timestampUtc ? new Date(log.timestampUtc).toLocaleString() : "—"}</td>
            <td>${log.userId ?? "—"}</td>
            <td>${log.action ?? "—"}</td>
            <td>${log.resource ?? "—"}</td>
            <td>${log.ipAddress ?? "—"}</td>
            <td>${log.userAgent ?? "—"}</td>
            <td>${log.logType ?? "—"}</td>
        `;

        tableBody.appendChild(row);
    });
}

// ===============================
// FILTER BUTTON
// ===============================
document.getElementById("filterBtn")?.addEventListener("click", () => {
    loadAccessLogs();
});
