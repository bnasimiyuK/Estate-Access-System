// ========================
// GLOBAL SETTINGS
// ========================
const API_HOST = "http://localhost:4050";
const token = localStorage.getItem("token");

// Store the currently loaded logs for export and local filtering purposes
let currentAccessLogs = [];

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
    loadaccesslogs();
    loadVisitorRequests();
    loadCharts();
    
    // 🔑 Attach event listeners for Export and Filter inputs
    document.getElementById("exportCsvBtn").addEventListener("click", exportToCsv);
    document.getElementById("exportExcelBtn").addEventListener("click", exportToExcel);

    // Attach filter event listeners to the new inputs
    const filterInputs = document.querySelectorAll('.filterInput');
    filterInputs.forEach(input => {
        // Use an array index to identify which column the input belongs to
        input.dataset.columnIndex = Array.from(input.parentNode.parentNode.children).indexOf(input.parentNode);
        input.addEventListener('keyup', applyInlineFilters);
    });
});

// ========================
// ACCESS LOGS FUNCTIONALITY
// ========================
async function loadaccesslogs() {
    try {
        // Fetch data from the corrected endpoint /api/accesslogs/logs
        const response = await fetch(`${API_HOST}/api/accesslogs/logs`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const logs = await response.json();
        currentAccessLogs = logs; // 🔑 Store logs for export and filtering
        renderaccesslogs(logs);

    } catch (err) {
        console.error("Access Log Error:", err);
    }
}

function renderaccesslogs(logs) {
    const tbody = document.getElementById("logsTableBody");
    tbody.innerHTML = "";

    logs.forEach(log => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td class="p-2 border">${new Date(log.TimestampUtc).toLocaleString()}</td>
            <td class="p-2 border">${log.UserId || "—"}</td>
            <td class="p-2 border">${log.Action}</td>
            <td class="p-2 border">${log.LogType}</td>
        `;

        tbody.appendChild(tr);
    });
}

// 🔑 Function to apply inline filters locally
function applyInlineFilters() {
    const filterInputs = document.querySelectorAll('.filterInput');
    const filters = Array.from(filterInputs).map(input => input.value.toLowerCase());

    const filteredLogs = currentAccessLogs.filter(log => {
        // Prepare log values for comparison (order matches the table columns)
        const logValues = [
            new Date(log.TimestampUtc).toLocaleString().toLowerCase(),
            (log.UserId || '—').toLowerCase(),
            log.Action.toLowerCase(),
            log.LogType.toLowerCase(),
        ];

        // Check if all filter values are present in their respective log columns
        return filters.every((filterValue, index) => {
            return !filterValue || logValues[index].includes(filterValue);
        });
    });

    renderaccesslogs(filteredLogs);
}

// 🟢 FIX APPLIED: Helper function to safely convert null/undefined to string '—'
const safeString = (value) => String(value ?? '—');

// 🔑 Updated Function to export logs to CSV (Fixed TypeError)
function exportToCsv() {
    if (currentAccessLogs.length === 0) return alert("No logs to export.");

    const headers = ["Timestamp (UTC)", "User/Visitor ID", "Action", "Log Type"];
    
    // Convert logs to CSV string
    const csvContent = [
        headers.join(','), // Header row
        ...currentAccessLogs.map(log => 
            // 🟢 FIX: Ensure values are strings before calling .replace()
            [
                `"${safeString(new Date(log.TimestampUtc).toLocaleString()).replace(/"/g, '""')}"`,
                `"${safeString(log.UserId).replace(/"/g, '""')}"`,
                `"${safeString(log.Action).replace(/"/g, '""')}"`,
                `"${safeString(log.LogType).replace(/"/g, '""')}"`,
            ].join(',')
        )
    ].join('\n');

    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "access_logs.csv";
    link.click();
}

// 🔑 Updated Function to export logs to Excel (Fixed TypeError)
function exportToExcel() {
    if (currentAccessLogs.length === 0) return alert("No logs to export.");

    const headers = ["Timestamp (UTC)", "User/Visitor ID", "Action", "Log Type"];
    
    const excelContent = [
        headers.join('\t'), // Use tab delimiter for simple Excel compatibility
        ...currentAccessLogs.map(log => 
            [
                // 🟢 FIX: Ensure values are strings
                safeString(new Date(log.TimestampUtc).toLocaleString()),
                safeString(log.UserId),
                safeString(log.Action),
                safeString(log.LogType),
            ].join('\t')
        )
    ].join('\n');

    // Use application/vnd.ms-excel to suggest opening in Excel
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "access_logs.xls"; // Using .xls for compatibility suggestion
    link.click();
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
        // 🛑 NOTE: This 403 error must be fixed on the server (check JWT validity/permissions).
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
                loadaccesslogs();
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
                loadaccesslogs();
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
        loadaccesslogs();
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
