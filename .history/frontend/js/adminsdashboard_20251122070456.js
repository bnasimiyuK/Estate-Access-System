// adminsdashboard.js
// NOTE: This file assumes the full body of the original membershiprecords.js 
// (which includes loadPendingRequests, handleApproveClick, etc.) 
// has been moved into this file for dynamic loading to work.

// ================================
// 🔑 ENVIRONMENT & AUTH SETUP (Placeholder)
// ================================
// Ensure these variables are correctly set up or imported from a config file.
const API_HOST = "http://api.estate-management.com"; 
const token = localStorage.getItem("accessToken"); 

if (!token) window.location.href = "/login.html";

// Define API Endpoints
const ENDPOINTS = {
    // Dashboard Overview Endpoints (using http://localhost:4050 as seen in your code)
    DASHBOARD_SUMMARY: "http://localhost:4050/api/residents/dashboard/summary",
    DASHBOARD_CHART: "http://localhost:4050/api/residents/admin/accesschart",

    // Membership Endpoints (using the general API_HOST for core admin actions)
    SYNC: `${API_HOST}/api/admin/sync`,
    PENDING_REQUESTS: `${API_HOST}/api/admin/requests/pending`,
    APPROVED_RESIDENTS: `${API_HOST}/api/admin/residents/approved`,
    APPROVE_REQUEST: (id) => `${API_HOST}/api/admin/approve/${id}`,
    REJECT_REQUEST: (id) => `${API_HOST}/api/admin/reject/${id}`,
    DELETE_REQUEST: (id) => `${API_HOST}/api/admin/delete/${id}`,
    PAYMENTS_RECORDS: `${API_HOST}/api/admin/payments/records`,
    ALL_RESIDENTS: `${API_HOST}/api/admin/residents/all`,
    VISITOR_OVERVIEW: `${API_HOST}/api/admin/visitors/overview`,
    PENDING_VISITOR_APPROVALS: `${API_HOST}/api/admin/visitors/pending`,
    REPORTS_DATA: `${API_HOST}/api/admin/reports`,
    MANUAL_OVERRIDES_LOGS: `${API_HOST}/api/admin/override/logs`,
    MANUAL_OVERRIDE_ACTION: `${API_HOST}/api/admin/override/action`,
};

// ================================
// AUTH & LOGOUT
// ================================
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("accessToken");
    window.location.href = "/login.html";
});

// ================================
// UTILITIES AND HELPERS
// ================================

/**
 * Creates and returns the standard headers needed for authenticated API calls.
 */
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Handles error display in a non-alert manner.
 */
function displayMessage(message, isError = false) {
    // Find the message element dynamically on the current page
    const msgElement = document.getElementById('msg');
    if (msgElement) {
        msgElement.textContent = message;
        msgElement.className = `p-3 rounded-lg text-sm font-semibold mb-3 ${isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`;
        
        setTimeout(() => {
            msgElement.textContent = '';
            msgElement.className = 'text-sm text-gray-700 mb-3';
        }, 5000);
    }
}

/**
 * Formats a timestamp (string or number) into a readable date string.
 */
function formatTimestamp(timestamp) {
    try {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString();
    } catch (e) {
        return 'N/A';
    }
}

/**
 * Safely updates a DOM element's text content.
 */
const safeUpdate = (id, value, suffix = '') => {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value + suffix;
    } else {
        // Suppress warning if called when the element isn't in the DOM (i.e., we are on a different page)
        // console.warn(`Element with ID '${id}' not found in the DOM for update.`);
    }
};


// ====================================================================
// 🟢 CORE MEMBERSHIP LOGIC (MOVED FROM membershiprecords.js)
// ====================================================================

/**
 * Sends an approval request to the backend API.
 */
async function handleApproveClick(requestId) {
    safeUpdate('actionText', `Processing Approval for ${requestId}...`);

    try {
        const resp = await fetch(ENDPOINTS.APPROVE_REQUEST(requestId), {
            method: 'PUT',
            headers: getAuthHeaders(),
        });

        if (!resp.ok) {
            const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
            throw new Error(errorData.message || `Approval failed with status: ${resp.status}`);
        }
        
        safeUpdate('actionText', `Approved Request ${requestId}`);
        displayMessage(`Successfully approved membership request ${requestId}.`, false);
        
        // Reload data after a successful action
        await loadPendingRequests();
        await loadApprovedResidents();

    } catch (e) {
        console.error("Approval Operation Failed:", e);
        displayMessage(`Approval failed for ${requestId}: ${e.message}`, true);
    }
}

