// adminsdashboard.js
// Full admin dashboard JS with working sidebar and page loaders

// ================================
// 🔑 ENVIRONMENT & AUTH SETUP
// ================================
const API_HOST = "http://localhost:4050";
const token = localStorage.getItem("accessToken");
if (!token) window.location.href = "/login.html";

// ================================
// API ENDPOINTS
// ================================
const ENDPOINTS = {
    // Dashboard
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
// UTILITIES
// ================================
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

function displayMessage(message, isError = false) {
    const msgElement = document.getElementById('msg');
    if (msgElement) {
        msgElement.textContent = message;
        msgElement.className = `p-3 rounded-lg text-sm font-semibold mb-3 ${
            isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`;
        setTimeout(() => {
            msgElement.textContent = '';
            msgElement.className = 'text-sm text-gray-700 mb-3';
        }, 5000);
    }
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
}

const safeUpdate = (id, value, suffix = '') => {
    const element = document.getElementById(id);
    if (element) element.textContent = value + suffix;
};

// ================================
// 🟢 MEMBERSHIP LOGIC
// ================================
async function handleApproveClick(requestId) {
    safeUpdate('actionText', `Processing Approval for ${requestId}...`);
    try {
        const resp = await fetch(ENDPOINTS.APPROVE_REQUEST(requestId), {
            method: 'PUT',
            headers: getAuthHeaders(),
        });
        if (!resp.ok) throw new Error((await resp.json()).message || `Approval failed: ${resp.status}`);
        safeUpdate('actionText', `Approved Request ${requestId}`);
        displayMessage(`Successfully approved membership request ${requestId}.`);
        await loadPendingRequests();
        await loadApprovedResidents();
    } catch (e) {
        console.error("Approval Failed:", e);
        displayMessage(`Approval failed: ${e.message}`, true);
    }
}

async function handleRejectClick(requestId) {
    safeUpdate('actionText', `Processing Rejection for ${requestId}...`);
    if (!confirm(`Are you sure you want to REJECT request ${requestId}?`)) return;
    try {
        const resp = await fetch(ENDPOINTS.REJECT_REQUEST(requestId), {
            method: 'PUT',
            headers: getAuthHeaders(),
        });
        if (!resp.ok) throw new Error((await resp.json()).message || `Rejection failed: ${resp.status}`);
        safeUpdate('actionText', `Rejected Request ${requestId}`);
        displayMessage(`Successfully rejected membership request ${requestId}.`);
        await loadPendingRequests();
        await loadApprovedResidents();
    } catch (e) {
        console.error("Rejection Failed:", e);
        displayMessage(`Rejection failed: ${e.message}`, true);
    }
}

async function handleDeleteClick(requestId) {
    safeUpdate('actionText', `Processing Deletion for ${requestId}...`);
    if (!confirm(`Are you sure you want to DELETE request ${requestId}?`)) return;
    try {
        const resp = await fetch(ENDPOINTS.DELETE_REQUEST(requestId), {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!resp.ok) throw new Error((await resp.json()).message || `Deletion failed: ${resp.status}`);
        safeUpdate('actionText', `Deleted Request ${requestId}`);
        displayMessage(`Successfully deleted membership request ${requestId}.`);
        await loadPendingRequests();
        await loadApprovedResidents();
    } catch (e) {
        console.error("Deletion Failed:", e);
        displayMessage(`Deletion failed: ${e.message}`, true);
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
        if (!resp.ok) throw new Error((await resp.json()).message || `Sync failed: ${resp.status}`);
        btn.textContent = 'Sync Complete! ✔️';
        btn.className = 'bg-green-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md';
        displayMessage("Data synchronization successful!");
        await loadPendingRequests();
        await loadApprovedResidents();
    } catch (err) {
        console.error("Sync Failed:", err);
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

    tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-blue-500 italic">Loading...</td></tr>';

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
<td>${requestId}</td>
<td>${request.ResidentName || 'N/A'}</td>
<td>${request.NationalID || 'N/A'}</td>
<td>${request.PhoneNumber || 'N/A'}</td>
<td>${request.Email || 'N/A'}</td>
<td>${request.HouseNumber || 'N/A'}</td>
<td>${request.CourtName || 'N/A'}</td>
<td>${request.RoleName || 'N/A'}</td>
<td><span class="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs">${request.Status || 'Pending'}</span></td>
<td>${requestedAtString}</td>
<td class="flex space-x-2">
<button class="approve-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs" data-request-id="${requestId}">Approve</button>
<button class="reject-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs" data-request-id="${requestId}">Reject</button>
<button class="delete-btn bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs" data-request-id="${requestId}">Delete</button>
</td>`;
            });
            tableBody.querySelectorAll('.approve-btn').forEach(btn => btn.addEventListener('click', e => handleApproveClick(e.target.dataset.requestId)));
            tableBody.querySelectorAll('.reject-btn').forEach(btn => btn.addEventListener('click', e => handleRejectClick(e.target.dataset.requestId)));
            tableBody.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', e => handleDeleteClick(e.target.dataset.requestId)));
        }
    } catch (err) {
        console.error("Error loading pending requests:", err);
        tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-red-500 italic">Failed to load pending requests.</td></tr>';
        displayMessage("Failed to load pending requests from API.", true);
    }
}

async function loadApprovedResidents() {
    const tableBody = document.getElementById('residentsTableBody');
    const noResidentsMsg = document.getElementById('noApprovedResidents');
    if (!tableBody || !noResidentsMsg) return;

    tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-blue-500 italic">Loading...</td></tr>';
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
<td>${resident.ResidentName || 'N/A'}</td>
<td>${resident.NationalID || 'N/A'}</td>
<td>${resident.PhoneNumber || 'N/A'}</td>
<td>${resident.Email || 'N/A'}</td>
<td>${resident.HouseNumber || 'N/A'}</td>
<td>${resident.CourtName || 'N/A'}</td>
<td>${resident.RoleName || 'N/A'}</td>`;
            });
        }
    } catch (err) {
        console.error("Error loading approved residents:", err);
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-red-500 italic">Failed to load approved residents.</td></tr>';
        displayMessage("Failed to load approved residents.", true);
    }
}

