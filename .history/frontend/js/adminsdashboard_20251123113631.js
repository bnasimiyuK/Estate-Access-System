// adminsdashboard.js
// This file now includes ALL necessary data loading logic (including Membership)
// to handle dynamic page loading in the Admin Dashboard.

// ================================
// 🔑 ENVIRONMENT & AUTH SETUP
// ================================
const API_HOST =  "http://localhost:4050"; 
const token = localStorage.getItem("accessToken"); 
if (!token) window.location.href = "/login.html";

// Define API Endpoints
const ENDPOINTS = {
    // Dashboard Overview Endpoints
    DASHBOARD_SUMMARY: `${API_HOST}/api/residents/dashboard/summary`,
    DASHBOARD_CHART: `${API_HOST}/api/residents/admin/accesschart`,

    // Membership Endpoints
    SYNC: `${API_HOST}/api/admin/sync`,
    PENDING_REQUESTS: `${API_HOST}/api/admin/requests/pending`,
    APPROVED_RESIDENTS: `${API_HOST}/api/admin/residents/approved`,
    APPROVE_REQUEST: (id) => `${API_HOST}/api/admin/approve/${id}`,
    REJECT_REQUEST: (id) => `${API_HOST}/api/admin/reject/${id}`,
    DELETE_REQUEST: (id) => `${API_HOST}/api/admin/delete/${id}`,
    
    // General Admin Endpoints
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
    }
};


// ====================================================================
// 🟢 CORE MEMBERSHIP LOGIC (membership.html & membershiprecords.html)
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
        // Assumes these filter IDs exist on membership.html or membershiprecords.html
        document.getElementById('requestIdFilter').value = "";
        document.getElementById('residentFilter').value = "";
        displayMessage("Filters cleared (API query filtering needs implementation).", false);
    });
}


