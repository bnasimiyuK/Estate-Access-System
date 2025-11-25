// =========================================================
// admindashboard.js - Unified Admin Dashboard
// =========================================================

const API_HOST = "http://localhost:4050";
const userRole = localStorage.getItem("userRole"); // "admin" or "security"
const token = localStorage.getItem("accessToken");
if (!token) window.location.href = "/login.html";

// ================================
// ENDPOINTS
const ENDPOINTS = {
  DASHBOARD_SUMMARY: `${API_HOST}/api/admin/summary`,
  DASHBOARD_CHART: `${API_HOST}/api/admin/accesschart`,
  COURTS: `${API_HOST}/api/courts/all`,
  PENDING_REQUESTS: `${API_HOST}/api/admin/requests/pending`,
  APPROVED_RESIDENTS: `${API_HOST}/api/admin/residents/approved`,
  APPROVE_REQUEST: (id) => `${API_HOST}/api/admin/approve/${id}`,
  REJECT_REQUEST: (id) => `${API_HOST}/api/admin/reject/${id}`,
  DELETE_REQUEST: (id) => `${API_HOST}/api/admin/delete/${id}`,
  SUBMIT_MEMBERSHIP: `${API_HOST}/api/admin/membership/request`,
};

// ================================
// AUTH HEADERS
function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ================================
// UTILS
function displayMessage(message, isError = false) {
  const msgEl = document.getElementById("msg");
  if (!msgEl) return console.log(message);
  msgEl.textContent = message;
  msgEl.className = `p-3 rounded-lg mb-3 ${
    isError ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
  }`;
  setTimeout(() => {
    msgEl.textContent = "";
    msgEl.className = "";
  }, 5000);
}

function safeUpdate(id, value, suffix = "") {
  const el = document.getElementById(id);
  if (el) el.textContent = value + suffix;
}

function formatTimestamp(ts) {
  try {
    return ts ? new Date(ts).toLocaleString() : "N/A";
  } catch {
    return "N/A";
  }
}

// ================================
// COURTS
async function loadCourts(selector) {
  const dropdown = document.querySelector(selector);
  if (!dropdown) return console.error("Dropdown not found:", selector);
  dropdown.innerHTML = '<option value="">Loading...</option>';

  try {
    const res = await fetch(ENDPOINTS.COURTS, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const courts = await res.json();
    dropdown.innerHTML = '<option value="">Select Court</option>';
    courts.forEach((c) => {
      dropdown.innerHTML += `<option value="${c.CourtID}">${c.CourtName}</option>`;
    });
  } catch (err) {
    console.error("Failed to load courts:", err);
    dropdown.innerHTML = '<option value="" disabled>Failed to load courts</option>';
  }
}

// ================================
// DASHBOARD SUMMARY
async function loadDashboardSummary() {
  try {
    const res = await fetch(ENDPOINTS.DASHBOARD_SUMMARY, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(res.statusText);
    const d = await res.json();
    safeUpdate("totalResidents", d.residents || 0);
    safeUpdate("pendingPayments", d.pendingPayments || 0);
    safeUpdate("compliancePct", d.compliance || 0, "%");
    safeUpdate("overrideCount", d.overrides || 0);
  } catch (e) {
    console.error("loadDashboardSummary error:", e);
  }
}

// ================================
// ACCESS CHART
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
      data: {
        labels: data.days || [],
        datasets: [
          {
            label: "Access Attempts",
            data: data.counts || [],
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.2)",
            fill: true,
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  } catch (err) {
    console.error("loadAccessChart error:", err);
  }
}

// ================================
// PENDING REQUESTS
async function loadPendingRequests() {
  const tbody = document.getElementById("membershipTableBody");
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="11">Loading...</td></tr>';
  try {
    const res = await fetch(ENDPOINTS.PENDING_REQUESTS, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const requests = await res.json();
    tbody.innerHTML = requests.length === 0 ? '<tr><td colspan="11">No requests</td></tr>' : "";
    requests.forEach((r) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${r.RequestID || "N/A"}</td>
        <td>${r.ResidentName || "N/A"}</td>
        <td>${r.NationalID || "N/A"}</td>
        <td>${r.PhoneNumber || "N/A"}</td>
        <td>${r.Email || "N/A"}</td>
        <td>${r.HouseNumber || "N/A"}</td>
        <td>${r.CourtName || "N/A"}</td>
        <td>${r.RoleName || "N/A"}</td>
        <td>${r.Status || "Pending"}</td>
        <td>${formatTimestamp(r.RequestedAt)}</td>
        <td class="flex space-x-1">
          <button class="approve-btn" data-id="${r.RequestID}">Approve</button>
          <button class="reject-btn" data-id="${r.RequestID}">Reject</button>
          <button class="delete-btn" data-id="${r.RequestID}">Delete</button>
        </td>
      `;
    });

    tbody.querySelectorAll(".approve-btn").forEach((b) =>
      b.addEventListener("click", (e) => handleApproveClick(e.target.dataset.id))
    );
    tbody.querySelectorAll(".reject-btn").forEach((b) =>
      b.addEventListener("click", (e) => handleRejectClick(e.target.dataset.id))
    );
    tbody.querySelectorAll(".delete-btn").forEach((b) =>
      b.addEventListener("click", (e) => handleDeleteClick(e.target.dataset.id))
    );
  } catch (err) {
    displayMessage(`Failed to load pending requests: ${err.message}`, true);
  }
}

// ================================
// APPROVE / REJECT / DELETE
async function handleApproveClick(id) {
  try {
    const res = await fetch(ENDPOINTS.APPROVE_REQUEST(id), { method: "PUT", headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Approval failed`);
    displayMessage(`Request ${id} approved. ✅`);
    await loadPendingRequests();
  } catch (err) {
    displayMessage(`Approval failed: ${err.message}`, true);
  }
}

async function handleRejectClick(id) {
  if (!confirm(`Reject request ${id}?`)) return;
  try {
    const res = await fetch(ENDPOINTS.REJECT_REQUEST(id), { method: "PUT", headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Rejection failed`);
    displayMessage(`Request ${id} rejected. ❌`);
    await loadPendingRequests();
  } catch (err) {
    displayMessage(`Rejection failed: ${err.message}`, true);
  }
}

async function handleDeleteClick(id) {
  if (!confirm(`Delete request ${id}?`)) return;
  try {
    const res = await fetch(ENDPOINTS.DELETE_REQUEST(id), { method: "DELETE", headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Deletion failed`);
    displayMessage(`Request ${id} deleted.`);
    await loadPendingRequests();
  } catch (err) {
    displayMessage(`Deletion failed: ${err.message}`, true);
  }
}

// ================================
// MEMBERSHIP FORM SUBMISSION
async function membershipFormSubmitHandler(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;

  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    const res = await fetch(ENDPOINTS.SUBMIT_MEMBERSHIP, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Submission failed");
    }
    displayMessage("Membership request submitted successfully ✅");
    form.reset();
    await loadPendingRequests();
  } catch (err) {
    displayMessage(`Failed to submit: ${err.message}`, true);
  } finally {
    btn.disabled = false;
  }
}

// ================================
// INIT
document.addEventListener("DOMContentLoaded", () => {
  // Load default page: dashboard overview
  loadDashboardSummary();
  loadAccessChart();
  loadCourts("#courtDropdown");
  loadPendingRequests();

  // Membership form handler
  const membershipForm = document.getElementById("membershipForm");
  if (membershipForm) membershipForm.addEventListener("submit", membershipFormSubmitHandler);
});
