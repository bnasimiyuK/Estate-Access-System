const API_HOST = "http://localhost:4050";

// Backend Endpoints
const ALL_URL = `${API_HOST}/api/membershiprecords/all`;
const PENDING_URL = `${API_HOST}/api/membershiprecords/requests/pending`;
const APPROVED_URL = `${API_HOST}/api/membershiprecords/residents/approved`;
const APPROVE_URL = `${API_HOST}/api/membershiprecords/approve`;
const REJECT_URL = `${API_HOST}/api/membershiprecords/reject`;

/* ===========================
   LOAD ALL MEMBERSHIP RECORDS
   =========================== */
async function loadAllRecords() {
  try {
    const res = await fetch(ALL_URL);
    const data = await res.json();
    document.getElementById("membershipCount").textContent = data.length;
    renderMembershipRecords(data);
  } catch (err) {
    console.log("Error loading records:", err);
  }
}

/* ===========================
   LOAD PENDING REQUESTS
   =========================== */
async function loadPending() {
  try {
    const res = await fetch(PENDING_URL);
    const data = await res.json();
    document.getElementById("pendingCount").textContent = data.length;
    renderPending(data);
  } catch (err) {
    console.log("Error loading pending:", err);
  }
}

/* ===========================
   LOAD APPROVED RESIDENTS
   =========================== */
async function loadApproved() {
  try {
    const res = await fetch(APPROVED_URL);
    const data = await res.json();
    renderApproved(data);
  } catch (err) {
    console.log("Error loading approved:", err);
  }
}

/* ===========================
   APPROVE REQUEST
   =========================== */
async function approve(id) {
  try {
    await fetch(`${APPROVE_URL}/${id}`, { method: "PUT" });
    await refreshAll();
  } catch (err) {
    console.log("Error approving:", err);
  }
}

/* ===========================
   REJECT REQUEST
   =========================== */
async function reject(id) {
  try {
    await fetch(`${REJECT_URL}/${id}`, { method: "PUT" });
    await refreshAll();
  } catch (err) {
    console.log("Error rejecting:", err);
  }
}

/* ===========================
   REFRESH ALL TABLES
   =========================== */
async function refreshAll() {
  await Promise.all([loadAllRecords(), loadPending(), loadApproved()]);
}

/* ===========================
   TABLE RENDERING
   =========================== */
function renderMembershipRecords(data) {
  const table = document.getElementById("membershipTableBody");
  table.innerHTML = "";

  data.forEach(r => {
    table.innerHTML += `
      <tr>
        <td>${r.RequestID}</td>
        <td>${r.ResidentName}</td>
        <td>${r.NationalID}</td>
        <td>${r.PhoneNumber}</td>
        <td>${r.Email}</td>
        <td>${r.HouseNumber}</td>
        <td>${r.CourtName}</td>
        <td>${r.RoleName}</td>
        <td>${r.Status}</td>
        <td>${new Date(r.RequestedAt).toLocaleString()}</td>
        <td>${r.ApprovedAt ? new Date(r.ApprovedAt).toLocaleString() : "-"}</td>
        <td class="text-center">
          ${r.Status === "Pending" ? `
            <button onclick="approve(${r.RecordID})" class="bg-green-600 text-white px-2 py-1 rounded">Approve</button>
            <button onclick="reject(${r.RecordID})" class="bg-red-600 text-white px-2 py-1 rounded">Reject</button>
          ` : "—"}
        </td>
      </tr>
    `;
  });
}

function renderPending(data) {
  const table = document.getElementById("pendingTableBody");
  table.innerHTML = "";

  data.forEach(r => {
    table.innerHTML += `
      <tr>
        <td>${r.RequestID}</td>
        <td>${r.ResidentName}</td>
        <td>${r.NationalID}</td>
        <td>${r.PhoneNumber}</td>
        <td>${r.Email}</td>
        <td>${r.HouseNumber}</td>
        <td>${r.CourtName}</td>
        <td>${r.RoleName}</td>
        <td>${r.Status}</td>
        <td>${new Date(r.RequestedAt).toLocaleString()}</td>
        <td class="text-center">
          <button onclick="approve(${r.RecordID})" class="bg-green-600 text-white px-2 py-1 rounded">Approve</button>
          <button onclick="reject(${r.RecordID})" class="bg-red-600 text-white px-2 py-1 rounded">Reject</button>
        </td>
      </tr>
    `;
  });
}

function renderApproved(data) {
  const table = document.getElementById("residentsTableBody");
  table.innerHTML = "";

  data.forEach(r => {
    table.innerHTML += `
      <tr>
        <td>${r.ResidentName}</td>
        <td>${r.NationalID}</td>
        <td>${r.PhoneNumber}</td>
        <td>${r.Email}</td>
        <td>${r.HouseNumber}</td>
        <td>${r.CourtName}</td>
      </tr>
    `;
  });
}

/* ===========================
   INITIAL LOAD
   =========================== */
refreshAll();