// ================================
// 🧭 SIDEBAR & PAGE LOADING
// ================================
const sidebarButtons = document.querySelectorAll(".sidebarBtn");
const mainContentArea = document.getElementById("main-content-area");

async function loadPageIntoMainContent(page) {
    mainContentArea.innerHTML = '<div class="text-center p-12 text-lg text-gray-500 font-semibold">Loading content...</div>';
    try {
        const res = await fetch(`./sections/${page}`);
        if (!res.ok) throw new Error(`Failed to load page: ${res.status}`);
        const html = await res.text();
        mainContentArea.innerHTML = html;

        // Call loaders
        if (page === "dashboardoverview.html") {
            await loadDashboardSummary();
            await loadAccessChart();
        } else if (page === "membership.html") {
            attachMembershipListeners();
            await loadPendingRequests();
        } else if (page === "membershiprecords.html") {
            attachMembershipListeners();
            await loadApprovedResidents();
        }
    } catch (err) {
        console.error("Error loading page:", err);
        mainContentArea.innerHTML = `<div class="p-6 text-red-600 font-bold">Failed to load: ${page}. Check console for details.</div>`;
    }
}

// Sidebar button click
sidebarButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        sidebarButtons.forEach(b => b.classList.remove("bg-blue-600", "text-white"));
        btn.classList.add("bg-blue-600", "text-white");
        const page = btn.dataset.target;
        if (page) await loadPageIntoMainContent(page);
    });
});

// ================================
// INITIALIZATION
// ================================
document.addEventListener('DOMContentLoaded', () => {
    loadPageIntoMainContent('dashboardoverview.html');
});
