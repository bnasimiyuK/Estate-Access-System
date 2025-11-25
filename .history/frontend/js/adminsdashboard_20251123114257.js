// =========================================================
// adminsdashboard.js – Refactored & Optimized
// =========================================================

// ================================
// 🔑 ENVIRONMENT & AUTH SETUP
// ================================
const API_HOST = "http://localhost:4050";
const token = localStorage.getItem("accessToken");
if (!token) window.location.href = "/login.html";

// Define API Endpoints
const ENDPOINTS = {
    // Dashboard Overview
    DASHBOARD_SUMMARY: `${API_HOST}/api/residents/dashboard/summary`,
    DASHBOARD_CHART: `${API_HOST}/api/residents/admin/accesschart`,

    // Membership
    SYNC: `${API_HOST}/api/admin/sync`,
    PENDING_REQUESTS: `${API_HOST}/api/admin/requests/pending`,
    APPROVED_RESIDENTS: `${API_HOST}/api/admin/residents/approved`,
    APPROVE_REQUEST: (id) => `${API_HOST}/api/admin/approve/${id}`,
    REJECT_REQUEST: (id) => `${API_HOST}/api/admin/reject/${id}`,
    DELETE_REQUEST: (id) => `${API_HOST}/api/admin/delete/${id}`,

    // General Admin
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
document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("accessToken");
    window.location.href = "/login.html";
});

// ================================
// UTILITIES & HELPERS
// ================================
function getAuthHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

function displayMessage(message, isError = false) {
    const msgElement = document.getElementById('msg');
    if (!msgElement) return;
    msgElement.textContent = message;
    msgElement.className = `p-3 rounded-lg text-sm font-semibold mb-3 ${isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`;
    setTimeout(() => {
        msgElement.textContent = '';
        msgElement.className = 'text-sm text-gray-700 mb-3';
    }, 5000);
}

function formatTimestamp(timestamp) {
    try {
        return timestamp ? new Date(timestamp).toLocaleString() : 'N/A';
    } catch (e) { return 'N/A'; }
}

const safeUpdate = (id, value, suffix = '') => {
    const element = document.getElementById(id);
    if (element) element.textContent = value + suffix;
};

// ================================
// 🟢 MEMBERSHIP LOGIC
// ================================
async function handleMembershipAction(requestId, actionType) {
    const actionsMap = {
        approve: ENDPOINTS.APPROVE_REQUEST,
        reject: ENDPOINTS.REJECT_REQUEST,
        delete: ENDPOINTS.DELETE_REQUEST
    };
    const confirmMsgs = {
        approve: `Approve request ${requestId}?`,
        reject: `Reject request ${requestId}?`,
        delete: `Delete request ${requestId}? This cannot be undone.`
    };

    if (actionType !== 'approve' && !confirm(confirmMsgs[actionType])) return;

    safeUpdate('actionText', `Processing ${actionType} for ${requestId}...`);

    try {
        const resp = await fetch(actionsMap[actionType](requestId), { method: actionType === 'delete' ? 'DELETE' : 'PUT', headers: getAuthHeaders() });
        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({ message: resp.statusText }));
            throw new Error(errData.message || resp.statusText);
        }

        safeUpdate('actionText', `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Request ${requestId}`);
        displayMessage(`Successfully ${actionType}d membership request ${requestId}.`);
        await loadPendingRequests();
        await loadApprovedResidents();
    } catch (err) {
        console.error(`${actionType} operation failed:`, err);
        displayMessage(`${actionType.charAt(0).toUpperCase() + actionType.slice(1)} failed: ${err.message}`, true);
    }
}

async function handleSyncClick(event) {
    const btn = event.currentTarget;
    const originalText = btn.textContent;
    const originalClasses = btn.className;

    btn.disabled = true;
    btn.textContent = 'Syncing...';
    btn.className = 'bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold shadow-md animate-pulse';

    try {
        const resp = await fetch(ENDPOINTS.SYNC, { method: 'POST', headers: getAuthHeaders() });
        if (!resp.ok) throw new Error(`Sync failed: ${resp.status}`);
        btn.textContent = 'Sync Complete! ✔️';
        btn.className = 'bg-green-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md';
        displayMessage("Data synchronization successful.");
        await loadPendingRequests();
        await loadApprovedResidents();
    } catch (err) {
        console.error("Sync Error:", err);
        btn.textContent = 'Sync Failed ❌';
        btn.className = 'bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md';
        displayMessage(`Sync failed: ${err.message}`, true);
    } finally {
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = originalText;
            btn.className = originalClasses;
        }, 3000);
    }
}

