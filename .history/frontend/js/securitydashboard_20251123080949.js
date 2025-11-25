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
            // Hide all tab contents
            tabContents.forEach(tab => tab.classList.add("hidden"));
            // Show the selected tab content
            document.getElementById(btn.dataset.tab).classList.remove("hidden");

            // Special logic for Access Logs to ensure filtering is set up correctly
            if (btn.dataset.tab === 'accessLogs' && currentAccessLogs.length > 0) {
                // If data is already loaded, ensure filters are active
                setupTableFilters();
            }
        });
    });

    // Initialize default tab content (Access Logs)
    loadaccesslogs();
    loadVisitorRequests();
    loadCharts();
    
    // Setup Export Button Listeners (using optional chaining for resilience)
    document.getElementById("exportCsvBtn")?.addEventListener("click", () => exportTableToCSV(currentAccessLogs, 'access_logs'));
    document.getElementById("exportExcelBtn")?.addEventListener("click", () => exportTableToExcel(currentAccessLogs, 'access_logs'));
});

// ========================
// EXPORT FUNCTIONS
// ========================

/**
 * Converts a data array to a CSV string and triggers download.
 * @param {Array<Object>} data The data array to export.
 * @param {string} filename The desired filename (without extension).
 */
function exportTableToCSV(data, filename) {
    if (data.length === 0) {
        // Use a message box instead of alert()
        console.warn("Export attempted with no data.");
        // In a real app, you would show a custom modal/notification here.
        return;
    }

    // Define the headers based on the rendered columns
    const headers = ["timestamp", "userId", "action", "logType"]; 
    let csv = headers.map(h => {
        // Simple human-readable header mapping for export file
        if (h === 'userId') return 'User/Visitor ID';
        if (h === 'logType') return 'Log Type';
        return h.charAt(0).toUpperCase() + h.slice(1);
    }).join(',') + '\n';

    // Add rows
    data.forEach(row => {
        const values = headers.map(header => {
            let value = row[header];
            // Format timestamp for readability
            if (header === 'timestamp') {
                // Ensure the value can be converted to a date before formatting
                value = value ? new Date(value).toLocaleString() : 'N/A';
            }
            // Handle null/undefined values and escape double quotes
            return `"${(value === null || value === undefined ? "" : value).toString().replace(/"/g, '""')}"`;
        });
        csv += values.join(',') + '\n';
    });

    // Create a blob and trigger download
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
 * Converts a data array to an HTML table string for Excel (XLS) download simulation.
 * @param {Array<Object>} data The data array to export.
 * @param {string} filename The desired filename (without extension).
 */
function exportTableToExcel(data, filename) {
    if (data.length === 0) {
        console.warn("Export attempted with no data.");
        return;
    }

    // Define the keys to export and their display names
    const exportKeys = ["timestamp", "userId", "action", "logType"];
    const displayHeaders = ["Timestamp", "User/Visitor ID", "Action", "Log Type"];
    
    // Start building the HTML table structure
    let tableHTML = '<table><thead><tr>';

    // Headers
    displayHeaders.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    // Rows
    data.forEach(row => {
        tableHTML += '<tr>';
        exportKeys.forEach(key => {
            let value = row[key];
            if (key === 'timestamp') {
                value = value ? new Date(value).toLocaleString() : 'N/A';
            }
            // Clean up and add value
            tableHTML += `<td>${value === null || value === undefined ? "" : value}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';

    // Boilerplate for Excel download using base64 encoding of HTML
    const uri = 'data:application/vnd.ms-excel;base64,';
    const template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>{table}</body></html>';
    
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
    // Select inputs that are direct children of th elements under #logsTableHeader
    const filterInputs = document.querySelectorAll("#accessLogsTable thead tr:nth-child(2) input.filterInput");
    
    // Clear the table display of any previous filters when setting up new listeners
    const tbody = document.getElementById("logsTableBody");
    if (tbody) {
        tbody.querySelectorAll('tr').forEach(row => row.style.display = "");
    }

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
    // Get all rows in the table body
    const tr = table.querySelector("#logsTableBody").getElementsByTagName("tr");

    // Get all current filter values (from the second <tr> in the <thead>)
    const filterRow = table.querySelector("thead tr:nth-child(2)");
    if (!filterRow) return;

    const filterInputs = filterRow.querySelectorAll('input.filterInput');
    
    const filters = {};
    filterInputs.forEach((input, index) => {
        if (input.value.trim() !== '') {
            // Store filter value by column index
            filters[index] = input.value.trim().toLowerCase();
        }
    });

    // Loop through all table rows in the tbody
    for (let i = 0; i < tr.length; i++) {
        let displayRow = true;
        const tds = tr[i].getElementsByTagName("td");

        for (const colIndexStr in filters) {
            const colIndex = parseInt(colIndexStr);
            if (tds[colIndex]) {
                const cellValue = tds[colIndex].textContent || tds[colIndex].innerText || '';
                
                // Check if the cell value contains the filter text
                if (!cellValue.toLowerCase().includes(filters[colIndex])) {
                    displayRow = false;
                    break; // No need to check other filters for this row
                }
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

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error: Status ${response.status}`, errorBody);
            throw new Error(`Failed to fetch access logs. Status: ${response.status}`);
        }

        const logs = await response.json();
        
        if (!Array.isArray(logs)) {
             console.error("Invalid data format: API response is not an array.", logs);
             throw new Error("Invalid data format received from API.");
        }

        // Store the raw data for export
        currentAccessLogs = logs; 
        renderaccesslogs(logs);

    } catch (err) {
        console.error("Access Log Load Error:", err.message);
        const tbody = document.getElementById("logsTableBody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-600 font-semibold">Error loading logs: ${err.message}</td></tr>`;
        }
    }
}

function renderaccesslogs(logs) {
    const tbody = document.getElementById("logsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    logs.forEach((log, index) => {
        // Crucial data validation: check if required fields exist
        if (!log || !log.timestamp || !log.action || !log.logType) {
            console.warn(`Skipping invalid log entry at index ${index}. Missing required fields.`, log);
            return; // Skip this log entry
        }

        const tr = document.createElement("tr");
        tr.className = 'hover:bg-gray-50 transition duration-100';

        const timestampValue = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A';
        
        // Column Index order: 0: timestamp, 1: userId, 2: action, 3: logType
        tr.innerHTML = `
            <td class="p-3 border-r border-b text-sm">${timestampValue}</td>
            <td class="p-3 border-r border-b text-sm">${log.userId || "—"}</td>
            <td class="p-3 border-r border-b text-sm">${log.action}</td>
            <td class="p-3 border-b text-sm">${log.logType}</td>
        `;

        tbody.appendChild(tr);
    });
    
    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">No access logs found.</td></tr>`;
    }

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
    if (!container) return;
    container.innerHTML = "";

    if (visitors.length === 0) {
        container.innerHTML = `<p class="text-gray-500 p-4 border rounded-lg bg-white">No pending visitor approval requests.</p>`;
        return;
    }

    visitors.forEach(req => {
        const div = document.createElement("div");
        div.className = "p-3 border rounded-lg flex justify-between items-center bg-white shadow-md";

        div.innerHTML = `
            <span class="text-gray-700">${req.VisitorName} (ID: <span class="font-mono text-sm text-green-700">${req.VisitorID}</span>) → Resident <span class="font-mono text-sm text-blue-700">${req.ResidentID}</span></span>
            <div>
                <button class="approveBtn bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 transition duration-150 ease-in-out shadow-md">Approve</button>
                <button class="rejectBtn bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700 transition duration-150 ease-in-out shadow-md ml-2">Reject</button>
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
    const residentIdInput = document.getElementById("gateResidentId");
    const visitorIdInput = document.getElementById("gateVisitorId");
    const gateStatusDiv = document.getElementById("gateStatus");
    
    if (!residentIdInput || !visitorIdInput || !gateStatusDiv) return;

    const residentId = residentIdInput.value;
    const visitorId = visitorIdInput.value;

    const target = visitorId || residentId;
    gateStatusDiv.className = "mt-4 text-yellow-700 font-semibold";
    gateStatusDiv.innerText = `Gate manually opened for ${target}`;

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
        
        gateStatusDiv.className = "mt-4 text-green-700 font-bold";
        gateStatusDiv.innerText = `SUCCESS: Gate opened for ${target}. Log recorded.`;
        loadaccesslogs();
    } catch (err) {
        gateStatusDiv.className = "mt-4 text-red-600 font-bold";
        gateStatusDiv.innerText = `ERROR: Failed to open gate for ${target}. See console for details.`;
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
                datasets: [{ 
                    label: "Daily Access Count", 
                    data: [5, 7, 3, 6, 8, 4, 2],
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1 
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const monthlyCtx = document.getElementById("monthlyAccessChart")?.getContext("2d");
    if (monthlyCtx) {
        new Chart(monthlyCtx, {
            type: "line",
            data: {
                labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                datasets: [{ 
                    label: "Monthly Access Count", 
                    data: [120,140,110,150,165,180,190,160,140,150,170,180],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}