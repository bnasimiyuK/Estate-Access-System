// =========================================================
// unifiedDashboard.js - Admin & Security Dashboard Loader (FINAL AMENDED)
// =========================================================

// 🔑 ENVIRONMENT & AUTH SETUP
const API_HOST = "http://localhost:4050";
// ✅ FIX: The token key used here (from login.js) is correctly 'accessToken'.
const AUTH_TOKEN_KEY = "accessToken"; 
const userRole = localStorage.getItem("userRole"); 

if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
  // if no token redirect to login
  window.location.href = "/login.html";
}

// ================================
// ENDPOINTS
const ENDPOINTS = {
  DASHBOARD_SUMMARY:
    userRole === "admin"
      ? `${API_HOST}/api/admin/summary`
      : `${API_HOST}/api/residents/dashboard/summary`,
  DASHBOARD_CHART:
    userRole === "admin"
      ? `${API_HOST}/api/admin/accesschart`
      : `${API_HOST}/api/admin/residents/accesschart`,
  SYNC: `${API_HOST}/api/admin/sync`,
  PENDING_REQUESTS: `${API_HOST}/api/admin/requests/pending`,
  APPROVED_RESIDENTS: `${API_HOST}/api/admin/residents/approved`,
  
  // NOTE: Your original handlers use PUT/DELETE on unique endpoints.
  // We will keep these for now, but the clean POST route is generally preferred.
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
  ACCESS_LOGS:
    userRole === "admin" ? `${API_HOST}/api/admin/accesslogs` : `${API_HOST}/api/accesslogs`,
  COURTS: `${API_HOST}/api/courts`,
};

// ================================
// AUTH & LOGOUT
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "logoutBtn") {
    localStorage.removeItem(AUTH_TOKEN_KEY); // Use the correct constant here
    localStorage.removeItem("userRole");
    window.location.href = "/login.html";
  }
});