async function loadPendingRequests() {
    const tableBody = document.getElementById('membershipTableBody');
    const countElement = document.getElementById('membershipCount');
    const noRequestsMsg = document.getElementById('noPendingRequests');
    if (!tableBody || !countElement || !noRequestsMsg) return;

    tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-blue-500 italic">Loading requests...</td></tr>';

    try {
        const resp = await fetch(ENDPOINTS.PENDING_REQUESTS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error("Failed to fetch pending requests.");
        const requests = await resp.json();
        tableBody.innerHTML = '';
        countElement.textContent = requests.length;

        if (requests.length === 0) return noRequestsMsg.classList.remove('hidden');

        noRequestsMsg.classList.add('hidden');
        requests.forEach(req => {
            const requestId = req.id || req.RequestID;
            const row = tableBody.insertRow();
            row.className = 'hover:bg-blue-50 transition-colors duration-100';
            row.innerHTML = `
                <td class="px-4 py-3">${requestId}</td>
                <td class="px-4 py-3 font-medium">${req.ResidentName || 'N/A'}</td>
                <td class="px-4 py-3">${req.NationalID || 'N/A'}</td>
                <td class="px-4 py-3">${req.PhoneNumber || 'N/A'}</td>
                <td class="px-4 py-3">${req.Email || 'N/A'}</td>
                <td class="px-4 py-3">${req.HouseNumber || 'N/A'}</td>
                <td class="px-4 py-3">${req.CourtName || 'N/A'}</td>
                <td class="px-4 py-3">${req.RoleName || 'N/A'}</td>
                <td class="px-4 py-3"><span class="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs">${req.Status || 'Pending'}</span></td>
                <td class="px-4 py-3">${formatTimestamp(req.RequestedAt || req.requestedAt)}</td>
                <td class="px-4 py-3 text-center flex space-x-2">
                    <button class="approve-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs shadow-md" data-id="${requestId}">Approve</button>
                    <button class="reject-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs shadow-md" data-id="${requestId}">Reject</button>
                    <button class="delete-btn bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs shadow-md" data-id="${requestId}">Delete</button>
                </td>
            `;
        });

        // Attach event listeners
        tableBody.querySelectorAll('.approve-btn').forEach(btn => btn.addEventListener('click', e => handleMembershipAction(e.target.dataset.id, 'approve')));
        tableBody.querySelectorAll('.reject-btn').forEach(btn => btn.addEventListener('click', e => handleMembershipAction(e.target.dataset.id, 'reject')));
        tableBody.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', e => handleMembershipAction(e.target.dataset.id, 'delete')));

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-red-500 italic">Error loading data.</td></tr>';
        displayMessage("Failed to load pending requests.", true);
    }
}

async function loadApprovedResidents() {
    const tableBody = document.getElementById('residentsTableBody');
    const noMsg = document.getElementById('noApprovedResidents');
    if (!tableBody || !noMsg) return;

    tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-blue-500 italic">Loading approved residents...</td></tr>';

    try {
        const resp = await fetch(ENDPOINTS.APPROVED_RESIDENTS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error("Failed to fetch approved residents.");
        const residents = await resp.json();

        tableBody.innerHTML = '';
        if (residents.length === 0) return noMsg.classList.remove('hidden');
        noMsg.classList.add('hidden');

        residents.forEach(res => {
            const row = tableBody.insertRow();
            row.className = 'hover:bg-blue-50 transition-colors duration-100';
            row.innerHTML = `
                <td class="px-4 py-3 font-medium">${res.ResidentName || 'N/A'}</td>
                <td class="px-4 py-3">${res.NationalID || 'N/A'}</td>
                <td class="px-4 py-3">${res.PhoneNumber || 'N/A'}</td>
                <td class="px-4 py-3">${res.Email || 'N/A'}</td>
                <td class="px-4 py-3">${res.HouseNumber || 'N/A'}</td>
                <td class="px-4 py-3">${res.CourtName || 'N/A'}</td>
                <td class="px-4 py-3">${res.RoleName || 'N/A'}</td>
            `;
        });
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-red-500 italic">Error loading approved residents.</td></tr>';
        displayMessage("Failed to load approved residents.", true);
    }
}

// Attach membership listeners
function attachMembershipListeners() {
    document.getElementById("syncBtn")?.addEventListener("click", handleSyncClick);
    document.getElementById("clearFilterBtn")?.addEventListener("click", () => {
        document.getElementById('requestIdFilter').value = "";
        document.getElementById('residentFilter').value = "";
        displayMessage("Filters cleared.", false);
    });
}

// ================================
// ⚡ SIDEBAR PAGE LOADING
// ================================
const sidebarButtons = document.querySelectorAll(".sidebarBtn");
const mainContentArea = document.getElementById("main-content-area");

async function loadPageIntoMainContent(url) {
    mainContentArea.innerHTML = '<div class="text-center p-12 text-lg text-gray-500 font-semibold">Loading content...</div>';

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load page: ${res.status}`);
        const html = await res.text();
        mainContentArea.innerHTML = html;

        // Conditional page-specific loading
        if (url.includes("dashboardoverview.html")) { await loadDashboardSummary(); await loadAccessChart(); }
        else if (url.includes("membership.html")) { attachMembershipListeners(); await loadPendingRequests(); }
        else if (url.includes("membershiprecords.html")) { attachMembershipListeners(); await loadApprovedResidents(); }
        // Add other pages as needed...
    } catch (err) {
        console.error("Error loading page:", err);
        mainContentArea.innerHTML = `<div class="p-6 text-red-600 font-bold">Failed to load: ${url}</div>`;
    }
}

// Sidebar click events
sidebarButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        sidebarButtons.forEach(b => b.classList.remove("bg-blue-600", "text-white"));
        btn.classList.add("bg-blue-600", "text-white");
        const page = btn.dataset.target;
        if (page) loadPageIntoMainContent(page);
    });
});

// ================================
// 🔹 INITIALIZATION ON PAGE LOAD
// ================================
document.addEventListener('DOMContentLoaded', () => {
    // Load default page
    loadPageIntoMainContent('sections/dashboardoverview.html');
});
