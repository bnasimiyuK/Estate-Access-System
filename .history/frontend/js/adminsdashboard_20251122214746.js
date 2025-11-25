// adminsdashboard.js
// NOTE: This file now includes placeholder implementations for all pages referenced in index.html

// ================================
// 🔑 ENVIRONMENT & AUTH SETUP
// ================================
const API_HOST =  "http://localhost:4050"; 
const token = localStorage.getItem("accessToken"); 
if (!token) window.location.href = "/login.html";

// Define API Endpoints
const ENDPOINTS = {
    // Dashboard Overview Endpoints
    DASHBOARD_SUMMARY: `${API_HOST}/api/residents/dashboard/summary`,
    DASHBOARD_CHART: `${API_HOST}/api/residents/admin/accesschart`,

    // Membership Endpoints (using the general API_HOST for core admin actions)
    SYNC: `${API_HOST}/api/admin/sync`,
    PENDING_REQUESTS: `${API_HOST}/api/admin/requests/pending`,
    APPROVED_RESIDENTS: `${API_HOST}/api/admin/residents/approved`,
    APPROVE_REQUEST: (id) => `${API_HOST}/api/admin/approve/${id}`,
    REJECT_REQUEST: (id) => `${API_HOST}/api/admin/reject/${id}`,
    DELETE_REQUEST: (id) => `${API_HOST}/api/admin/delete/${id}`,
    
    // 🟢 MISSING ENDPOINTS ADDED
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
// 🟢 CORE MEMBERSHIP LOGIC (Existing - membership.html & membershiprecords.html)
// ====================================================================

// (handleApproveClick, handleRejectClick, handleDeleteClick, handleSyncClick, loadPendingRequests, loadApprovedResidents)
// Your existing functions for Membership are kept here for brevity, 
// but they should remain in the file exactly as you provided them.

// [START OF EXISTING MEMBERSHIP FUNCTIONS]
async function handleApproveClick(requestId) {
    safeUpdate('actionText', `Processing Approval for ${requestId}...`);
    // ... (rest of approval logic)
}

async function handleRejectClick(requestId) {
    safeUpdate('actionText', `Processing Rejection for ${requestId}...`);
    // ... (rest of rejection logic)
}

async function handleDeleteClick(requestId) {
    safeUpdate('actionText', `Processing Deletion for ${requestId}...`);
    // ... (rest of deletion logic)
}

async function handleSyncClick(event) {
    // ... (rest of sync logic)
}

async function loadPendingRequests() {
    // ... (rest of load pending requests logic)
}

async function loadApprovedResidents() {
    // ... (rest of load approved residents logic)
}

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
// [END OF EXISTING MEMBERSHIP FUNCTIONS]


// ====================================================================
// 📊 DASHBOARD OVERVIEW LOGIC (Existing - dashboardoverview.html)
// ====================================================================

// (loadDashboardSummary, loadAccessChart)
// Your existing Dashboard functions are kept here.

// [START OF EXISTING DASHBOARD FUNCTIONS]
async function loadDashboardSummary() {
    // ... (rest of dashboard summary logic)
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
    // ... (rest of access chart logic)
}
// [END OF EXISTING DASHBOARD FUNCTIONS]


// ====================================================================
// 💵 PAYMENTS RECORDS LOGIC (NEW - payments.html)
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
                    <td class="px-4 py-3">Ksh ${record.Amount.toFixed(2) || '0.00'}</td>
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
    // Example: Attaching listener for a filter or refresh button specific to payments
    // document.getElementById("paymentsFilterBtn")?.addEventListener("click", filterPayments);
}


// ====================================================================
// 👥 RESIDENTS LOGIC (NEW - residents.html)
// ====================================================================

/**
 * Fetches and renders all resident details.
 */
