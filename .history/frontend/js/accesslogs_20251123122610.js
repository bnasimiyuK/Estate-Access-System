// js/accesslogs.js
const API_HOST = "http://localhost:4050";
const ENDPOINTS = {
    ACCESS_LOGS: `${API_HOST}/api/admin/accesslogs`, // adjust endpoint if needed
};

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem("accessToken");
    return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
}

// Format timestamp nicely
function formatTimestamp(timestamp) {
    if (!timestamp) return "N/A";
    try {
        return new Date(timestamp).toLocaleString();
    } catch {
        return timestamp;
    }
}

// Display message to user
function displayMessage(msg, isError = false) {
    const div = document.createElement("div");
    div.textContent = msg;
    div.className = `p-2 mb-2 rounded text-sm ${isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`;
    document.body.prepend(div);
    setTimeout(() => div.remove(), 5000);
}

// Load access logs into table
export async function loadaccesslogs() {
    const tbody = document.getElementById("logsTableBody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="p-3">Loading...</td></tr>';

    try {
        const res = await fetch(ENDPOINTS.ACCESS_LOGS, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status} - Failed to fetch logs`);
        const logs = await res.json();

        tbody.innerHTML = logs.length === 0
            ? '<tr><td colspan="4" class="p-3 text-center">No logs found</td></tr>'
            : '';

        logs.forEach(log => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td class="p-2 border-b">${formatTimestamp(log.Timestamp || log.timestamp || log.TimestampUtc)}</td>
                <td class="p-2 border-b">${log.UserID || log.userId || log.User}</td>
                <td class="p-2 border-b">${log.Action || log.action}</td>
                <td class="p-2 border-b">${log.LogType || log.type}</td>
            `;
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="4" class="p-3 text-red-700">Failed to load logs</td></tr>`;
        displayMessage(`Error: ${err.message}`, true);
    }
}

// Optional: Filter table by input fields
export function attachFilters() {
    const inputs = document.querySelectorAll("#accessLogsTable thead input");
    if (!inputs) return;

    inputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            const filter = input.value.toLowerCase();
            const rows = document.querySelectorAll("#logsTableBody tr");
            rows.forEach(row => {
                const cell = row.cells[index];
                row.style.display = cell && cell.textContent.toLowerCase().includes(filter) ? "" : "none";
            });
        });
    });
}

// Optional: Export to CSV
export function exportCSV() {
    const rows = document.querySelectorAll("#logsTableBody tr");
    let csv = "Timestamp,User/Visitor ID,Action,Log Type\n";
    rows.forEach(row => {
        if (row.style.display === "none") return;
        const cells = row.querySelectorAll("td");
        const rowData = Array.from(cells).map(c => `"${c.textContent.replace(/"/g,'""')}"`).join(",");
        csv += rowData + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "access_logs.csv";
    link.click();
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    if (typeof loadaccesslogs === "function") loadaccesslogs();
});