// ====================================================================
// 📊 DASHBOARD OVERVIEW LOGIC (dashboardoverview.html)
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
        // Destroy existing chart instance if it exists before creating a new one
        if (window.accessChartInstance) {
            window.accessChartInstance.destroy();
        }
        
        window.accessChartInstance = new Chart(ctx, {
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


// ====================================================================
// 💵 PAYMENTS RECORDS LOGIC (payments.html)
// ====================================================================

/**
 * Fetches and renders payments records.
 */
async function loadPaymentsRecords() {
    const tableBody = document.getElementById('paymentsTableBody');
    if (!tableBody) return; 

    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-blue-500 italic">Loading payment records...</td></tr>';
    
    try {
        const resp = await fetch(ENDPOINTS.PAYMENTS_RECORDS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error("Failed to fetch payments records.");
        
        const records = await resp.json();
        
        tableBody.innerHTML = '';

        if (records.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No payment records found.</td></tr>';
        } else {
            records.forEach(record => {
                const row = tableBody.insertRow();
                row.className = 'hover:bg-blue-50 transition-colors duration-100';
                row.innerHTML = `
                    <td class="px-4 py-3">${record.TransactionID || 'N/A'}</td>
                    <td class="px-4 py-3 font-medium">${record.PayerName || 'N/A'}</td>
                    <td class="px-4 py-3">${record.HouseNumber || 'N/A'}</td>
                    <td class="px-4 py-3">Ksh ${record.Amount?.toFixed(2) || '0.00'}</td>
                    <td class="px-4 py-3">${record.PaymentMethod || 'N/A'}</td>
                    <td class="px-4 py-3">${formatTimestamp(record.PaymentDate)}</td>
                    <td class="px-4 py-3"><span class="bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs">${record.Status || 'Complete'}</span></td>
                `;
            });
        }
    } catch (error) {
        console.error("Error loading payments records:", error);
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-red-500 italic">Error loading data. Check console for details.</td></tr>';
        displayMessage("Failed to load payments records from API.", true);
    }
}

/**
 * Attaches event listeners for payments-specific elements.
 */
function attachPaymentsListeners() {
    // Add any payments-specific listeners here
}


// ====================================================================
// 👥 RESIDENTS LOGIC (residents.html)
// ====================================================================

/**
 * Fetches and renders all resident details.
 */
async function loadAllResidents() {
    const tableBody = document.getElementById('allResidentsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-blue-500 italic">Loading all residents...</td></tr>';

    try {
        const resp = await fetch(ENDPOINTS.ALL_RESIDENTS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error("Failed to fetch all residents.");
        
        const residents = await resp.json();
        
        tableBody.innerHTML = '';
        
        if (residents.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No residents found.</td></tr>';
        } else {
            residents.forEach(resident => {
                const row = tableBody.insertRow();
                row.className = 'hover:bg-blue-50 transition-colors duration-100';
                row.innerHTML = `
                    <td class="px-4 py-3 font-medium">${resident.ResidentName || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.PhoneNumber || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.Email || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.HouseNumber || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.CourtName || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.RoleName || 'N/A'}</td>
                    <td class="px-4 py-3"><span class="bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs">${resident.AccountStatus || 'Active'}</span></td>
                `;
            });
        }
    } catch (error) {
        console.error("Error loading all residents:", error);
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-red-500 italic">Error loading data. Check console for details.</td></tr>';
        displayMessage("Failed to load all residents from API.", true);
    }
}


// ====================================================================
// 🚗 VISITOR MANAGEMENT LOGIC (visitorsaccess.html, etc.)
// ====================================================================

async function loadVisitorPassOverview() {
    const overviewSection = document.getElementById('visitorOverviewSection');
    if (!overviewSection) return;

    try {
        const res = await fetch(ENDPOINTS.VISITOR_OVERVIEW, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        
        // Assuming your HTML has elements like 'todayVisitors', 'pendingApprovalsCount', 'activeCodes'
        safeUpdate("todayVisitors", data.today || 0);
        safeUpdate("pendingApprovalsCount", data.pendingApprovals || 0);
        safeUpdate("activeCodes", data.activeCodes || 0);
        
    } catch (err) {
        console.error("Error loading visitor overview:", err);
    }
}

async function loadPendingVisitorApprovals() {
    const tableBody = document.getElementById('visitorRequestsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-blue-500 italic">Loading pending visitor requests...</td></tr>';
    
    // Implementation details would be similar to loadPendingRequests()
}

function attachVisitorListeners() {
    // Attach listeners for visitor related buttons (Approve/Reject/Filters)
}


// ====================================================================
// 📈 CHARTS & REPORTS LOGIC (chartsandreports.html)
// ====================================================================

async function loadReportsData() {
    // Placeholder implementation
    const reportsContainer = document.getElementById('reportsContainer');
    if (!reportsContainer) return;
    reportsContainer.innerHTML = '<p class="text-gray-600 italic">Fetching complex report data...</p>';

    try {
        const res = await fetch(ENDPOINTS.REPORTS_DATA, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        
        // Example: If data contains a 'monthlyRevenue' array, you'd render a chart here.
        // For simplicity, we just display a success message:
        reportsContainer.innerHTML = `<p class="text-green-600 font-semibold">Reports data loaded (e.g., ${data.length || 0} report metrics).</p>`;

    } catch (err) {
        console.error("Error loading reports data:", err);
        reportsContainer.innerHTML = '<p class="text-red-600 font-semibold">Failed to load reports data.</p>';
    }
}


// ====================================================================
// 🚨 MANUAL OVERRIDES LOGIC (manualoverride.html)
// ====================================================================

async function loadManualOverrides() {
    const logTableBody = document.getElementById('overrideLogTableBody');
    if (!logTableBody) return;

    logTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-blue-500 italic">Loading override logs...</td></tr>';
    
    try {
        const resp = await fetch(ENDPOINTS.MANUAL_OVERRIDES_LOGS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error("Failed to fetch override logs.");
        const logs = await resp.json();

        logTableBody.innerHTML = '';
        if (logs.length === 0) {
            logTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No override logs found.</td></tr>';
        } else {
            // Populate table rows with logs
        }
    } catch (error) {
        logTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500 italic">Error loading logs.</td></tr>';
    }
}

function attachOverrideListeners() {
    // Attach listener for the 'Perform Manual Override' button
    document.getElementById("performOverrideBtn")?.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to perform a manual override?")) return;
        
        try {
            // Implement API call to ENDPOINTS.MANUAL_OVERRIDE_ACTION
            const resp = await fetch(ENDPOINTS.MANUAL_OVERRIDE_ACTION, { 
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ action: 'open_gate' }) // Example payload
            });
            if (!resp.ok) throw new Error("Override API failed.");

            displayMessage("Manual override successful!", false);
            await loadManualOverrides(); // Reload logs

        } catch (e) {
            displayMessage(`Manual override failed: ${e.message}`, true);
        }
    });
}


// ====================================================================
// 🧭 SIDEBAR PAGE LOADING (THE FIXED SWITCH)
// ====================================================================
const sidebarButtons = document.querySelectorAll(".sidebarBtn");
const mainContentArea = document.getElementById("main-content-area");

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
            // Approved Residents
            attachMembershipListeners();
            await loadApprovedResidents();
        } else if (url.includes("membership.html")) {
            // Pending Requests (Used for "Membership Requests" sidebar button)
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
        else if (url.includes("visitorsaccess.html") || url.includes("visitorpass.html")) {
            attachVisitorListeners();
            // Load data relevant to the main visitor pages
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

// ... (existing sidebar button loop and visitor toggle logic)

sidebarButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        sidebarButtons.forEach(b => {
            b.classList.remove("bg-blue-600", "text-white");
            // Also ensure sub-menu items are correctly reset if needed
            if (b.closest('#visitorSubMenu')) b.classList.add("bg-gray-700", "hover:bg-gray-600", "text-white"); // Reset sub-menu item styles
            if (b.closest('#visitorSubMenu')) b.classList.remove("bg-blue-600");
            
            // Re-apply specific default styles for sub-menu items if needed
            if (b.closest('#visitorSubMenu') && b.classList.contains('text-sm')) {
                 b.classList.remove("bg-gray-700", "hover:bg-gray-600");
                 b.classList.add("bg-gray-600", "hover:bg-blue-500/50");
            }
        });
        
        btn.classList.add("bg-blue-600", "text-white");
        btn.classList.remove("bg-gray-700", "bg-gray-600", "hover:bg-gray-600", "hover:bg-blue-500/50");

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

document.addEventListener('DOMContentLoaded', () => {
    // Load the initial dashboard view when the admin page first loads
    loadPageIntoMainContent('sections/dashboardoverview.html');
});
// ================================
// 🔹 ACCESS LOGS FOR ADMIN DASHBOARD
// ================================

const logsTableBody = document.getElementById("logsTableBody");
const filterInputs = document.querySelectorAll("#accesslogs .filterInput");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportExcelBtn = document.getElementById("exportExcelBtn");

// Function to fetch and populate access logs

// ================================
// 🔹 FILTER LOGS
// ================================
filterInputs.forEach((input, colIndex) => {
  input.addEventListener("input", () => {
    const filterValue = input.value.toLowerCase();
    const rows = logsTableBody.querySelectorAll("tr");
    rows.forEach(row => {
      const cell = row.cells[colIndex];
      if (!cell) return;
      row.style.display = cell.textContent.toLowerCase().includes(filterValue) ? "" : "none";
    });
  });
});

// ================================
// 🔹 EXPORT FUNCTIONS
// ================================
function downloadCSV() {
  const rows = Array.from(logsTableBody.querySelectorAll("tr"))
    .filter(r => r.style.display !== "none")
    .map(r => Array.from(r.cells).map(cell => `"${cell.textContent}"`).join(","))
    .join("\n");

  const blob = new Blob([rows], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `access_logs_${Date.now()}.csv`;
  link.click();
}

exportCsvBtn?.addEventListener("click", downloadCSV);
exportExcelBtn?.addEventListener("click", downloadCSV); // Quick export to CSV; can integrate Excel lib if needed

// ================================
// 🔹 INITIAL LOAD
// ================================
document.addEventListener("DOMContentLoaded", () => {
  loadaccesslogs();
});
// adminsdashboard.js

document.addEventListener("DOMContentLoaded", () => {
  const accesslogsTableBody = document.getElementById("logsTableBody");

  // Fetch Access Logs from backend
  async function loadaccesslogs() {
    try {
      const token = localStorage.getItem("accessToken"); // if using JWT auth
      const response = await fetch("http://localhost:4050/api/security/accesslogs", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch Access Logs");

      const logs = await response.json();
      renderaccesslogs(logs);
    } catch (err) {
      console.error("Error loading access logs:", err);
      accesslogsTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-red-500 p-4">Unable to load Access Logs</td></tr>`;
    }
  }

  // Render table rows
  function renderaccesslogs(logs) {
    if (!logs || logs.length === 0) {
      accesslogsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4">No logs found</td></tr>`;
      return;
    }

    accesslogsTableBody.innerHTML = logs
      .map(log => `
        <tr class="border-b">
          <td class="p-2 border-r">${new Date(log.timestamp).toLocaleString()}</td>
          <td class="p-2 border-r">${log.userId}</td>
          <td class="p-2 border-r">${log.action}</td>
          <td class="p-2">${log.type}</td>
        </tr>
      `).join("");
  }

  // Show Access Logs tab when sidebar button is clicked
  const accesslogsBtn = document.querySelector('.sidebarBtn[data-target="sections/accesslogs.html"]');
  accesslogsBtn.addEventListener("click", () => {
    // Hide all other dynamic sections
    document.querySelectorAll("#main-content-area > div").forEach(div => div.classList.add("hidden"));
    // Show Access Logs
    document.getElementById("accesslogs").classList.remove("hidden");

    // Load logs
    loadaccesslogs();
  });
});