/**
 * Sends a rejection request to the backend API.
 */
async function handleRejectClick(requestId) {
    safeUpdate('actionText', `Processing Rejection for ${requestId}...`);
    if (!confirm(`Are you sure you want to REJECT request ${requestId}?`)) return;

    try {
        const resp = await fetch(ENDPOINTS.REJECT_REQUEST(requestId), {
            method: 'PUT', 
            headers: getAuthHeaders(),
        });

        if (!resp.ok) {
            const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
            throw new Error(errorData.message || `Rejection failed with status: ${resp.status}`);
        }
        
        safeUpdate('actionText', `Rejected Request ${requestId}`);
        displayMessage(`Successfully rejected membership request ${requestId}.`, false);
        
        await loadPendingRequests();
        await loadApprovedResidents();

    } catch (e) {
        console.error("Rejection Operation Failed:", e);
        displayMessage(`Rejection failed for ${requestId}: ${e.message}`, true);
    }
}

/**
 * Sends a deletion request to the backend API.
 */
async function handleDeleteClick(requestId) {
    safeUpdate('actionText', `Processing Deletion for ${requestId}...`);
    if (!confirm(`Are you sure you want to DELETE request ${requestId}? This action is permanent.`)) return;

    try {
        const resp = await fetch(ENDPOINTS.DELETE_REQUEST(requestId), {
            method: 'DELETE', 
            headers: getAuthHeaders(),
        });

        if (!resp.ok) {
            const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
            throw new Error(errorData.message || `Deletion failed with status: ${resp.status}`);
        }
        
        safeUpdate('actionText', `Deleted Request ${requestId}`);
        displayMessage(`Successfully deleted membership request ${requestId}.`, false);
        
        await loadPendingRequests();
        await loadApprovedResidents();

    } catch (e) {
        console.error("Deletion Operation Failed:", e);
        displayMessage(`Deletion failed for ${requestId}: ${e.message}`, true);
    }
}

/**
 * Executes a real API call to trigger server-side data synchronization.
 */
async function handleSyncClick(event) {
    const btn = event.currentTarget;
    const originalText = btn.textContent;
    const originalClasses = btn.className;

    // 1. Set Loading State
    btn.disabled = true;
    btn.textContent = 'Syncing...';
    btn.className = 'bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 animate-pulse min-w-[100px]';

    try {
        const resp = await fetch(ENDPOINTS.SYNC, { 
            method: 'POST',
            headers: getAuthHeaders(),
        });

        if (!resp.ok) {
            const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
            throw new Error(errorData.message || `Sync failed with status: ${resp.status}`);
        }

        // 2. Set Success State
        btn.textContent = 'Sync Complete! ✔️';
        btn.className = 'bg-green-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 min-w-[100px]';
        displayMessage("Data synchronization was successful. Tables reloading...", false);

        // Reload data after a successful sync
        await loadPendingRequests();
        await loadApprovedResidents();
        
    } catch (err) {
        // 3. Set Failure State
        console.error("Synchronization Error:", err.message);
        btn.textContent = 'Sync Failed ❌';
        btn.className = 'bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 min-w-[100px]';
        displayMessage(`Sync failed: ${err.message}`, true);

    } finally {
        // 4. Reset Button State after a short delay
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = originalText;
            btn.className = originalClasses;
        }, 3000);
    }
}

/**
 * Fetches and renders pending membership requests from the backend API.
 */
