// adminsdashboard.js
// Cleaned, refactored, production-ready admin dashboard loader.
// Assumes Chart.js is loaded and HTML uses <div id="main-content-area"> as container.

// ================================
// ENV + AUTH
// ================================
const API_HOST = "http://localhost:4050";
const token = localStorage.getItem("accessToken");
const userRole = localStorage.getItem("userRole") || "admin";

if (!token) {
  // if not logged in redirect
  window.location.href = "/login.html";
}

// ================================
// ENDPOINTS (keeps admin/resident variations)
// ================================
const ENDPOINTS = {
  DASHBOARD_SUMMARY:
    userRole === "admin"
      ? `${API_HOST}/api/admin/dashboard/summary`
      : `${API_HOST}/api/admin/dashboard/summary`, // keep admin path by default
  DASHBOARD_CHART:
    userRole === "admin"
      ? `${API_HOST}/api/admin/dashboard/accesschart`
      : `${API_HOST}/api/admin/dashboard/accesschart`,
  SYNC: `${API_HOST}/api/admin/sync`,
  PENDING_REQUESTS: `${API_HOST}/api/admin/requests/pending`,
  APPROVED_RESIDENTS: `${API_HOST}/api/admin/residents/approved`,
  APPROVE_REQUEST: (id) => `${API_HOST}/api/admin/approve/${id}`,
  REJECT_REQUEST: (id) => `${API_HOST}/api/admin/reject/${id}`,
  DELETE_REQUEST: (id) => `${API_HOST}/api/admin/delete/${id}`,
  MEMBERSHIP_POST: `${API_HOST}/api/admin/requests`,
  PAYMENTS_RECORDS: `${API_HOST}/api/admin/payments/records`,
  ALL_RESIDENTS: `${API_HOST}/api/admin/residents/all`,
  VISITOR_OVERVIEW: `${API_HOST}/api/admin/visitors/overview`,
  PENDING_VISITOR_APPROVALS: `${API_HOST}/api/admin/visitors/pending`,
  REPORTS_DATA: `${API_HOST}/api/admin/reports`,
  MANUAL_OVERRIDES_LOGS: `${API_HOST}/api/admin/override/logs`,
  MANUAL_OVERRIDE_ACTION: `${API_HOST}/api/admin/override/action`,
  ACCESS_LOGS:
    userRole === "admin" ? `${API_HOST}/api/admin/accesslogs` : `${API_HOST}/api/accesslogs`,
  COURTS_ALL: `${API_HOST}/api/courts/all`,
  COURTS_BASE: `${API_HOST}/api/courts`,
};

// ================================
// HELPERS
// ================================
function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function displayMessage(message, isError = false) {
  const el = document.getElementById("msg");
  if (!el) {
    if (isError) console.error(message);
    else console.log(message);
    return;
  }
  el.textContent = message;
  el.className = `p-3 rounded-lg text-sm font-semibold mb-3 ${
    isError ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
  }`;
  setTimeout(() => {
    el.textContent = "";
    el.className = "text-sm text-gray-700 mb-3";
  }, 5000);
}

function safeUpdate(id, value, suffix = "") {
  const el = document.getElementById(id);
  if (el) el.textContent = value + (suffix || "");
}

function formatTimestamp(ts) {
  if (!ts) return "N/A";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "N/A";
  }
}

