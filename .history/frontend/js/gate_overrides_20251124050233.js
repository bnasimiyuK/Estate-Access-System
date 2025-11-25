// Global variables/constants for API configuration
const API_HOST = "http://localhost:4050"; // Placeholder: Replace with your actual backend host
const ENDPOINTS = {
    // The backend route '/api/logs/gate_overrides' MUST execute the SQL query provided:
    // SELECT TOP (1000) [id], [gateId], [action], [reason], [userId], [createdAt] FROM [EstateAccessManagementSystem].[dbo].[gate_overrides]
    GATE_OVERRIDES: "/api/logs/gate_overrides", 
};

// The Admin JWT token should be securely provided by the embedding application environment.
const token = window.adminToken || ''; 

// Data store
let gateOverridesData = [];

/**
 * Fetches gate override log data from the backend API.
 */
async function fetchGateOverrideLogs() {
    const statusMessage = document.getElementById('statusMessage');
    const logsTableBody = document.getElementById('logsTableBody');
    statusMessage.classList.add('hidden');
    logsTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Fetching data...</td></tr>`;

    if (!token) {
        logsTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-red-500 text-center font-semibold">
            Error: Authentication token is missing. Access Denied.
        </td></tr>`;
        return;
    }

    try {
        const url = `${API_HOST}${ENDPOINTS.GATE_OVERRIDES}`;
        
        // Exponential backoff retry mechanism for API calls
        const MAX_RETRIES = 3;
        let response;
        for (let i = 0; i < MAX_RETRIES; i++) {
            response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) break;

            if (i < MAX_RETRIES - 1) {
                const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        if (!response.ok) {
            const errorDetail = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}. Detail: ${errorDetail.substring(0, 100)}...`);
        }

        const data = await response.json();
        
        // Assuming data is an array of log objects matching the SQL columns
        gateOverridesData = Array.isArray(data) ? data : (data.logs || []);
        
        // Initial render of all fetched data
        renderLogs(gateOverridesData);

    } catch (error) {
        console.error('Error fetching gate override logs:', error);
        statusMessage.textContent = `Failed to load logs. Ensure the API server is running at ${API_HOST} and the endpoint ${ENDPOINTS.GATE_OVERRIDES} is correct.`;
        statusMessage.classList.remove('hidden');
        logsTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-red-500 text-center">
            Data fetch failed. See console for details.
        </td></tr>`;
    }
}

/**
 * Renders the filtered log data into the HTML table.
 * Note: Property names (id, gateId, etc.) match the SQL column names exactly.
 * @param {Array<Object>} logs The array of log objects to render.
 */
function renderLogs(logs) {
    const logsTableBody = document.getElementById('logsTableBody');
    logsTableBody.innerHTML = ''; // Clear previous data

    if (logs.length === 0) {
        logsTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
            No gate override logs found matching criteria.
        </td></tr>`;
        return;
    }

    logs.forEach(log => {
        const row = document.createElement('tr');
        row.className = 'table-row-hover';
        
        // Format the timestamp for better readability
        const formattedDate = new Date(log.createdAt).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        // Determine action styling
        let actionClass;
        if (log.action === 'OPEN') {
            actionClass = 'bg-green-100 text-green-800';
        } else if (log.action === 'CLOSE') {
            actionClass = 'bg-yellow-100 text-yellow-800';
        } else {
            actionClass = 'bg-red-100 text-red-800';
        }

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${log.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${log.gateId || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${actionClass}">
                    ${log.action || 'Unknown'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-pre-wrap text-sm text-gray-500 max-w-xs">${log.reason || 'None provided'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.userId || 'System'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
        `;
        logsTableBody.appendChild(row);
    });
}

/**
 * Applies client-side filters to the log data.
 */
function applyLogsFilters() {
    const filterGateId = document.getElementById('filterGateId').value.toLowerCase();
    const filterAction = document.getElementById('filterAction').value.toLowerCase();

    const filteredLogs = gateOverridesData.filter(log => {
        const gateMatch = log.gateId && log.gateId.toLowerCase().includes(filterGateId);
        const actionMatch = log.action && log.action.toLowerCase().includes(filterAction);
        return gateMatch && actionMatch;
    });

    renderLogs(filteredLogs);
}

/**
 * Exports the currently displayed logs to a CSV file.
 */
function exportLogsToCSV() {
    // Use the data currently rendered (which is already filtered)
    const rows = Array.from(document.getElementById('logsTableBody').getElementsByTagName('tr'));
    if (rows.length === 0 || rows[0].getAttribute('colspan') === '6') {
         document.getElementById('statusMessage').textContent = "No data to export.";
         document.getElementById('statusMessage').classList.remove('hidden');
         setTimeout(() => document.getElementById('statusMessage').classList.add('hidden'), 3000);
         return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // 1. Headers (Matching the SQL column names)
    const headers = ["id", "gateId", "action", "reason", "userId", "createdAt"];
    csvContent += headers.join(",") + "\r\n";

    // 2. Data Rows
    // Fetch data directly from the logs currently displayed in the table (which respects filtering)
    rows.forEach(row => {
        const rowData = Array.from(row.getElementsByTagName('td')).map(cell => {
            // Clean up text content and remove inner spans/extra whitespace
            let text = cell.textContent.trim().replace(/\s\s+/g, ' '); 
            // Escape double quotes by doubling them
            if (text.includes(',')) {
                return `"${text.replace(/"/g, '""')}"`;
            }
            return text;
        });
        csvContent += rowData.join(",") + "\r\n";
    });

    // Create and trigger download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "gate_override_logs_" + new Date().toISOString().slice(0, 10) + ".csv");
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
}

/**
 * Attaches all necessary event listeners to the input fields and buttons.
 */
function attachLogsListeners() {
    document.getElementById('filterGateId').addEventListener('input', applyLogsFilters);
    document.getElementById('filterAction').addEventListener('input', applyLogsFilters);
    document.getElementById('exportLogsBtn').addEventListener('click', exportLogsToCSV);
}

// Initialize the page once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // 1. Attach listeners for filtering and export functionality
    attachLogsListeners();
    
    // 2. Fetch the data from the server
    fetchGateOverrideLogs();
});