// ================================
// UTILITIES
function getAuthHeaders() {
  // This is the functional equivalent of getAuthToken() and is already correct.
  const token = localStorage.getItem(AUTH_TOKEN_KEY); 
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// NOTE: DisplayMessage is being used by the old code blocks, so we keep this one:
function displayMessage(message, isError = false) {
  const msgElement = document.getElementById("msg");
  if (!msgElement) {
    console[isError ? "error" : "log"](message);
    return;
  }
  msgElement.textContent = message;
  msgElement.className = `p-3 rounded-lg text-sm font-semibold mb-3 ${
    isError ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
  }`;
  setTimeout(() => {
    msgElement.textContent = "";
    msgElement.className = "text-sm text-gray-700 mb-3";
  }, 5000);
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "N/A";
  try {
    return new Date(timestamp).toLocaleString();
  } catch (e) {
    return "N/A";
  }
}

const safeUpdate = (id, value, suffix = "") => {
  const el = document.getElementById(id);
  if (el) el.textContent = value + suffix;
};

// ================================
// COURTS (loadCourts)
async function loadCourts(selector) {
    console.log("➡️ loadCourts() CALLED");

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        console.error("❌ No token found in localStorage");
        return;
    }

    const dropdown = document.querySelector(selector);
    if (!dropdown) {
        console.error("❌ Court dropdown element NOT found in DOM:", selector);
        return;
    }

    try {
        console.log("➡️ Fetching courts from backend...");

        const response = await fetch(`${API_HOST}/api/courts/all`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        console.log("➡️ Response status:", response.status);

        if (!response.ok) {
            throw new Error("Backend returned error " + response.status);
        }

        const courts = await response.json();

        console.log("➡️ Courts received:", courts);

        dropdown.innerHTML = `<option value="">Select Court</option>`;
        courts.forEach(court => {
            dropdown.innerHTML += `<option value="${court.CourtID}">${court.CourtName}</option>`;
        });

        console.log("✅ Courts loaded successfully");

    } catch (error) {
        console.error("❌ Failed to load courts:", error);
    }
}

// ================================
// MEMBERSHIP ACTIONS (approve/reject/delete/sync)
// NOTE: These handlers are simpler because they rely on the requestId being 
// passed directly from the button's data-id attribute, avoiding the 
// complex data extraction logic from the previous membershipFormSubmitHandler.
// We keep them because they are correctly wired to the dynamically loaded table.

async function handleApproveClick(requestId) {
  safeUpdate("actionText", `Processing Approval for ${requestId}...`);
  try {
    const resp = await fetch(ENDPOINTS.APPROVE_REQUEST(requestId), {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    // ... rest of approval logic
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).message || `Approval failed`);
    displayMessage(`Successfully approved ${requestId}`, false);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (e) {
    displayMessage(`Approval failed: ${e.message}`, true);
  }
}

async function handleRejectClick(requestId) {
  if (!confirm(`Reject request ${requestId}?`)) return;
  try {
    const resp = await fetch(ENDPOINTS.REJECT_REQUEST(requestId), {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    // ... rest of rejection logic
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).message || `Rejection failed`);
    displayMessage(`Successfully rejected ${requestId}`, false);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (e) {
    displayMessage(`Rejection failed: ${e.message}`, true);
  }
}

// ... (handleDeleteClick and handleSyncClick remain the same) ...
async function handleDeleteClick(requestId) {
  if (!confirm(`Delete request ${requestId}?`)) return;
  try {
    const resp = await fetch(ENDPOINTS.DELETE_REQUEST(requestId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).message || `Deletion failed`);
    displayMessage(`Deleted request ${requestId}`, false);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (e) {
    displayMessage(`Deletion failed: ${e.message}`, true);
  }
}

async function handleSyncClick(event) {
  const btn = event.currentTarget;
  const originalText = btn.textContent,
    originalClass = btn.className;
  btn.disabled = true;
  btn.textContent = "Syncing...";
  btn.className = "bg-yellow-500 text-white px-4 py-2 rounded-lg animate-pulse";
  try {
    const resp = await fetch(ENDPOINTS.SYNC, { method: "POST", headers: getAuthHeaders() });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).message || "Sync failed");
    btn.textContent = "Sync Complete!";
    btn.className = "bg-green-600 text-white px-4 py-2 rounded-lg";
    displayMessage("Data synchronization successful", false);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (err) {
    btn.textContent = "Sync Failed ❌";
    btn.className = "bg-red-600 text-white px-4 py-2 rounded-lg";
    displayMessage(`Sync failed: ${err.message}`, true);
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = originalText;
      btn.className = originalClass;
    }, 3000);
  }
}

// ================================
// LOAD DATA FUNCTIONS
async function loadPendingRequests() {
  const tbody = document.getElementById("membershipTableBody");
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="11">Loading...</td></tr>';
  try {
    const resp = await fetch(ENDPOINTS.PENDING_REQUESTS, { headers: getAuthHeaders() });
    if (!resp.ok) throw new Error("Failed to fetch pending requests");
    const requests = await resp.json();
    tbody.innerHTML = requests.length === 0 ? '<tr><td colspan="11">No requests</td></tr>' : "";
    requests.forEach((r) => {
      const row = tbody.insertRow();
      row.innerHTML = `
                <td>${r.RequestID || r.id || "N/A"}</td>
                <td>${r.ResidentName || "N/A"}</td>
                <td>${r.NationalID || "N/A"}</td>
                <td>${r.PhoneNumber || "N/A"}</td>
                <td>${r.Email || "N/A"}</td>
                <td>${r.HouseNumber || "N/A"}</td>
                <td>${r.CourtName || "N/A"}</td>
                <td>${r.RoleName || "N/A"}</td>
                <td>${r.Status || "Pending"}</td>
                <td>${formatTimestamp(r.RequestedAt || r.requestedAt)}</td>
                <td class="flex space-x-1" data-request-id="${r.RequestID || r.id}">
                    <button class="approve-btn admin-action-button" data-action="Approve" data-id="${r.RequestID || r.id}">Approve</button>
                    <button class="reject-btn admin-action-button" data-action="Reject" data-id="${r.RequestID || r.id}">Reject</button>
                    <button class="delete-btn" data-id="${r.RequestID || r.id}">Delete</button>
                </td>
            `;
    });
    // NOTE: Listeners are correctly wired here for the handle*Click functions.
    tbody.querySelectorAll(".approve-btn").forEach((b) =>
      b.addEventListener("click", (e) => handleApproveClick(e.target.dataset.id))
    );
    tbody.querySelectorAll(".reject-btn").forEach((b) =>
      b.addEventListener("click", (e) => handleRejectClick(e.target.dataset.id))
    );
    tbody.querySelectorAll(".delete-btn").forEach((b) =>
      b.addEventListener("click", (e) => handleDeleteClick(e.target.dataset.id))
    );
  } catch (e) {
    displayMessage(`Failed to load pending requests: ${e.message}`, true);
  }
}

// ... (loadApprovedResidents, loadDashboardSummary, loadAccessChart, loadAccessLogs remain the same)

// ================================
// SIDEBAR & PAGE LOADING
let sidebarButtons = [];
let mainContent = null;

async function loadPageIntoMainContent(url) {
  if (!mainContent) {
    console.warn("mainContent container not found");
    return;
  }

  mainContent.innerHTML = '<div>Loading...</div>';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const html = await res.text();
    mainContent.innerHTML = html;

    // Page-specific loaders
    if (url.includes("dashboardoverview.html")) {
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
    }
  } catch (e) {
    console.error("loadPageIntoMainContent error:", e);
    mainContent.innerHTML = `<div class="text-red-600">Failed to load: ${url}</div>`;
  }
}

// ... (wireSidebarButtons remains the same) ...
function wireSidebarButtons() {
  sidebarButtons = Array.from(document.querySelectorAll(".sidebarBtn"));
  mainContent = document.getElementById("main-content-area");

  if (!mainContent) console.warn("#main-content-area not found");

  sidebarButtons.forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      // visual active state
      sidebarButtons.forEach((b) => b.classList.remove("bg-blue-600", "text-white"));
      btn.classList.add("bg-blue-600", "text-white");

      const page = btn.dataset.target;
      if (page) loadPageIntoMainContent(page);
    });
  });
}


// ================================
// INITIAL LOAD (wire up once DOM is ready)
document.addEventListener("DOMContentLoaded", () => {
  wireSidebarButtons();
  loadPageIntoMainContent("sections/dashboardoverview.html");
});

// ================================
// MISC: membership page listeners
function attachMembershipListeners() {
  // Sync button
  document.getElementById("syncBtn")?.addEventListener("click", handleSyncClick);

  // Clear filters
  document.getElementById("clearFilterBtn")?.addEventListener("click", () => {
    const rid = document.getElementById("requestIdFilter");
    const rf = document.getElementById("residentFilter");
    if (rid) rid.value = "";
    if (rf) rf.value = "";
    displayMessage("Filters cleared.", false);
  });

  // NOTE: REMOVED the conflicting membershipFormSubmitHandler attachment
  // The table row buttons now directly use handleApproveClick/handleRejectClick
  // which are the correct functions to use in this unified structure.
}