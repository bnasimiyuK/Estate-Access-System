// adminsdashboard.js
// This file includes ALL necessary data loading logic and now supports
// a nested Security Dashboard sub-sidebar (Option B).

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

  // Security endpoints (example names - adjust if your backend differs)
  SECURITY_OVERVIEW: `${API_HOST}/api/security/overview`,
  SECURITY_GUARDS: `${API_HOST}/api/security/guards`,
  SECURITY_INCIDENTS: `${API_HOST}/api/security/incidents`,
  SECURITY_ACCESSLOGS: `${API_HOST}/api/security/accesslogs`,
};

// ================================
// AUTH & LOGOUT
// ================================
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("accessToken");
  window.location.href = "/login.html";
});

// ================================
// UTILITIES AND HELPERS
// ================================
function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function displayMessage(message, isError = false) {
  const msgElement = document.getElementById("msg");
  if (msgElement) {
    msgElement.textContent = message;
    msgElement.className = `p-3 rounded-lg text-sm font-semibold mb-3 ${
      isError ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
    }`;

    setTimeout(() => {
      msgElement.textContent = "";
      msgElement.className = "text-sm text-gray-700 mb-3";
    }, 5000);
  } else {
    // fallback to console if msg element not present
    console[isError ? "error" : "log"](message);
  }
}

function formatTimestamp(timestamp) {
  try {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  } catch (e) {
    return "N/A";
  }
}

const safeUpdate = (id, value, suffix = "") => {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value + suffix;
  }
};

// Small helper: fetch text content and return string, with error handling
async function fetchText(url) {
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
  return await res.text();
}

// ================================
// 🟢 MEMBERSHIP / PAYMENTS / RESIDENTS / VISITORS / REPORTS etc.
// (All your earlier functions are preserved — truncated comment header)
// ================================

