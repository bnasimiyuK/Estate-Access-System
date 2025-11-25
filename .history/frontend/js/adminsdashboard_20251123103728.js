// =========================================================
// adminsdashboard.js
// Complete Admin Dashboard JS with all logic & sidebar handling
// =========================================================

// ================================
// 🔑 ENVIRONMENT & AUTH SETUP
// ================================
const API_HOST = "http://localhost:4050"; 
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
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("accessToken");
  window.location.href = "/login.html";
});

// ================================
// UTILITIES & HELPERS
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
  try { return new Date(timestamp).toLocaleString(); }
  catch { return 'N/A'; }
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
    const resp = await fetch(ENDPOINTS.APPROVE_REQUEST(requestId), { method: 'PUT', headers: getAuthHeaders() });
    if (!resp.ok) throw new Error((await resp.json()).message || `Approval failed`);
    safeUpdate('actionText', `Approved Request ${requestId}`);
    displayMessage(`Successfully approved membership request ${requestId}.`);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (e) {
    console.error(e);
    displayMessage(`Approval failed for ${requestId}: ${e.message}`, true);
  }
}

async function handleRejectClick(requestId) {
  safeUpdate('actionText', `Processing Rejection for ${requestId}...`);
  if (!confirm(`Are you sure you want to REJECT request ${requestId}?`)) return;
  try {
    const resp = await fetch(ENDPOINTS.REJECT_REQUEST(requestId), { method: 'PUT', headers: getAuthHeaders() });
    if (!resp.ok) throw new Error((await resp.json()).message || `Rejection failed`);
    safeUpdate('actionText', `Rejected Request ${requestId}`);
    displayMessage(`Successfully rejected membership request ${requestId}.`);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (e) {
    console.error(e);
    displayMessage(`Rejection failed for ${requestId}: ${e.message}`, true);
  }
}

async function handleDeleteClick(requestId) {
  safeUpdate('actionText', `Processing Deletion for ${requestId}...`);
  if (!confirm(`Are you sure you want to DELETE request ${requestId}?`)) return;
  try {
    const resp = await fetch(ENDPOINTS.DELETE_REQUEST(requestId), { method: 'DELETE', headers: getAuthHeaders() });
    if (!resp.ok) throw new Error((await resp.json()).message || `Deletion failed`);
    safeUpdate('actionText', `Deleted Request ${requestId}`);
    displayMessage(`Successfully deleted membership request ${requestId}.`);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (e) {
    console.error(e);
    displayMessage(`Deletion failed for ${requestId}: ${e.message}`, true);
  }
}

async function handleSyncClick(event) {
  const btn = event.currentTarget;
  const originalText = btn.textContent;
  const originalClasses = btn.className;
  btn.disabled = true;
  btn.textContent = 'Syncing...';
  btn.className = 'bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold shadow-md animate-pulse min-w-[100px]';
  try {
    const resp = await fetch(ENDPOINTS.SYNC, { method: 'POST', headers: getAuthHeaders() });
    if (!resp.ok) throw new Error((await resp.json()).message || `Sync failed`);
    btn.textContent = 'Sync Complete! ✔️';
    btn.className = 'bg-green-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md min-w-[100px]';
    displayMessage("Data synchronization successful.");
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (err) {
    console.error(err);
    btn.textContent = 'Sync Failed ❌';
    btn.className = 'bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md min-w-[100px]';
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
    noRequestsMsg.classList.toggle('hidden', requests.length > 0);
    requests.forEach(request => {
      const row = tableBody.insertRow();
      row.className = 'hover:bg-blue-50 transition-colors duration-100';
      const requestedAt = formatTimestamp(request.RequestedAt || request.requestedAt);
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
        <td>${requestedAt}</td>
        <td class="flex space-x-2 justify-center">
          <button class="approve-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs" data-request-id="${requestId}">Approve</button>
          <button class="reject-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs" data-request-id="${requestId}">Reject</button>
          <button class="delete-btn bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs" data-request-id="${requestId}">Delete</button>
        </td>
      `;
    });
    tableBody.querySelectorAll('.approve-btn').forEach(b => b.addEventListener('click', e => handleApproveClick(e.target.dataset.requestId)));
    tableBody.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', e => handleRejectClick(e.target.dataset.requestId)));
    tableBody.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', e => handleDeleteClick(e.target.dataset.requestId)));
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = '<tr><td colspan="11" class="text-center text-red-500">Error loading requests.</td></tr>';
    displayMessage("Failed to load pending requests.", true);
  }
}

async function loadApprovedResidents() {
  const tableBody = document.getElementById('residentsTableBody');
  const noResidentsMsg = document.getElementById('noApprovedResidents');
  if (!tableBody || !noResidentsMsg) return;
  tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-blue-500 italic">Loading approved residents...</td></tr>';
  try {
    const resp = await fetch(ENDPOINTS.APPROVED_RESIDENTS, { headers: getAuthHeaders() });
    if (!resp.ok) throw new Error("Failed to fetch approved residents.");
    const residents = await resp.json();
    tableBody.innerHTML = '';
    noResidentsMsg.classList.toggle('hidden', residents.length > 0);
    residents.forEach(r => {
      const row = tableBody.insertRow();
      row.className = 'hover:bg-blue-50 transition-colors duration-100';
      row.innerHTML = `
        <td>${r.ResidentName || 'N/A'}</td>
        <td>${r.NationalID || 'N/A'}</td>
        <td>${r.PhoneNumber || 'N/A'}</td>
        <td>${r.Email || 'N/A'}</td>
        <td>${r.HouseNumber || 'N/A'}</td>
        <td>${r.CourtName || 'N/A'}</td>
        <td>${r.RoleName || 'N/A'}</td>
      `;
    });
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-red-500">Error loading approved residents.</td></tr>';
    displayMessage("Failed to load approved residents.", true);
  }
}

function attachMembershipListeners() {
  document.getElementById("syncBtn")?.addEventListener("click", handleSyncClick);
  document.getElementById("clearFilterBtn")?.addEventListener("click", () => {
    document.getElementById('requestIdFilter').value = "";
    document.getElementById('residentFilter').value = "";
    displayMessage("Filters cleared.", false);
  });
}

// ================================
// 🚀 DASHBOARD LOGIC
// ================================
async function loadDashboardSummary() {
  try {
    const res = await fetch(ENDPOINTS.DASHBOARD_SUMMARY, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    safeUpdate("totalResidents", data.residents || 0);
    safeUpdate("pendingPayments", data.pendingPayments || 0);
    safeUpdate("compliancePct", data.compliance || 0, '%');
    safeUpdate("overrideCount", data.overrides || 0);
  } catch (err) { console.error(err); }
}

async function loadAccessChart() {
  try {
    const res = await fetch(ENDPOINTS.DASHBOARD_CHART, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const ctx = document.getElementById("accessChart")?.getContext("2d");
    if (!ctx) return;
    if (window.accessChartInstance) window.accessChartInstance.destroy();
    window.accessChartInstance = new Chart(ctx, {
      type: "line",
      data: { labels: data.days || [], datasets: [{ label: "Access Attempts", data: data.counts || [], borderWidth: 2, tension: 0.4, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.2)', fill: true }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  } catch (err) { console.error(err); }
}

// ================================
// 🧭 SIDEBAR & PAGE LOADING
// ================================
const sidebarButtons = document.querySelectorAll(".sidebarBtn");
const mainContentArea = document.getElementById("main-content-area");
const visitorToggle = document.getElementById("visitorManagementToggle");
const visitorSubMenu = document.getElementById("visitorSubMenu");
const visitorArrow = document.getElementById("visitorArrow");

async function loadPageIntoMainContent(url) {
  mainContentArea.innerHTML = '<div class="text-center p-12 text-lg text-gray-500 font-semibold">Loading content...</div>';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load page: ${res.status}`);
    const html = await res.text();
    mainContentArea.innerHTML = html;

    if (url.includes("dashboardoverview.html")) {
      await loadDashboardSummary(); await loadAccessChart();
    } else if (url.includes("membershiprecords.html")) {
      attachMembershipListeners(); await loadApprovedResidents();
    } else if (url.includes("membership.html")) {
      attachMembershipListeners(); await loadPendingRequests();
    } 
    // Additional page-specific loaders can go here...
  } catch (err) {
    console.error(err);
    mainContentArea.innerHTML = `<div class="p-6 text-red-600 font-bold">Failed to load: ${url}</div>`;
  }
}

sidebarButtons.forEach(btn => {
  btn.addEventListener("click", async () => {
    sidebarButtons.forEach(b => {
      b.classList.remove("bg-blue-600","text-white","shadow-inner");
      if (b.closest('#visitorSubMenu')) b.classList.add("bg-gray-600","hover:bg-blue-500/50","text-white");
      else b.classList.add("bg-gray-700","hover:bg-gray-600","text-white");
    });
    btn.classList.add("bg-blue-600","text-white","shadow-inner");
    if (btn.closest('#visitorSubMenu')) {
      visitorToggle?.classList.add("bg-blue-600","text-white");
      visitorSubMenu?.classList.remove("hidden");
      visitorArrow?.classList.add("rotate-90");
    }
    const page = btn.dataset.target;
    if (page) await loadPageIntoMainContent(page);
  });
});

visitorToggle?.addEventListener("click", () => {
  visitorSubMenu?.classList.toggle("hidden");
  visitorArrow?.classList.toggle("rotate-90");
});

// ================================
// INITIAL LOAD
// ================================
document.addEventListener('DOMContentLoaded', () => {
  loadPageIntoMainContent('sections/dashboardoverview.html');
});
