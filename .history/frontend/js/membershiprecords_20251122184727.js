// ==============================
// membershiprecords.js
// ==============================

const API_BASE = "http://localhost:4050/api/membership";

const membershipTableBody = document.getElementById("membershipTableBody");
const residentsTableBody = document.getElementById("residentsTableBody");
const membershipCount = document.getElementById("membershipCount");
const statusLabel = document.getElementById("statusLabel");
const actionText = document.getElementById("actionText");
const requestIdFilter = document.getElementById("requestIdFilter");
const residentFilter = document.getElementById("residentFilter");
const clearFilterBtn = document.getElementById("clearFilterBtn");
const msgDiv = document.getElementById("msg");

// ==============================
// Fetch all membership records
// ==============================
async function fetchMembershipRecords() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const records = await res.json();

    // Reset tables and filters
    membershipTableBody.innerHTML = "";
    residentsTableBody.innerHTML = "";
    requestIdFilter.innerHTML = '<option value="">All Request IDs</option>';
    residentFilter.innerHTML = '<option value="">All Residents</option>';

    records.forEach(record => {
      // ------------------------------
      // Membership Records Table
      // ------------------------------
      const tr = document.createElement("tr");
      tr.classList.add("border-b");
      tr.innerHTML = `
        <td class="px-4 py-2">${record.RequestID}</td>
        <td class="px-4 py-2">${record.ResidentName}</td>
        <td class="px-4 py-2">${record.NationalID}</td>
        <td class="px-4 py-2">${record.PhoneNumber}</td>
        <td class="px-4 py-2">${record.Email}</td>
        <td class="px-4 py-2">${record.HouseNumber}</td>
        <td class="px-4 py-2">${record.CourtName}</td>
        <td class="px-4 py-2">${record.RoleName}</td>
        <td class="px-4 py-2">${record.Status}</td>
        <td class="px-4 py-2">${new Date(record.RequestedAt).toLocaleString()}</td>
        <td class="px-4 py-2">${record.ApprovedAt ? new Date(record.ApprovedAt).toLocaleString() : ""}</td>
        <td class="px-4 py-2 text-center">
          ${record.Status === "Pending" ? `
            <button onclick="approve(${record.RequestID})" class="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Approve</button>
            <button onclick="reject(${record.RequestID})" class="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Reject</button>
          ` : "—"}
        </td>
      `;
      membershipTableBody.appendChild(tr);

      // ------------------------------
      // Approved Residents Table
      // ------------------------------
      if (record.Status === "Approved") {
        const trRes = document.createElement("tr");
        trRes.classList.add("border-b");
        trRes.innerHTML = `
          <td class="px-4 py-2">${record.ResidentName}</td>
          <td class="px-4 py-2">${record.NationalID}</td>
          <td class="px-4 py-2">${record.PhoneNumber}</td>
          <td class="px-4 py-2">${record.Email}</td>
          <td class="px-4 py-2">${record.HouseNumber}</td>
          <td class="px-4 py-2">${record.CourtName}</td>
        `;
        residentsTableBody.appendChild(trRes);
      }

      // ------------------------------
      // Populate Filters
      // ------------------------------
      const optId = document.createElement("option");
      optId.value = record.RequestID;
      optId.textContent = record.RequestID;
      requestIdFilter.appendChild(optId);

      const optRes = document.createElement("option");
      optRes.value = record.ResidentName;
      optRes.textContent = record.ResidentName;
      residentFilter.appendChild(optRes);
    });

    membershipCount.textContent = records.length;
    actionText.textContent = new Date().toLocaleTimeString();
    msgDiv.textContent = "";

  } catch (err) {
    console.error("Error fetching membership records:", err);
    msgDiv.textContent = "❌ Failed to load membership records.";
  }
}

// ==============================
// Approve / Reject actions
// ==============================
async function approve(requestId) {
  if (!confirm(`Approve membership request ${requestId}?`)) return;
  try {
    const res = await fetch(`${API_BASE}/approve/${requestId}`, { method: "PUT" });
    if (!res.ok) throw new Error(`Failed to approve: ${res.status}`);
    fetchMembershipRecords();
  } catch (err) {
    console.error("Error approving request:", err);
    alert("Error approving request. See console for details.");
  }
}

async function reject(requestId) {
  if (!confirm(`Reject membership request ${requestId}?`)) return;
  try {
    const res = await fetch(`${API_BASE}/reject/${requestId}`, { method: "PUT" });
    if (!res.ok) throw new Error(`Failed to reject: ${res.status}`);
    fetchMembershipRecords();
  } catch (err) {
    console.error("Error rejecting request:", err);
    alert("Error rejecting request. See console for details.");
  }
}

// ==============================
// Filters
// ==============================
requestIdFilter.addEventListener("change", applyFilters);
residentFilter.addEventListener("change", applyFilters);
clearFilterBtn.addEventListener("click", () => {
  requestIdFilter.value = "";
  residentFilter.value = "";
  applyFilters();
});

async function applyFilters() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    let records = await res.json();

    if (requestIdFilter.value)
      records = records.filter(r => r.RequestID.toString() === requestIdFilter.value);
    if (residentFilter.value)
      records = records.filter(r => r.ResidentName === residentFilter.value);

    membershipTableBody.innerHTML = "";
    residentsTableBody.innerHTML = "";

    records.forEach(record => {
      // Membership table
      const tr = document.createElement("tr");
      tr.classList.add("border-b");
      tr.innerHTML = `
        <td class="px-4 py-2">${record.RequestID}</td>
        <td class="px-4 py-2">${record.ResidentName}</td>
        <td class="px-4 py-2">${record.NationalID}</td>
        <td class="px-4 py-2">${record.PhoneNumber}</td>
        <td class="px-4 py-2">${record.Email}</td>
        <td class="px-4 py-2">${record.HouseNumber}</td>
        <td class="px-4 py-2">${record.CourtName}</td>
        <td class="px-4 py-2">${record.RoleName}</td>
        <td class="px-4 py-2">${record.Status}</td>
        <td class="px-4 py-2">${new Date(record.RequestedAt).toLocaleString()}</td>
        <td class="px-4 py-2">${record.ApprovedAt ? new Date(record.ApprovedAt).toLocaleString() : ""}</td>
        <td class="px-4 py-2 text-center">
          ${record.Status === "Pending" ? `
            <button onclick="approve(${record.RequestID})" class="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Approve</button>
            <button onclick="reject(${record.RequestID})" class="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Reject</button>
          ` : "—"}
        </td>
      `;
      membershipTableBody.appendChild(tr);

      // Approved residents
      if (record.Status === "Approved") {
        const trRes = document.createElement("tr");
        trRes.classList.add("border-b");
        trRes.innerHTML = `
          <td class="px-4 py-2">${record.ResidentName}</td>
          <td class="px-4 py-2">${record.NationalID}</td>
          <td class="px-4 py-2">${record.PhoneNumber}</td>
          <td class="px-4 py-2">${record.Email}</td>
          <td class="px-4 py-2">${record.HouseNumber}</td>
          <td class="px-4 py-2">${record.CourtName}</td>
        `;
        residentsTableBody.appendChild(trRes);
      }
    });

  } catch (err) {
    console.error("Error applying filters:", err);
  }
}

// ==============================
// Initialize
// ==============================
fetchMembershipRecords();
setInterval(fetchMembershipRecords, 30000); // refresh every 30s