async function loadPendingRequests() {
    const tableBody = document.getElementById('membershipTableBody');
    const countElement = document.getElementById('membershipCount');
    const noRequestsMsg = document.getElementById('noPendingRequests');
    
    if (!tableBody || !countElement || !noRequestsMsg) return;

    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-blue-500 italic">Loading requests...</td></tr>';
    
    try {
        const resp = await fetch(ENDPOINTS.PENDING_REQUESTS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error("Failed to fetch pending requests.");
        
        const requests = await resp.json();
        
        tableBody.innerHTML = '';
        countElement.textContent = requests.length;

        if (requests.length === 0) {
            noRequestsMsg.classList.remove('hidden');
        } else {
            noRequestsMsg.classList.add('hidden');
            requests.forEach(request => {
                const row = tableBody.insertRow();
                row.className = 'hover:bg-blue-50 transition-colors duration-100';

                const requestedAtString = formatTimestamp(request.RequestedAt || request.requestedAt);
                const requestId = request.id || request.RequestID; 

                row.innerHTML = `
                    <td class="px-4 py-3">${requestId}</td>
                    <td class="px-4 py-3 font-medium">${request.ResidentName || 'N/A'}</td>
                    <td class="px-4 py-3">${request.NationalID || 'N/A'}</td>
                    <td class="px-4 py-3">${request.PhoneNumber || 'N/A'}</td>
                    <td class="px-4 py-3">${request.Email || 'N/A'}</td>
                    <td class="px-4 py-3">${request.HouseNumber || 'N/A'}</td>
                    <td class="px-4 py-3">${request.CourtName || 'N/A'}</td>
                    <td class="px-4 py-3">${request.RoleName || 'N/A'}</td>
                    <td class="px-4 py-3"><span class="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs">${request.Status || 'Pending'}</span></td>
                    <td class="px-4 py-3">${requestedAtString}</td>
                    <td class="px-4 py-3 text-center space-x-2 flex">
                        <button class="approve-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition duration-150 shadow-md" data-request-id="${requestId}">
                            Approve
                        </button>
                        <button class="reject-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition duration-150 shadow-md" data-request-id="${requestId}">
                            Reject
                        </button>
                        <button class="delete-btn bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs transition duration-150 shadow-md" data-request-id="${requestId}">
                            Delete
                        </button>
                    </td>
                `;
            });
            
            // Attach listeners to the new Action buttons (must be done AFTER innerHTML)
            tableBody.querySelectorAll('.approve-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    handleApproveClick(e.target.getAttribute('data-request-id'));
                });
            });
            tableBody.querySelectorAll('.reject-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    handleRejectClick(e.target.getAttribute('data-request-id'));
                });
            });
            tableBody.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    handleDeleteClick(e.target.getAttribute('data-request-id'));
                });
            });
        }
    } catch (error) {
        console.error("Error loading pending requests:", error);
        tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-red-500 italic">Error loading data. Check console for details.</td></tr>';
        displayMessage("Failed to load pending requests from API.", true);
    }
}

/**
 * Fetches and renders approved residents from the backend API.
 */