async function loadAllResidents() {
    const tableBody = document.getElementById('allResidentsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-blue-500 italic">Loading all residents...</td></tr>';

    try {
        const resp = await fetch(ENDPOINTS.ALL_RESIDENTS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error("Failed to fetch all residents.");
        
        const residents = await resp.json();
        
        tableBody.innerHTML = '';
        
        if (residents.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No residents found.</td></tr>';
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
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-red-500 italic">Error loading data. Check console for details.</td></tr>';
        displayMessage("Failed to load all residents from API.", true);
    }
}


// ====================================================================
// 🚗 VISITOR MANAGEMENT LOGIC (NEW - visitorsaccess.html, etc.)
// ====================================================================

async function loadVisitorPassOverview() {
    const overviewSection = document.getElementById('visitorOverviewSection');
    if (!overviewSection) return;

    try {
        const res = await fetch(ENDPOINTS.VISITOR_OVERVIEW, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        
        // Assuming your HTML has elements like 'todayVisitors', 'pendingApprovalsCount', etc.
        safeUpdate("todayVisitors", data.today || 0);
        safeUpdate("pendingApprovalsCount", data.pendingApprovals || 0);
        safeUpdate("activeCodes", data.activeCodes || 0);
        
    } catch (err) {
        console.error("Error loading visitor overview:", err);
    }
}

async function loadPendingVisitorApprovals() {
    // Placeholder function to load the table of pending visitor requests
    // Similar implementation to loadPendingRequests, but for visitors
}

function attachVisitorListeners() {
    // Attach listeners for visitor related buttons (Approve/Reject/Filters)
}


// ====================================================================
// 📈 CHARTS & REPORTS LOGIC (NEW - chartsandreports.html)
// ====================================================================

async function loadReportsData() {
    // Placeholder function to fetch and render specific reports data (e.g., charts, tables)
    // Similar implementation to loadAccessChart but for other reports
}


// ====================================================================
// 🚨 MANUAL OVERRIDES LOGIC (NEW - manualoverride.html)
// ====================================================================

async function loadManualOverrides() {
    // Placeholder function to load a log of all manual gate overrides
}

function attachOverrideListeners() {
    // Attach listener for the 'Perform Manual Override' button
    document.getElementById("performOverrideBtn")?.addEventListener("click", async () => {
        // Implement API call to ENDPOINTS.MANUAL_OVERRIDE_ACTION
    });
}


// ====================================================================
// 🧭 SIDEBAR PAGE LOADING (THE FIX - Updated to call new functions)
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
            // Pending Requests
            attachMembershipListeners();
            await loadPendingRequests();
        }
        
        // --- PAYMENTS RECORDS ---
        else if (url.includes("payments.html")) {
            // ✅ FIX: Added function calls
            attachPaymentsListeners();
            await loadPaymentsRecords();
        } 
        
        // --- RESIDENTS ---
        else if (url.includes("residents.html")) {
            // ✅ FIX: Added function call
            await loadAllResidents();
        } 
        
        // --- VISITORS MANAGEMENT ---
        else if (url.includes("visitorsaccess.html") || url.includes("visitorpass.html") || url.includes("visitor/")) {
            // ✅ FIX: Added function calls
            attachVisitorListeners();
            await loadVisitorPassOverview();
            await loadPendingVisitorApprovals();
        }
        
        // --- CHARTS AND REPORTS ---
        else if (url.includes("chartsandreports.html")) {
            // ✅ FIX: Added function call
            await loadReportsData();
        } 
        
        // --- MANUAL OVERRIDES ---
        else if (url.includes("manualoverride.html")) {
            // ✅ FIX: Added function calls
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
            if (b.closest('#visitorSubMenu')) b.classList.add("bg-gray-600", "hover:bg-blue-500/50");
        });
        
        btn.classList.add("bg-blue-600", "text-white");
        if (btn.closest('#visitorSubMenu')) {
            btn.classList.remove("bg-gray-600", "hover:bg-blue-500/50");
        }


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