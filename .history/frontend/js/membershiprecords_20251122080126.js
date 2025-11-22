// js/membershiprecords.js

const membershipTableBody = document.getElementById("membershipTableBody");
const membershipCount = document.getElementById("membershipCount");
const requestIdFilter = document.getElementById("requestIdFilter");
const residentFilter = document.getElementById("residentFilter");
const clearFilterBtn = document.getElementById("clearFilterBtn");
const statusLabel = document.getElementById("statusLabel");
const actionText = document.getElementById("actionText");

const API_HOST = "http://localhost:4050"; // your backend host
const token = localStorage.getItem("token"); // JWT stored in localStorage

let memberships = [];

// =====================
// FETCH MEMBERSHIP DATA
// =====================
async function loadMembershipRecords() {
  try {
    actionText.textContent = "Loading...";
    const res = await fetch(`${API_HOST}/api/memberships/records`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    memberships = await res.json();

    renderTable(memberships);
    populateFilters(memberships);
    actionText.textContent = `Last update: ${new Date().toLocaleString()}`;
    membershipCount.textContent = memberships.length;
  } catch (err) {
    console.error("Error loading memberships:", err);
    actionText.textContent = "Error loading data";
  }
}

// =====================
// RENDER TABLE
// =====================
function renderTable(data) {
  membershipTableBody.innerHTML = "";

  data.forEach((item) => {
    const row = document.createElement("tr");
    row.classList.add("border-b");

    row.innerHTML = `
      <td class="px-4 py-2">${item.RequestID}</td>
      <td class="px-4 py-2">${item.ResidentName}</td>
      <td class="px-4 py-2">${item.NationalID}</td>
      <td class="px-4 py-2">${item.PhoneNumber}</td>
      <td class="px-4 py-2">${item.Email}</td>
      <td class="px-4 py-2">${item.HouseNumber}</td>
      <td class="px-4 py-2">${item.CourtName}</td>
      <td class="px-4 py-2">${item.RoleName}</td>
      <td class="px-4 py-2">${item.Status}</td>
      <td class="px-4 py-2">${item.RequestedAt ? new Date(item.RequestedAt).toLocaleString() : "-"}</td>
      <td class="px-4 py-2">${item.ApprovedAt ? new Date(item.ApprovedAt).toLocaleString() : "<span class='text-red-600'>Not approved</span>"}</td>
      <td class="px-4 py-2 text-center">
        <button class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" onclick="viewDetails(${item.RequestID})">
          View
        </button>
      </td>
    `;

    membershipTableBody.appendChild(row);
  });
}

// =====================
// POPULATE FILTERS
// =====================
function populateFilters(data) {
  // Clear existing options
  requestIdFilter.innerHTML = '<option value="">All Request IDs</option>';
  residentFilter.innerHTML = '<option value="">All Residents</option>';

  const requestIds = [...new Set(data.map((m) => m.RequestID))];
  requestIds.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    requestIdFilter.appendChild(opt);
  });

  const residents = [...new Set(data.map((m) => m.ResidentName))];
  residents.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    residentFilter.appendChild(opt);
  });
}

// =====================
// FILTER HANDLER
// =====================
function applyFilters() {
  let filtered = memberships;

  if (requestIdFilter.value) {
    filtered = filtered.filter((m) => m.RequestID == requestIdFilter.value);
  }

  if (residentFilter.value) {
    filtered = filtered.filter((m) => m.ResidentName === residentFilter.value);
  }

  statusLabel.textContent = `Filtered: ${filtered.length}`;
  renderTable(filtered);
}

// =====================
// CLEAR FILTERS
// =====================
clearFilterBtn.addEventListener("click", () => {
  requestIdFilter.value = "";
  residentFilter.value = "";
  statusLabel.textContent = "All";
  renderTable(memberships);
});

// Filter change events
requestIdFilter.addEventListener("change", applyFilters);
residentFilter.addEventListener("change", applyFilters);

// =====================
// VIEW DETAILS (example action)
// =====================
function viewDetails(requestId) {
  alert(`Viewing details for RequestID: ${requestId}`);
}

// =====================
// INITIAL LOAD
// =====================
window.addEventListener("DOMContentLoaded", loadMembershipRecords);
const pendingTableBody = document.getElementById("pendingTableBody"); // <tbody> in HTML
const pendingCount = document.getElementById("pendingCount"); // optional badge

async function loadPendingRequests() {
  try {
    const res = await fetch(`${API_HOST}/api/admin/residents/pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const pendingRequests = await res.json();

    renderPendingTable(pendingRequests);
    pendingCount.textContent = pendingRequests.length;
  } catch (err) {
    console.error("Error loading pending requests:", err);
    pendingTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-red-600">Failed to load pending requests</td></tr>`;
  }
}

function renderPendingTable(data) {
  pendingTableBody.innerHTML = "";

  data.forEach((item) => {
    const row = document.createElement("tr");
    row.classList.add("border-b");

    row.innerHTML = `
      <td class="px-4 py-2">${item.RequestID}</td>
      <td class="px-4 py-2">${item.ResidentName}</td>
      <td class="px-4 py-2">${item.NationalID}</td>
      <td class="px-4 py-2">${item.PhoneNumber}</td>
      <td class="px-4 py-2">${item.Email}</td>
      <td class="px-4 py-2">${item.HouseNumber}</td>
      <td class="px-4 py-2">${item.CourtName}</td>
      <td class="px-4 py-2">${item.RoleName}</td>
      <td class="px-4 py-2">${item.Status}</td>
      <td class="px-4 py-2">${item.RequestedAt ? new Date(item.RequestedAt).toLocaleString() : "-"}</td>
      <td class="px-4 py-2 text-center">
        <button class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700" onclick="approveRequest(${item.RequestID})">
          Approve
        </button>
      </td>
    `;

    pendingTableBody.appendChild(row);
  });
}

// Optional: approve request action
async function approveRequest(requestId) {
  if (!confirm("Approve this membership request?")) return;

  try {
    const res = await fetch(`${API_HOST}/api/admin/residents/approve/${requestId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    alert("Request approved!");
    loadPendingRequests();
    loadMembershipRecords(); // refresh main table
  } catch (err) {
    console.error("Error approving request:", err);
    alert("Failed to approve request");
  }
}

// Initial load
window.addEventListener("DOMContentLoaded", () => {
  loadMembershipRecords(); // existing memberships
  loadPendingRequests();   // new pending requests
});
