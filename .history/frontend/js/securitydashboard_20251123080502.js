// ========================
// GLOBAL SETTINGS
// ========================
const API_HOST = "http://localhost:4050";
const token = localStorage.getItem("token");

// Global variable to store the currently rendered logs for export and filtering
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
    
    // Setup Export Button Listeners (Assuming buttons with these IDs exist in HTML)
    document.getElementById("exportCsvBtn")?.addEventListener("click", () => exportTableToCSV(currentAccessLogs, 'access_logs'));
    document.getElementById("exportExcelBtn")?.addEventListener("click", () => exportTableToExcel(currentAccessLogs, 'access_logs'));
});

// ========================
// EXPORT FUNCTIONS
// ========================

/**
 * Converts a data array to a CSV string and downloads it.
 * @param {Array<Object>} data The data array to export.
 * @param {string} filename The desired filename (without extension).
 */
function exportTableToCSV(data, filename) {
    if (data.length === 0) {
        alert("No data to export.");
        return;
    }

    // 1. Get headers (column names) from the first object
    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';

    // 2. Add rows
    data.forEach(row => {
        const values = headers.map(header => {
            let value = row[header];
            // Format timestamp for readability
            if (header === 'timestamp') {
                value = new Date(value).toLocaleString();
            }
            // Handle null/undefined values and escape double quotes
            return `"${(value === null || value === undefined ? "" : value).toString().replace(/"/g, '""')}"`;
        });
        csv += values.join(',') + '\n';
    });

    // 3. Create a blob and download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Converts a data array to an HTML table string for Excel download.
 * Note: This is a common way to simulate Excel export in pure JS.
 * @param {Array<Object>} data The data array to export.
 * @param {string} filename The desired filename (without extension).
 */
function exportTableToExcel(data, filename) {
    if (data.length === 0) {
        alert("No data to export.");
        return;
    }

    const headers = Object.keys(data[0]);
    
    // Start building the HTML table structure
    let tableHTML = '<table><thead><tr>';

    // Headers
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    // Rows
    data.forEach(row => {
        tableHTML += '<tr>';
        headers.forEach(header => {
            let value = row[header];
            if (header === 'timestamp') {
                value = new Date(value).toLocaleString();
            }
            // Clean up and add value
            tableHTML += `<td>${value === null || value === undefined ? "" : value}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';

    const uri = 'data:application/vnd.ms-excel;base64,';
    const template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head></head><body>{table}</body></html>';
    
    const base64 = s => window.btoa(unescape(encodeURIComponent(s)));
    const format = (s, c) => s.replace(/{(\w+)}/g, (m, p) => c[p]);
    
    const ctx = { worksheet: filename || 'Worksheet', table: tableHTML };

    const link = document.createElement("a");
    link.href = uri + base64(format(template, ctx));
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// ========================
// FILTERING FUNCTIONS
// ========================

/**
 * Sets up event listeners on the filter inputs in the table header.
 */
function setupTableFilters() {
    const filterInputs = document.querySelectorAll("#logsTableHeader input.filterInput");
    filterInputs.forEach(input => {
        // Clear previous listeners to prevent duplicates on re-render
        input.removeEventListener('input', filterTable);
        input.addEventListener('input', filterTable);
    });
}

/**
 * Filters the rendered table rows based on the current input values in the header.
 */
function filterTable() {
    const table = document.getElementById("accessLogsTable");
    const tr = table.getElementsByTagName("tr");

    // Get all current filter values
    const filters = {};
    const ths = document.querySelectorAll("#logsTableHeader th");
    ths.forEach((th, index) => {
        const input = th.querySelector('input.filterInput');
        if (input && input.value.trim() !== '') {
            filters[index] = input.value.trim().toLowerCase();
        }
    });

    // Loop through all table rows (skipping the header row at index 0 and filter row at index 1)
    for (let i = 2; i < tr.length; i++) {
        let displayRow = true;
        const tds = tr[i].getElementsByTagName("td");

        for (const colIndex in filters) {
            const cellValue = tds[colIndex]?.textContent || tds[colIndex]?.innerText || '';
            
            // Check if the cell value contains the filter text
            if (!cellValue.toLowerCase().includes(filters[colIndex])) {
                displayRow = false;
                break; // No need to check other filters for this row
            }
        }

        // Show or hide the row
        tr[i].style.display = displayRow ? "" : "none";
    }
}


// ========================
// LOAD ACCESS LOGS (BACKEND)
// ========================
async function loadaccesslogs() {
    try {
        const response = await fetch(`${API_HOST}/api/accesslogs/logs`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const logs = await response.json();
        // Store the raw data for export
        currentAccessLogs = logs; 
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

        // The structure must match the filtering logic's expected column index:
        // 0: timestamp, 1: userId, 2: action, 3: logType
        tr.innerHTML = `
            <td class="p-2 border">${new Date(log.timestamp).toLocaleString()}</td>
            <td class="p-2 border">${log.userId || "—"}</td>
            <td class="p-2 border">${log.action}</td>
            <td class="p-2 border">${log.logType}</td>
        `;

        tbody.appendChild(tr);
    });
    
    // IMPORTANT: Set up the filters after the table has been rendered
    setupTableFilters(); 
}

// ========================
// LOAD VISITOR REQUESTS (BACKEND)
// ========================
async function loadVisitorRequests() {
    try {
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
document.getElementById("openGateBtn")?.addEventListener("click", async () => {
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
    const dailyCtx = document.getElementById("dailyAccessChart")?.getContext("2d");
    if (dailyCtx) {
        new Chart(dailyCtx, {
            type: "bar",
            data: {
                labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                datasets: [{ label: "Daily Access", data: [5, 7, 3, 6, 8, 4, 2] }]
            }
        });
    }

    const monthlyCtx = document.getElementById("monthlyAccessChart")?.getContext("2d");
    if (monthlyCtx) {
        new Chart(monthlyCtx, {
            type: "line",
            data: {
                labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                datasets: [{ label: "Monthly Access", data: [120,140,110,150,165,180,190,160,140,150,170,180] }]
            }
        });
    }
}