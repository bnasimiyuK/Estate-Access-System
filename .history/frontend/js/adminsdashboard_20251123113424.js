// adminsdashboard.js
// This file now includes ALL necessary data loading logic (including Membership)
// to handle dynamic page loading in the Admin Dashboard.

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
        msgElement.className = `p-3 rounded-lg text-sm font-semibold mb-3 ${isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`;
        
        setTimeout(() => {
            msgElement.textContent = '';
            msgElement.className = 'text-sm text-gray-700 mb-3';
        }, 5000);
    }
}

function formatTimestamp(timestamp) {
    try {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString();
    } catch (e) {
        return 'N/A';
    }
}

const safeUpdate = (id, value, suffix = '') => {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value + suffix;
    }
};

// ====================================================================
// 🟢 CORE MEMBERSHIP LOGIC
// ====================================================================

async function handleApproveClick(requestId) {
    safeUpdate('actionText', `Processing Approval for ${requestId}...`);
    try {
        const resp = await fetch(ENDPOINTS.APPROVE_REQUEST(requestId), { method: 'PUT', headers: getAuthHeaders() });
        if (!resp.ok) throw new Error(await resp.json().catch(() => ({ message: resp.statusText })).then(d => d.message || `Approval failed`));
        safeUpdate('actionText', `Approved Request ${requestId}`);
        displayMessage(`Successfully approved membership request ${requestId}.`, false);
        await loadPendingRequests();
        await loadApprovedResidents();
    } catch (e) {
        console.error("Approval Operation Failed:", e);
        displayMessage(`Approval failed for ${requestId}: ${e.message}`, true);
    }
}

async function handleRejectClick(requestId) {
    safeUpdate('actionText', `Processing Rejection for ${requestId}...`);
    if (!confirm(`Are you sure you want to REJECT request ${requestId}?`)) return;
    try {
        const resp = await fetch(ENDPOINTS.REJECT_REQUEST(requestId), { method: 'PUT', headers: getAuthHeaders() });
        if (!resp.ok) throw new Error(await resp.json().catch(() => ({ message: resp.statusText })).then(d => d.message || `Rejection failed`));
        safeUpdate('actionText', `Rejected Request ${requestId}`);
        displayMessage(`Successfully rejected membership request ${requestId}.`, false);
        await loadPendingRequests();
        await loadApprovedResidents();
    } catch (e) {
        console.error("Rejection Operation Failed:", e);
        displayMessage(`Rejection failed for ${requestId}: ${e.message}`, true);
    }
}

async function handleDeleteClick(requestId) {
    safeUpdate('actionText', `Processing Deletion for ${requestId}...`);
    if (!confirm(`Are you sure you want to DELETE request ${requestId}? This action is permanent.`)) return;
    try {
        const resp = await fetch(ENDPOINTS.DELETE_REQUEST(requestId), { method: 'DELETE', headers: getAuthHeaders() });
        if (!resp.ok) throw new Error(await resp.json().catch(() => ({ message: resp.statusText })).then(d => d.message || `Deletion failed`));
        safeUpdate('actionText', `Deleted Request ${requestId}`);
        displayMessage(`Successfully deleted membership request ${requestId}.`, false);
        await loadPendingRequests();
        await loadApprovedResidents();
    } catch (e) {
        console.error("Deletion Operation Failed:", e);
        displayMessage(`Deletion failed for ${requestId}: ${e.message}`, true);
    }
}

async function handleSyncClick(event) {
    const btn = event.currentTarget;
    const originalText = btn.textContent;
    const originalClasses = btn.className;
    btn.disabled = true;
    btn.textContent = 'Syncing...';
    btn.className = 'bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 animate-pulse min-w-[100px]';
    try {
        const resp = await fetch(ENDPOINTS.SYNC, { method: 'POST', headers: getAuthHeaders() });
        if (!resp.ok) throw new Error(await resp.json().catch(() => ({ message: resp.statusText })).then(d => d.message || `Sync failed`));
        btn.textContent = 'Sync Complete! ✔️';
        btn.className = 'bg-green-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 min-w-[100px]';
        displayMessage("Data synchronization was successful. Tables reloading...", false);
        await loadPendingRequests();
        await loadApprovedResidents();
    } catch (err) {
        console.error("Synchronization Error:", err.message);
        btn.textContent = 'Sync Failed ❌';
        btn.className = 'bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 min-w-[100px]';
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
                        <button class="approve-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition duration-150 shadow-md" data-request-id="${requestId}">Approve</button>
                        <button class="reject-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition duration-150 shadow-md" data-request-id="${requestId}">Reject</button>
                        <button class="delete-btn bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs transition duration-150 shadow-md" data-request-id="${requestId}">Delete</button>
                    </td>
                `;
            });
            tableBody.querySelectorAll('.approve-btn').forEach(button => button.addEventListener('click', (e) => handleApproveClick(e.target.getAttribute('data-request-id'))));
            tableBody.querySelectorAll('.reject-btn').forEach(button => button.addEventListener('click', (e) => handleRejectClick(e.target.getAttribute('data-request-id'))));
            tableBody.querySelectorAll('.delete-btn').forEach(button => button.addEventListener('click', (e) => handleDeleteClick(e.target.getAttribute('data-request-id'))));
        }
    } catch (error) {
        console.error("Error loading pending requests:", error);
        tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-red-500 italic">Error loading data. Check console for details.</td></tr>';
        displayMessage("Failed to load pending requests from API.", true);
    }
}

// ====================================================================
// 🔹 ACCESS LOGS FOR ADMIN DASHBOARD
// ====================================================================

const logsTableBody = document.getElementById("logsTableBody");
const filterInputs = document.querySelectorAll("#accesslogs .filterInput");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportExcelBtn = document.getElementById("exportExcelBtn");

async function loadaccesslogs() {
  if (!logsTableBody) return;
  logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-blue-500 italic">Loading access logs...</td></tr>`;
  try {
    const res = await fetch(`${API_HOST}/api/security/accesslogs`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to fetch access logs");
    const logs = await res.json();
    if (!logs.length) {
      logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500 italic">No access logs found.</td></tr>`;
      return;
    }
    logsTableBody.innerHTML = "";
    logs.forEach(log => {
      const row = document.createElement("tr");
      row.className = "hover:bg-gray-100 transition-colors duration-100";
      row.innerHTML = `
        <td class="p-2 border-b border-gray-300">${new Date(log.timestamp).toLocaleString()}</td>
        <td class="p-2 border-b border-gray-300">${log.userId}</td>
        <td class="p-2 border-b border-gray-300">${log.action}</td>
        <td class="p-2 border-b border-gray-300">${log.logType}</td>
      `;
      logsTableBody.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-red-500">Error loading access logs</td></tr>`;
  }
}

filterInputs.forEach((input, colIndex) => {
  input.addEventListener("input", () => {
    const filterValue = input.value.toLowerCase();
    const rows = logsTableBody.querySelectorAll("tr");
    rows.forEach(row => {
      const cell = row.cells[colIndex];
      row.style.display = cell && cell.textContent.toLowerCase().includes(filterValue) ? "" : "none";
    });
  });
});

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
exportExcelBtn?.addEventListener("click", downloadCSV);

document.addEventListener("DOMContentLoaded", () => {
  loadaccesslogs();
});