// ================================
// COURTS
// ================================
async function loadCourts(selector) {
  const dropdown = document.querySelector(selector);
  if (!dropdown) {
    console.warn("loadCourts: selector not found:", selector);
    return;
  }

  try {
    const res = await fetch(ENDPOINTS.COURTS_ALL, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch courts (${res.status})`);
    const courts = await res.json();
    dropdown.innerHTML = `<option value="">Select Court</option>`;
    courts.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.CourtID ?? c.id ?? "";
      opt.textContent = c.CourtName ?? c.name ?? "Court";
      dropdown.appendChild(opt);
    });
  } catch (e) {
    console.error("loadCourts error:", e);
  }
}

// ================================
// MEMBERSHIP ACTIONS (approve/reject/delete/sync)
// ================================
async function handleApproveClick(requestId) {
  if (!requestId) return;
  safeUpdate("actionText", `Approving ${requestId}...`);
  try {
    const resp = await fetch(ENDPOINTS.APPROVE_REQUEST(requestId), {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).message || "Approval failed");
    displayMessage(`Approved ${requestId}`, false);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (e) {
    displayMessage(`Approve failed: ${e.message}`, true);
  }
}

async function handleRejectClick(requestId) {
  if (!requestId) return;
  if (!confirm(`Reject request ${requestId}?`)) return;
  try {
    const resp = await fetch(ENDPOINTS.REJECT_REQUEST(requestId), {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).message || "Reject failed");
    displayMessage(`Rejected ${requestId}`, false);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (e) {
    displayMessage(`Reject failed: ${e.message}`, true);
  }
}

async function handleDeleteClick(requestId) {
  if (!requestId) return;
  if (!confirm(`Delete request ${requestId}?`)) return;
  try {
    const resp = await fetch(ENDPOINTS.DELETE_REQUEST(requestId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).message || "Delete failed");
    displayMessage(`Deleted ${requestId}`, false);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (e) {
    displayMessage(`Delete failed: ${e.message}`, true);
  }
}

async function handleSyncClick(e) {
  const btn = e.currentTarget;
  if (!btn) return;
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Syncing...";
  try {
    const resp = await fetch(ENDPOINTS.SYNC, { method: "POST", headers: getAuthHeaders() });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).message || "Sync failed");
    displayMessage("Sync complete", false);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (err) {
    displayMessage(`Sync failed: ${err.message}`, true);
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}

// ================================
// LOADERS: Pending / Approved / Access Logs
// ================================
async function loadPendingRequests() {
  const tbody = document.getElementById("membershipTableBody");
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="11">Loading...</td></tr>';

  try {
    const resp = await fetch(ENDPOINTS.PENDING_REQUESTS, { headers: getAuthHeaders() });
    if (!resp.ok) throw new Error("Failed to fetch pending requests");
    const requests = await resp.json();
    if (!Array.isArray(requests) || requests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11">No requests</td></tr>';
      return;
    }
    tbody.innerHTML = "";
    requests.forEach((r) => {
      const id = r.RequestID ?? r.id ?? "";
      const row = tbody.insertRow();
      row.innerHTML = `
                <td>${id}</td>
                <td>${r.ResidentName ?? "N/A"}</td>
                <td>${r.NationalID ?? "N/A"}</td>
                <td>${r.PhoneNumber ?? "N/A"}</td>
                <td>${r.Email ?? "N/A"}</td>
                <td>${r.HouseNumber ?? "N/A"}</td>
                <td>${r.CourtName ?? "N/A"}</td>
                <td>${r.RoleName ?? "N/A"}</td>
                <td>${r.Status ?? "Pending"}</td>
                <td>${formatTimestamp(r.RequestedAt ?? r.requestedAt)}</td>
                <td class="flex space-x-1">
                  <button class="approve-btn px-2 py-1 bg-green-600 text-white rounded text-xs" data-id="${id}">Approve</button>
                  <button class="reject-btn px-2 py-1 bg-yellow-600 text-white rounded text-xs" data-id="${id}">Reject</button>
                  <button class="delete-btn px-2 py-1 bg-red-600 text-white rounded text-xs" data-id="${id}">Delete</button>
                </td>
            `;
    });

    // wire buttons
    tbody.querySelectorAll(".approve-btn").forEach((b) =>
      b.addEventListener("click", (ev) => handleApproveClick(ev.currentTarget.dataset.id))
    );
    tbody.querySelectorAll(".reject-btn").forEach((b) =>
      b.addEventListener("click", (ev) => handleRejectClick(ev.currentTarget.dataset.id))
    );
    tbody.querySelectorAll(".delete-btn").forEach((b) =>
      b.addEventListener("click", (ev) => handleDeleteClick(ev.currentTarget.dataset.id))
    );
  } catch (e) {
    displayMessage(`Failed to load pending requests: ${e.message}`, true);
  }
}

async function loadApprovedResidents() {
  const tbody = document.getElementById("residentsTableBody");
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

  try {
    const resp = await fetch(ENDPOINTS.APPROVED_RESIDENTS, { headers: getAuthHeaders() });
    if (!resp.ok) throw new Error("Failed to fetch approved residents");
    const residents = await resp.json();
    if (!Array.isArray(residents) || residents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">No residents</td></tr>';
      return;
    }
    tbody.innerHTML = "";
    residents.forEach((r) => {
      const row = tbody.insertRow();
      row.innerHTML = `
                <td>${r.ResidentName ?? "N/A"}</td>
                <td>${r.NationalID ?? "N/A"}</td>
                <td>${r.PhoneNumber ?? "N/A"}</td>
                <td>${r.Email ?? "N/A"}</td>
                <td>${r.HouseNumber ?? "N/A"}</td>
                <td>${r.CourtName ?? "N/A"}</td>
                <td>${r.RoleName ?? "N/A"}</td>
            `;
    });
  } catch (e) {
    displayMessage(`Failed to load approved residents: ${e.message}`, true);
  }
}

async function loadAccessLogs() {
  const tbody = document.getElementById("logsTableBody");
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
  try {
    const resp = await fetch(ENDPOINTS.ACCESS_LOGS, { headers: getAuthHeaders() });
    if (!resp.ok) throw new Error("Failed to fetch access logs");
    const logs = await resp.json();
    if (!Array.isArray(logs) || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No logs found</td></tr>';
      return;
    }
    tbody.innerHTML = "";
    logs.forEach((log) => {
      const row = tbody.insertRow();
      row.innerHTML = `
                <td>${formatTimestamp(log.TimestampUtc ?? log.timestamp)}</td>
                <td>${log.UserId ?? log.userId ?? "N/A"}</td>
                <td>${log.Action ?? log.action ?? "N/A"}</td>
                <td>${log.LogType ?? log.type ?? "N/A"}</td>
            `;
    });
  } catch (e) {
    displayMessage(`Failed to load access logs: ${e.message}`, true);
  }
}

// ================================
// DASHBOARD: summary + chart
// ================================
let accessChartInstance = null;

async function loadDashboardSummary() {
  try {
    const res = await fetch(ENDPOINTS.DASHBOARD_SUMMARY, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(res.statusText || `HTTP ${res.status}`);
    const d = await res.json();
    // Use keys that may exist in different backend versions
    safeUpdate("totalResidents", d.TotalResidents ?? d.residents ?? d.totalResidents ?? 0);
    safeUpdate("pendingPayments", d.pendingPayments ?? d.PendingPayments ?? 0);
    safeUpdate("compliancePct", d.compliance ?? d.Compliance ?? 0, "%");
    safeUpdate("overrideCount", d.overrides ?? d.OverrideCount ?? d.overrideCount ?? 0);
  } catch (e) {
    console.error("loadDashboardSummary error:", e);
  }
}

async function loadAccessChart() {
  try {
    const res = await fetch(ENDPOINTS.DASHBOARD_CHART, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(res.statusText || `HTTP ${res.status}`);
    const data = await res.json();

    const canvas = document.getElementById("accessChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // normalize expected shape
    const labels = data.labels ?? data.days ?? data.map?.((r) => r.Month) ?? [];
    const counts = data.counts ?? data.values ?? data.map?.((r) => r.TotalAccess) ?? [];

    if (accessChartInstance) accessChartInstance.destroy();
    accessChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Access Attempts",
            data: counts,
            borderWidth: 2,
            fill: true,
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  } catch (e) {
    console.error("loadAccessChart error:", e);
  }
}

// ================================
// PAGE LOADING + SIDEBAR WIRING
// ================================
let mainContent = null;
let sidebarButtons = [];

async function loadPageIntoMainContent(url) {
  if (!mainContent) {
    console.warn("#main-content-area not found. Aborting page load:", url);
    return;
  }

  mainContent.innerHTML = '<div class="p-6">Loading...</div>';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    mainContent.innerHTML = html;

    // page-specific initialization (must match your files)
    if (url.includes("dashboardoverview.html") || url.includes("dashboardoverview")) {
      await loadDashboardSummary();
      await loadAccessChart();
    } else if (url.includes("membership.html")) {
      attachMembershipListeners();
      await loadCourts("#courtDropdown");
      await loadPendingRequests();
    } else if (url.includes("membershiprecords.html")) {
      attachMembershipListeners();
      await loadApprovedResidents();
    } else if (url.includes("accesslogs.html")) {
      await loadAccessLogs();
    } else if (url.includes("residents.html")) {
      await loadApprovedResidents();
    }
  } catch (e) {
    console.error("loadPageIntoMainContent error:", e);
    mainContent.innerHTML = `<div class="text-red-600 p-4">Failed to load ${url}</div>`;
  }
}

function wireSidebarButtons() {
  sidebarButtons = Array.from(document.querySelectorAll(".sidebarBtn"));
  mainContent = document.getElementById("main-content-area");

  if (!mainContent) console.warn("#main-content-area not found");

  sidebarButtons.forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      // active state
      sidebarButtons.forEach((b) => b.classList.remove("bg-blue-600", "text-white"));
      btn.classList.add("bg-blue-600", "text-white");

      const page = btn.dataset.target;
      if (page) loadPageIntoMainContent(page);
    });
  });
}

// ================================
// MEMBERSHIP PAGE LISTENERS + FORM
// ================================
function attachMembershipListeners() {
  // Sync
  document.getElementById("syncBtn")?.addEventListener("click", handleSyncClick);

  // Clear filters
  document.getElementById("clearFilterBtn")?.addEventListener("click", () => {
    const rid = document.getElementById("requestIdFilter");
    const rf = document.getElementById("residentFilter");
    if (rid) rid.value = "";
    if (rf) rf.value = "";
    displayMessage("Filters cleared.", false);
  });

  // Listen for membership form submit
  const membershipForm = document.getElementById("membershipForm");
  if (membershipForm) {
    membershipForm.removeEventListener("submit", membershipFormSubmitHandler);
    membershipForm.addEventListener("submit", membershipFormSubmitHandler);
  }
}

async function membershipFormSubmitHandler(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  try {
    const resp = await fetch(ENDPOINTS.MEMBERSHIP_POST, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).message || "Submit failed");
    displayMessage("Membership request submitted.", false);
    form.reset();
    await loadPendingRequests();
  } catch (err) {
    displayMessage(`Submit failed: ${err.message}`, true);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ================================
// INITIALIZE ON DOMContentLoaded
// ================================
document.addEventListener("DOMContentLoaded", () => {
  // wire logout button (delegated in HTML header)
  document.addEventListener("click", (ev) => {
    if (ev.target && ev.target.id === "logoutBtn") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userRole");
      window.location.href = "/login.html";
    }
  });

  // wire side nav & load default
  wireSidebarButtons();
  // load default dashboard overview
  loadPageIntoMainContent("sections/dashboardoverview.html");
});

// ================================
// OPTIONAL: expose for debugging
// ================================
window._app = {
  loadCourts,
  loadPendingRequests,
  loadApprovedResidents,
  loadAccessLogs,
  loadDashboardSummary,
  loadAccessChart,
  loadPageIntoMainContent,
  endpoints: ENDPOINTS,
};