async function loadApprovedResidents() {
    const tableBody = document.getElementById('residentsTableBody');
    const noResidentsMsg = document.getElementById('noApprovedResidents');
    
    if (!tableBody || !noResidentsMsg) return;

    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-blue-500 italic">Loading approved residents...</td></tr>';

    try {
        const resp = await fetch(ENDPOINTS.APPROVED_RESIDENTS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error("Failed to fetch approved residents.");
        
        const residents = await resp.json();

        tableBody.innerHTML = '';
        
        if (residents.length === 0) {
            noResidentsMsg.classList.remove('hidden');
        } else {
            noResidentsMsg.classList.add('hidden');
            residents.forEach(resident => {
                const row = tableBody.insertRow();
                row.className = 'hover:bg-blue-50 transition-colors duration-100';
                row.innerHTML = `
                    <td class="px-4 py-3 font-medium">${resident.ResidentName || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.NationalID || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.PhoneNumber || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.Email || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.HouseNumber || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.CourtName || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.RoleName || 'N/A'}</td>
                `;
            });
        }
    } catch (error) {
        console.error("Error loading approved residents:", error);
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-red-500 italic">Error loading data. Check console for details.</td></tr>';
        displayMessage("Failed to load approved residents from API.", true);
    }
}

/**
 * Attaches event listeners for membership-specific elements (Sync, Filters)
 */
function attachMembershipListeners() {
    // Attach listener for the Sync button
    document.getElementById("syncBtn")?.addEventListener("click", handleSyncClick);
    
    // Attach listener for Clear Filters button
    document.getElementById("clearFilterBtn")?.addEventListener("click", () => {
        document.getElementById('requestIdFilter').value = "";
        document.getElementById('residentFilter').value = "";
        displayMessage("Filters cleared (API query filtering needs implementation).", false);
    });
}


// ====================================================================
// 📊 DASHBOARD OVERVIEW LOGIC
// ====================================================================

async function loadDashboardSummary() {
    try {
        const res = await fetch(ENDPOINTS.DASHBOARD_SUMMARY, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();

        safeUpdate("totalResidents", data.residents || 0);
        safeUpdate("pendingPayments", data.pendingPayments || 0);
        safeUpdate("compliancePct", data.compliance || 0, '%');
        safeUpdate("overrideCount", data.overrides || 0);

    } catch (err) {
        console.error("Error loading summary:", err);
    }
}

async function loadAccessChart() {
    try {
        const res = await fetch(ENDPOINTS.DASHBOARD_CHART, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();

        const accessChartElement = document.getElementById("accessChart");
        if (!accessChartElement) return;

        const ctx = accessChartElement.getContext("2d");
        new Chart(ctx, {
            type: "line",
            data: {
                labels: data.days || [],
                datasets: [{
                    label: "Access Attempts",
                    data: data.counts || [],
                    borderWidth: 2,
                    tension: 0.4,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.2)',
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

    } catch (err) {
        console.error("Error loading chart:", err);
    }
}


// ================================
// 🧭 SIDEBAR PAGE LOADING (THE FIX)
// ================================
const sidebarButtons = document.querySelectorAll(".sidebarBtn");
const mainContentArea = document.getElementById("main-content-area");

// adminsdashboard.js
// ... (existing sidebarButtons and mainContentArea definitions)

async function loadPageIntoMainContent(url) {
    // Show a loading state instantly
    mainContentArea.innerHTML = '<div class="text-center p-12 text-lg text-gray-500 font-semibold">Loading content...</div>';

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load page: ${res.status}`);
        const html = await res.text();
        mainContentArea.innerHTML = html; // Inject HTML first

        // 🟢 Execute data loading functions based on the page loaded 
        if (url.includes("dashboardoverview.html")) {
            await loadDashboardSummary(); 
            await loadAccessChart();
        } 
        
        // --- MEMBERSHIP PAGES ---
        else if (url.includes("membershiprecords.html")) {
            // This page typically holds the Sync button and Approved Residents table
            attachMembershipListeners();
            await loadApprovedResidents();
        } else if (url.includes("membership.html")) {
            // Assuming membership.html holds the Pending Requests table
            attachMembershipListeners();
            await loadPendingRequests();
        }
        
        // --- PAYMENTS RECORDS ---
        else if (url.includes("payments.html")) {
            attachPaymentsListeners();
            await loadPaymentsRecords();
        } 
        
        // --- RESIDENTS ---
        else if (url.includes("residents.html")) {
            await loadAllResidents();
        } 
        
        // --- VISITORS MANAGEMENT ---
        else if (url.includes("visitorsaccess.html") || url.includes("visitorpass.html") || url.includes("visitor/")) {
            // Group all visitor sub-pages together for listener and data loading
            attachVisitorListeners();
            await loadVisitorPassOverview();
            await loadPendingVisitorApprovals();
        }
        
        // --- CHARTS AND REPORTS ---
        else if (url.includes("chartsandreports.html")) {
            await loadReportsData();
        } 
        
        // --- MANUAL OVERRIDES ---
        else if (url.includes("manualoverride.html")) {
            attachOverrideListeners();
            await loadManualOverrides();
        }
    } catch (err) {
        console.error("Error loading page:", err);
        mainContentArea.innerHTML = `<div class="p-6 text-red-600 font-bold">Failed to load: ${url}. Check console for details.</div>`;
    }
}

// ... (remaining code, including sidebarButtons.forEach loop)

sidebarButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        sidebarButtons.forEach(b => b.classList.remove("bg-blue-600", "text-white"));
        btn.classList.add("bg-blue-600", "text-white");

        const page = btn.dataset.target;
        if (page) loadPageIntoMainContent(page);
    });
});


// ================================
// MISC UI TOGGLES
// ================================
const visitorToggle = document.getElementById("visitorManagementToggle");
const visitorSubMenu = document.getElementById("visitorSubMenu");
const visitorArrow = document.getElementById("visitorArrow");

visitorToggle?.addEventListener("click", () => {
    visitorSubMenu?.classList.toggle("hidden");
    visitorArrow?.classList.toggle("rotate-90");
});

// ================================
// INITIALIZATION ON PAGE LOAD
// ================================
/**
 * Run this function once on initial page load for the content that is ALREADY present 
 * in the index.html (the Dashboard Overview).
 */
(async function initializeDashboard() {
    safeUpdate('year', new Date().getFullYear()); // Update copyright year if span exists
    await loadDashboardSummary();
    await loadAccessChart();
})();
// adminsdashboard.js
// ... (existing Membership logic: loadPendingRequests, handleApproveClick, etc.)

// ====================================================================
// 💵 PAYMENTS RECORDS LOGIC
// ====================================================================

async function loadPaymentsRecords() {
    const tableBody = document.getElementById('paymentsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-blue-500 italic">Loading Payments Records...</td></tr>';
    
    try {
        // ❗ Implement API call to fetch payment data
        // Example: const resp = await fetch(ENDPOINTS.PAYMENTS_RECORDS, { headers: getAuthHeaders() });
        // Example: const payments = await resp.json();

        // ❗ Implement logic to loop through payments and populate paymentsTableBody
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-green-500 italic">Payments data loaded. (Implement rendering logic here)</td></tr>';

    } catch (error) {
        console.error("Error loading payment records:", error);
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-red-500 italic">Error loading payments data.</td></tr>';
    }
}

function attachPaymentsListeners() {
    // ❗ Attach listeners for any Verify/Archive buttons or filters on the payments page
}

// ====================================================================
// 🧑 RESIDENTS LOGIC
// ====================================================================

async function loadAllResidents() {
    const tableBody = document.getElementById('allResidentsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-blue-500 italic">Loading All Residents...</td></tr>';

    try {
        // ❗ Implement API call to fetch all resident data
        // Example: const resp = await fetch(ENDPOINTS.ALL_RESIDENTS, { headers: getAuthHeaders() });
        
        // ❗ Implement logic to populate allResidentsTableBody
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-green-500 italic">All Residents data loaded. (Implement rendering logic here)</td></tr>';

    } catch (error) {
        console.error("Error loading all residents:", error);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-500 italic">Error loading all residents data.</td></tr>';
    }
}

// ====================================================================
// 🚪 VISITORS MANAGEMENT LOGIC
// ====================================================================

async function loadVisitorPassOverview() {
    const overviewContainer = document.getElementById('visitorOverviewStats');
    if (!overviewContainer) return;

    // ❗ Implement API call to fetch visitor statistics (e.g., today's visitors, pending approvals)
    overviewContainer.innerHTML = '<p class="text-center py-4 text-green-500 italic">Visitor overview data loaded. (Implement stats logic here)</p>';
}

async function loadPendingVisitorApprovals() {
    const tableBody = document.getElementById('visitorApprovalTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-blue-500 italic">Loading Pending Visitor Approvals...</td></tr>';

    // ❗ Implement API call and table rendering for visitor approvals
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-green-500 italic">Visitor Approvals loaded. (Implement rendering logic here)</td></tr>';
}

function attachVisitorListeners() {
    // ❗ Attach listeners for Approve/Deny buttons, or date/time filters
}

// ====================================================================
// 📈 CHARTS AND REPORTS LOGIC
// ====================================================================

async function loadReportsData() {
    const chartContainer = document.getElementById('mainReportsChart');
    if (!chartContainer) return;
    
    // ❗ Implement API calls for any required reports (e.g., annual revenue, resident growth)
    // ❗ Implement Chart.js initialization logic here for the reports
    chartContainer.innerHTML = '<p class="text-center py-4 text-green-500 italic">Reports charts initialized. (Implement chart drawing here)</p>';
}

// ====================================================================
// 🔑 MANUAL OVERRIDES LOGIC
// ====================================================================

async function loadManualOverrides() {
    const formContainer = document.getElementById('overrideForm');
    const logsBody = document.getElementById('overrideLogsBody');
    if (!formContainer || !logsBody) return;

    // ❗ Implement API call to fetch recent override logs
    logsBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-blue-500 italic">Loading Override Logs...</td></tr>';
    logsBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-green-500 italic">Override Logs loaded. (Implement logs rendering here)</td></tr>';
}

function attachOverrideListeners() {
    const overrideForm = document.getElementById('overrideForm');
    if (overrideForm) {
        // ❗ Attach listener for form submission to execute the manual override API call
        overrideForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Implement logic to send override request...
            displayMessage("Manual Override attempt sent. (Implement API call here)", false);
        });
    }
}