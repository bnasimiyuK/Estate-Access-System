// js/resident_records.js

// ========================
// GLOBAL SETTINGS
// ========================
const API_HOST = "http://localhost:4050";
const token = localStorage.getItem("token"); // Assuming token is stored locally
const RECORDS_ENDPOINT = `${API_HOST}/api/residents/records`;

// Store the full dataset for local filtering
let allRecords = [];

// ========================
// DATA FETCHING & RENDERING
// ========================

/**
 * Fetches the resident membership records from the API.
 */
async function fetchAndRenderRecords() {
    const tableBody = document.getElementById("recordsTableBody");
    const recordCountElement = document.getElementById("recordCount");

    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-blue-500">Fetching data...</td></tr>';

    try {
        const response = await fetch(RECORDS_ENDPOINT, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error("Unauthorized: Please log in again.");
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        allRecords = data;
        
        // Render the full dataset initially
        renderRecords(allRecords);

    } catch (error) {
        console.error("Failed to fetch resident records:", error);
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-red-600">Error loading data: ${error.message}</td></tr>`;
        recordCountElement.textContent = "Total Records: 0";
    }
}

/**
 * Renders the provided list of records into the HTML table.
 * @param {Array} records - The array of record objects to display.
 */
function renderRecords(records) {
    const tableBody = document.getElementById("recordsTableBody");
    const recordCountElement = document.getElementById("recordCount");
    tableBody.innerHTML = "";

    if (records.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No records found matching your criteria.</td></tr>';
    } else {
        records.forEach(record => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-gray-50 transition duration-100";

            // Determine status badge style
            let statusColor = 'bg-gray-200 text-gray-800';
            if (record.Status === 'Approved') {
                statusColor = 'bg-green-100 text-green-700 font-semibold';
            } else if (record.Status === 'Pending') {
                statusColor = 'bg-yellow-100 text-yellow-700 font-semibold';
            } else if (record.Status === 'Rejected') {
                 statusColor = 'bg-red-100 text-red-700 font-semibold';
            }

            // Formatting requested date
            const requestedAt = record.RequestedAt ? new Date(record.RequestedAt).toLocaleString() : 'N/A';

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${record.ResidentName || '—'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${record.NationalID || '—'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${record.PhoneNumber || '—'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${record.HouseNumber || '—'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${record.CourtName || '—'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 rounded-full ${statusColor}">
                        ${record.Status || 'N/A'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${requestedAt}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${record.Action || '—'}</td>
            `;

            tableBody.appendChild(tr);
        });
    }
    recordCountElement.textContent = `Total Records: ${records.length}`;
}

// ========================
// FILTERING LOGIC
// ========================

/**
 * Applies all current filters to the full dataset and re-renders the table.
 */
function applyFilters() {
    // Get filter values and convert to lower case for case-insensitive comparison
    const filterName = document.getElementById('filterName').value.toLowerCase();
    const filterHouse = document.getElementById('filterHouse').value.toLowerCase();
    const filterCourt = document.getElementById('filterCourt').value.toLowerCase();
    const filterStatus = document.getElementById('filterStatus').value.toLowerCase();

    const filteredRecords = allRecords.filter(record => {
        // Prepare record values safely
        const name = (record.ResidentName || '').toLowerCase();
        const house = (record.HouseNumber || '').toLowerCase();
        const court = (record.CourtName || '').toLowerCase();
        const status = (record.Status || '').toLowerCase();

        // 1. Filter by Name (partial match)
        if (filterName && !name.includes(filterName)) return false;

        // 2. Filter by House Number (partial match)
        if (filterHouse && !house.includes(filterHouse)) return false;

        // 3. Filter by Court Name (partial match)
        if (filterCourt && !court.includes(filterCourt)) return false;

        // 4. Filter by Status (exact match or empty filter)
        if (filterStatus && status !== filterStatus) return false;

        return true;
    });

    renderRecords(filteredRecords);
}

// ========================
// INITIALIZATION
// ========================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Load data immediately
    fetchAndRenderRecords();

    // 2. Attach listeners for dynamic filtering (input/keyup/change)
    document.getElementById('filterName').addEventListener('input', applyFilters);
    document.getElementById('filterHouse').addEventListener('input', applyFilters);
    document.getElementById('filterCourt').addEventListener('input', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    
    // 3. Attach listener for the refresh button
    document.getElementById('refreshBtn').addEventListener('click', fetchAndRenderRecords);
});