// --- Membership functions (unchanged) ---
async function handleApproveClick(requestId) {
  safeUpdate("actionText", `Processing Approval for ${requestId}...`);
  try {
    const resp = await fetch(ENDPOINTS.APPROVE_REQUEST(requestId), {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
      throw new Error(errorData.message || `Approval failed with status: ${resp.status}`);
    }
    safeUpdate("actionText", `Approved Request ${requestId}`);
    displayMessage(`Successfully approved membership request ${requestId}.`, false);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (e) {
    console.error("Approval Operation Failed:", e);
    displayMessage(`Approval failed for ${requestId}: ${e.message}`, true);
  }
}

async function handleRejectClick(requestId) {
  safeUpdate("actionText", `Processing Rejection for ${requestId}...`);
  if (!confirm(`Are you sure you want to REJECT request ${requestId}?`)) return;
  try {
    const resp = await fetch(ENDPOINTS.REJECT_REQUEST(requestId), {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
      throw new Error(errorData.message || `Rejection failed with status: ${resp.status}`);
    }
    safeUpdate("actionText", `Rejected Request ${requestId}`);
    displayMessage(`Successfully rejected membership request ${requestId}.`, false);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (e) {
    console.error("Rejection Operation Failed:", e);
    displayMessage(`Rejection failed for ${requestId}: ${e.message}`, true);
  }
}

async function handleDeleteClick(requestId) {
  safeUpdate("actionText", `Processing Deletion for ${requestId}...`);
  if (!confirm(`Are you sure you want to DELETE request ${requestId}? This action is permanent.`)) return;
  try {
    const resp = await fetch(ENDPOINTS.DELETE_REQUEST(requestId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
      throw new Error(errorData.message || `Deletion failed with status: ${resp.status}`);
    }
    safeUpdate("actionText", `Deleted Request ${requestId}`);
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
  btn.textContent = "Syncing...";
  btn.className =
    "bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 animate-pulse min-w-[100px]";
  try {
    const resp = await fetch(ENDPOINTS.SYNC, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
      throw new Error(errorData.message || `Sync failed with status: ${resp.status}`);
    }
    btn.textContent = "Sync Complete! ✔️";
    btn.className =
      "bg-green-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 min-w-[100px]";
    displayMessage("Data synchronization was successful. Tables reloading...", false);
    await loadPendingRequests();
    await loadApprovedResidents();
  } catch (err) {
    console.error("Synchronization Error:", err.message);
    btn.textContent = "Sync Failed ❌";
    btn.className =
      "bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 min-w-[100px]";
    displayMessage(`Sync failed: ${err.message}`, true);
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = originalText;
      btn.className = originalClasses;
    }, 3000);
  }
}

// --- loadPendingRequests & loadApprovedResidents (unchanged) ---
async function loadPendingRequests() {
  const tableBody = document.getElementById("membershipTableBody");
  const countElement = document.getElementById("membershipCount");
  const noRequestsMsg = document.getElementById("noPendingRequests");

  if (!tableBody || !countElement || !noRequestsMsg) return;

  tableBody.innerHTML =
    '<tr><td colspan="11" class="text-center py-4 text-blue-500 italic">Loading requests...</td></tr>';

  try {
    const resp = await fetch(ENDPOINTS.PENDING_REQUESTS, { headers: getAuthHeaders() });
    if (!resp.ok) throw new Error("Failed to fetch pending requests.");

    const requests = await resp.json();

    tableBody.innerHTML = "";
    countElement.textContent = requests.length;

    if (requests.length === 0) {
      noRequestsMsg.classList.remove("hidden");
    } else {
      noRequestsMsg.classList.add("hidden");
      requests.forEach((request) => {
        const row = tableBody.insertRow();
        row.className = "hover:bg-blue-50 transition-colors duration-100";

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

      // Attach listeners
      tableBody.querySelectorAll(".approve-btn").forEach((button) => {
        button.addEventListener("click", (e) => {
          handleApproveClick(e.target.getAttribute("data-request-id"));
        });
      });
      tableBody.querySelectorAll(".reject-btn").forEach((button) => {
        button.addEventListener("click", (e) => {
          handleRejectClick(e.target.getAttribute("data-request-id"));
        });
      });
      tableBody.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", (e) => {
          handleDeleteClick(e.target.getAttribute("data-request-id"));
        });
      });
    }
  } catch (error) {
    console.error("Error loading pending requests:", error);
    tableBody.innerHTML =
      '<tr><td colspan="11" class="text-center py-4 text-red-500 italic">Error loading data. Check console for details.</td></tr>';
    displayMessage("Failed to load pending requests from API.", true);
  }
}

async function loadApprovedResidents() {
  const tableBody = document.getElementById("residentsTableBody");
  const noResidentsMsg = document.getElementById("noApprovedResidents");

  if (!tableBody || !noResidentsMsg) return;

  tableBody.innerHTML =
    '<tr><td colspan="8" class="text-center py-4 text-blue-500 italic">Loading approved residents...</td></tr>';

  try {
    const resp = await fetch(ENDPOINTS.APPROVED_RESIDENTS, { headers: getAuthHeaders() });
    if (!resp.ok) throw new Error("Failed to fetch approved residents.");

    const residents = await resp.json();

    tableBody.innerHTML = "";

    if (residents.length === 0) {
      noResidentsMsg.classList.remove("hidden");
    } else {
      noResidentsMsg.classList.add("hidden");
      residents.forEach((resident) => {
        const row = tableBody.insertRow();
        row.className = "hover:bg-blue-50 transition-colors duration-100";
        row.innerHTML = `
          <td class="px-4 py-3 font-medium">${resident.ResidentName || "N/A"}</td>
          <td class="px-4 py-3">${resident.NationalID || "N/A"}</td>
          <td class="px-4 py-3">${resident.PhoneNumber || "N/A"}</td>
          <td class="px-4 py-3">${resident.Email || "N/A"}</td>
          <td class="px-4 py-3">${resident.HouseNumber || "N/A"}</td>
          <td class="px-4 py-3">${resident.CourtName || "N/A"}</td>
          <td class="px-4 py-3">${resident.RoleName || "N/A"}</td>
        `;
      });
    }
  } catch (error) {
    console.error("Error loading approved residents:", error);
    tableBody.innerHTML =
      '<tr><td colspan="8" class="text-center py-4 text-red-500 italic">Error loading data. Check console for details.</td></tr>';
    displayMessage("Failed to load approved residents from API.", true);
  }
}

function attachMembershipListeners() {
  document.getElementById("syncBtn")?.addEventListener("click", handleSyncClick);

  document.getElementById("clearFilterBtn")?.addEventListener("click", () => {
    const el1 = document.getElementById("requestIdFilter");
    const el2 = document.getElementById("residentFilter");
    if (el1) el1.value = "";
    if (el2) el2.value = "";
    displayMessage("Filters cleared (API query filtering needs implementation).", false);
  });
}

// ================================
// 📊 DASHBOARD OVERVIEW LOGIC
// ================================
async function loadDashboardSummary() {
  try {
    const res = await fetch(ENDPOINTS.DASHBOARD_SUMMARY, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();

    safeUpdate("totalResidents", data.residents || 0);
    safeUpdate("pendingPayments", data.pendingPayments || 0);
    safeUpdate("compliancePct", data.compliance || 0, "%");
    safeUpdate("overrideCount", data.overrides || 0);
  } catch (err) {
    console.error("Error loading summary:", err);
  }
}

async function loadAccessChart() {
  try {
    const res = await fetch(ENDPOINTS.DASHBOARD_CHART, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();

    const accessChartElement = document.getElementById("accessChart");
    if (!accessChartElement) return;

    const ctx = accessChartElement.getContext("2d");
    if (window.accessChartInstance) {
      window.accessChartInstance.destroy();
    }

    window.accessChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.days || [],
        datasets: [
          {
            label: "Access Attempts",
            data: data.counts || [],
            borderWidth: 2,
            tension: 0.4,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.2)",
            fill: true,
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  } catch (err) {
    console.error("Error loading chart:", err);
  }
}

// ================================
// PAYMENTS / RESIDENTS / VISITORS / REPORTS / MANUAL OVERRIDES
// (kept as-is from your original file; omitted extra comments here for brevity)
// ================================

async function loadPaymentsRecords() {
  const tableBody = document.getElementById("paymentsTableBody");
  if (!tableBody) return;

  tableBody.innerHTML =
    '<tr><td colspan="7" class="text-center py-4 text-blue-500 italic">Loading payment records...</td></tr>';

  try {
    const resp = await fetch(ENDPOINTS.PAYMENTS_RECORDS, { headers: getAuthHeaders() });
    if (!resp.ok) throw new Error("Failed to fetch payments records.");

    const records = await resp.json();

    tableBody.innerHTML = "";

    if (records.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="7" class="text-center py-4 text-gray-500">No payment records found.</td></tr>';
    } else {
      records.forEach((record) => {
        const row = tableBody.insertRow();
        row.className = "hover:bg-blue-50 transition-colors duration-100";
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
    tableBody.innerHTML =
      '<tr><td colspan="7" class="text-center py-4 text-red-500 italic">Error loading data. Check console for details.</td></tr>';
    displayMessage("Failed to load payments records from API.", true);
  }
}

function attachPaymentsListeners() {
  // Add any payments-specific listeners here
}

async function loadAllResidents() {
  const tableBody = document.getElementById("allResidentsTableBody");
  if (!tableBody) return;

  tableBody.innerHTML =
    '<tr><td colspan="8" class="text-center py-4 text-blue-500 italic">Loading all residents...</td></tr>';

  try {
    const resp = await fetch(ENDPOINTS.ALL_RESIDENTS, { headers: getAuthHeaders() });
    if (!resp.ok) throw new Error("Failed to fetch all residents.");

    const residents = await resp.json();

    tableBody.innerHTML = "";

    if (residents.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No residents found.</td></tr>';
    } else {
      residents.forEach((resident) => {
        const row = tableBody.insertRow();
        row.className = "hover:bg-blue-50 transition-colors duration-100";
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
    tableBody.innerHTML =
      '<tr><td colspan="8" class="text-center py-4 text-red-500 italic">Error loading data. Check console for details.</td></tr>';
    displayMessage("Failed to load all residents from API.", true);
  }
}

// Visitors
async function loadVisitorPassOverview() {
  const overviewSection = document.getElementById("visitorOverviewSection");
  if (!overviewSection) return;

  try {
    const res = await fetch(ENDPOINTS.VISITOR_OVERVIEW, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();

    safeUpdate("todayVisitors", data.today || 0);
    safeUpdate("pendingApprovalsCount", data.pendingApprovals || 0);
    safeUpdate("activeCodes", data.activeCodes || 0);
  } catch (err) {
    console.error("Error loading visitor overview:", err);
  }
}

async function loadPendingVisitorApprovals() {
  const tableBody = document.getElementById("visitorRequestsTableBody");
  if (!tableBody) return;

  tableBody.innerHTML =
    '<tr><td colspan="7" class="text-center py-4 text-blue-500 italic">Loading pending visitor requests...</td></tr>';
}

function attachVisitorListeners() {
  // Attach listeners for visitor related buttons (Approve/Reject/Filters)
}

async function loadReportsData() {
  const reportsContainer = document.getElementById("reportsContainer");
  if (!reportsContainer) return;
  reportsContainer.innerHTML = '<p class="text-gray-600 italic">Fetching complex report data...</p>';

  try {
    const res = await fetch(ENDPOINTS.REPORTS_DATA, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();

    reportsContainer.innerHTML = `<p class="text-green-600 font-semibold">Reports data loaded (e.g., ${data.length || 0} report metrics).</p>`;
  } catch (err) {
    console.error("Error loading reports data:", err);
    reportsContainer.innerHTML = '<p class="text-red-600 font-semibold">Failed to load reports data.</p>';
  }
}

// Manual overrides
async function loadManualOverrides() {
  const logTableBody = document.getElementById("overrideLogTableBody");
  if (!logTableBody) return;

  logTableBody.innerHTML =
    '<tr><td colspan="4" class="text-center py-4 text-blue-500 italic">Loading override logs...</td></tr>';

  try {
    const resp = await fetch(ENDPOINTS.MANUAL_OVERRIDES_LOGS, { headers: getAuthHeaders() });
    if (!resp.ok) throw new Error("Failed to fetch override logs.");
    const logs = await resp.json();

    logTableBody.innerHTML = "";
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
  document.getElementById("performOverrideBtn")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to perform a manual override?")) return;
    try {
      const resp = await fetch(ENDPOINTS.MANUAL_OVERRIDE_ACTION, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "open_gate" }),
      });
      if (!resp.ok) throw new Error("Override API failed.");
      displayMessage("Manual override successful!", false);
      await loadManualOverrides();
    } catch (e) {
      displayMessage(`Manual override failed: ${e.message}`, true);
    }
  });
}

// ================================
// 🧭 SIDEBAR PAGE LOADING (MAIN)
// ================================
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

    // Run page-specific initializers
    if (url.includes("dashboardoverview.html")) {
      await loadDashboardSummary();
      await loadAccessChart();
    } else if (url.includes("membershiprecords.html")) {
      attachMembershipListeners();
      await loadApprovedResidents();
    } else if (url.includes("membership.html")) {
      attachMembershipListeners();
      await loadPendingRequests();
    } else if (url.includes("payments.html")) {
      attachPaymentsListeners();
      await loadPaymentsRecords();
    } else if (url.includes("residents.html")) {
      await loadAllResidents();
    } else if (url.includes("visitorsaccess.html") || url.includes("visitorpass.html")) {
      attachVisitorListeners();
      await loadVisitorPassOverview();
      await loadPendingVisitorApprovals();
    } else if (url.includes("chartsandreports.html")) {
      await loadReportsData();
    } else if (url.includes("manualoverride.html")) {
      attachOverrideListeners();
      await loadManualOverrides();
    }

    // --- NEW: Security Dashboard container loaded (top-level page) ---
    // If the security module was loaded, wire up its sub-sidebar and default subpage.
    if (url.includes("securitydashboards.html")) {
      try {
        // Wait a tick for DOM to render the security module
        await Promise.resolve();

        // Toggle button inside security page (if present) - this is local to the security module
        // NOTE: securitydashboards.html should include:
        // 1) a sub-sidebar with buttons that have class 'security-sub-btn' and data-targets pointing
        //    to the sub-pages (e.g. sections/securitydashboards/guardstatus.html)
        // 2) a content container with id 'security-main-content' where subpages will be injected.
        const securitySubMenu = document.getElementById("securitySubMenu");
        const securityToggle = document.getElementById("securityDashboardToggle");
        const securityArrow = document.getElementById("securityArrow");

        // If the admin-level security toggle exists in the global sidebar, we keep its behavior as well
        // (That toggle is part of the main sidebar; we still want it to expand/close on click.)
        // For the nested sub-sidebar inside the loaded page, we'll select sub-buttons by a class.

        // Attach click handlers to sub-menu items INSIDE the loaded security page.
        // We expect the injected HTML to render buttons with class 'security-sub-btn'.
        const subButtons = mainContentArea.querySelectorAll(".security-sub-btn");
        subButtons.forEach((subBtn) => {
          subBtn.addEventListener("click", async (e) => {
            // Clear active state on all security sub buttons
            subButtons.forEach((b) => b.classList.remove("bg-blue-600", "text-white"));
            // Apply active to clicked
            subBtn.classList.add("bg-blue-600", "text-white");

            const subPage = subBtn.dataset.target;
            if (subPage) await loadSecuritySubpage(subPage);
          });
        });

        // If there's a default subpage (data-default on container or first subBtn), load it:
        const defaultBtn = mainContentArea.querySelector(".security-sub-btn[data-default='true']") || subButtons[0];
        if (defaultBtn) {
          // mark active visually then load
          defaultBtn.classList.add("bg-blue-600", "text-white");
          const defaultPage = defaultBtn.dataset.target;
          if (defaultPage) await loadSecuritySubpage(defaultPage);
        } else {
          // No sub-buttons found - nothing to load
        }
      } catch (secErr) {
        console.error("Error initializing security module:", secErr);
      }
    }
  } catch (err) {
    console.error("Error loading page:", err);
    mainContentArea.innerHTML = `<div class="p-6 text-red-600 font-bold">Failed to load: ${url}. Check console for details.</div>`;
  }
}

// Helper: load internal security subpages into #security-main-content
async function loadSecuritySubpage(url) {
  const container = document.getElementById("security-main-content");
  if (!container) {
    console.warn("Security subpage container #security-main-content not found.");
    return;
  }

  container.innerHTML = '<div class="text-center p-8 text-gray-500 italic">Loading security content...</div>';

  try {
    // We fetch subpage as text (subpage will be standalone fragment HTML)
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Failed to load security subpage: ${res.status}`);
    const html = await res.text();
    container.innerHTML = html;

    // Optionally wire up dynamic data for specific subpages (by url)
    if (url.includes("guardstatus.html")) {
      // If guardstatus.html requires dynamic API data, call loadGuardStatus()
      await loadGuardStatus();
    } else if (url.includes("incidentreports.html")) {
      await loadIncidentReports();
    } else if (url.includes("accesslogs.html")) {
      await loadSecurityAccessLogs();
    }
  } catch (err) {
    console.error("Error loading security subpage:", err);
    container.innerHTML = `<div class="p-4 text-red-600 font-semibold">Failed to load security content.</div>`;
  }
}

// ================================
// SECURITY MODULE: data loaders for sub-pages
// (these call your endpoints and populate elements within the subpage)
// ================================
async function loadGuardStatus() {
  // Example: expects the guardstatus.html fragment to have a container with id 'guardStatusContainer'
  const container = document.getElementById("guardStatusContainer");
  if (!container) return;

  container.innerHTML = '<p class="italic text-gray-500">Loading guard status...</p>';
  try {
    const res = await fetch(ENDPOINTS.SECURITY_GUARDS, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch guard status (${res.status})`);
    const data = await res.json();

    container.innerHTML = data.length
      ? data
          .map(
            (g) => `
        <div class="p-4 rounded-lg bg-white mb-2 shadow-sm flex justify-between items-center">
          <div>
            <div class="font-semibold">${g.name || "Unknown"}</div>
            <div class="text-sm text-gray-500">${g.shift || "N/A"} • ${g.location || "N/A"}</div>
          </div>
          <div class="text-sm">
            <span class="px-3 py-1 rounded-full ${g.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}">
              ${g.status || "unknown"}
            </span>
          </div>
        </div>
      `
          )
          .join("")
      : '<p class="text-gray-600">No guard records found.</p>';
  } catch (err) {
    console.error("Error loading guard status:", err);
    container.innerHTML = `<p class="text-red-600">Failed to load guard status.</p>`;
  }
}

async function loadIncidentReports() {
  const container = document.getElementById("incidentReportsContainer");
  if (!container) return;
  container.innerHTML = '<p class="italic text-gray-500">Loading incidents...</p>';

  try {
    const res = await fetch(ENDPOINTS.SECURITY_INCIDENTS, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch incidents (${res.status})`);
    const incidents = await res.json();

    if (!incidents.length) {
      container.innerHTML = "<p class='text-gray-600'>No incidents found.</p>";
      return;
    }

    container.innerHTML = incidents
      .map(
        (it) => `
      <div class="p-3 bg-white rounded-lg mb-3 shadow-sm">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-semibold">${it.title || "Untitled"}</div>
            <div class="text-xs text-gray-500">${formatTimestamp(it.timestamp) || ""} • ${it.reportedBy || "Unknown"}</div>
            <p class="mt-2 text-sm text-gray-700">${it.description || ""}</p>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  } catch (err) {
    console.error("Error loading incidents:", err);
    container.innerHTML = `<p class="text-red-600">Failed to load incidents.</p>`;
  }
}

async function loadSecurityAccessLogs() {
  const container = document.getElementById("securityAccessLogsContainer");
  if (!container) return;
  container.innerHTML = '<p class="italic text-gray-500">Loading access logs...</p>';

  try {
    const res = await fetch(ENDPOINTS.SECURITY_ACCESSLOGS, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch access logs (${res.status})`);
    const logs = await res.json();

    if (!logs.length) {
      container.innerHTML = "<p class='text-gray-600'>No access logs found.</p>";
      return;
    }

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white rounded-lg">
          <thead class="bg-gray-100 text-left">
            <tr>
              <th class="px-4 py-2">Timestamp</th>
              <th class="px-4 py-2">Gate</th>
              <th class="px-4 py-2">Resident/Visitor</th>
              <th class="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            ${logs
              .map(
                (l) => `
              <tr class="border-t">
                <td class="px-4 py-2 text-sm">${formatTimestamp(l.timestamp)}</td>
                <td class="px-4 py-2 text-sm">${l.gate || "N/A"}</td>
                <td class="px-4 py-2 text-sm">${l.subject || "N/A"}</td>
                <td class="px-4 py-2 text-sm">${l.status || "N/A"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error("Error loading access logs:", err);
    container.innerHTML = `<p class="text-red-600">Failed to load access logs.</p>`;
  }
}

// ================================
// UI: Sidebar interactions (main sidebar + visitor toggle + security sidebar toggle)
// ================================
function resetSidebarActiveStates() {
  document.querySelectorAll(".sidebarBtn").forEach((b) => {
    b.classList.remove("bg-blue-600", "text-white");
    // revert submenu item defaults if inside visitor/security submenus
    if (b.closest("#visitorSubMenu")) {
      b.classList.remove("bg-blue-600");
      b.classList.add("bg-gray-600", "hover:bg-blue-500/50");
    }
    if (b.closest("#securitySubMenu")) {
      b.classList.remove("bg-blue-600");
      b.classList.add("bg-gray-600", "hover:bg-blue-500/50");
    }
  });
}

// Attach a global listener to the sidebar main buttons (these are present in the main HTML)
sidebarButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    resetSidebarActiveStates();

    btn.classList.add("bg-blue-600", "text-white");
    btn.classList.remove("bg-gray-700", "bg-gray-600", "hover:bg-gray-600", "hover:bg-blue-500/50");

    const page = btn.dataset.target;
    if (page) await loadPageIntoMainContent(page);
  });
});

// Visitor toggle (main sidebar)
const visitorToggle = document.getElementById("visitorManagementToggle");
const visitorSubMenu = document.getElementById("visitorSubMenu");
const visitorArrow = document.getElementById("visitorArrow");

visitorToggle?.addEventListener("click", () => {
  visitorSubMenu?.classList.toggle("hidden");
  visitorArrow?.classList.toggle("rotate-90");
});

// Security toggle in main sidebar (keeps the same behavior - expands the small submenu we added earlier in HTML)
const securityToggleMain = document.getElementById("securityDashboardToggle");
const securitySubMenuMain = document.getElementById("securitySubMenu");
const securityArrowMain = document.getElementById("securityArrow");

securityToggleMain?.addEventListener("click", () => {
  // Expand/Collapse the small admin-level security sub-menu (only for quick links if any)
  securitySubMenuMain?.classList.toggle("hidden");
  securityArrowMain?.classList.toggle("rotate-90");
});

// ================================
// INITIALIZATION ON PAGE LOAD
// ================================
document.addEventListener("DOMContentLoaded", () => {
  // Load the initial dashboard view when the admin page first loads
  loadPageIntoMainContent("sections/dashboardoverview.html");
});
