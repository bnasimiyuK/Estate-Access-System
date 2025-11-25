// js/membershiprecords.js

document.addEventListener("DOMContentLoaded", () => {
  const membershipTableBody = document.getElementById("membershipTableBody");
  const residentsTableBody = document.getElementById("residentsTableBody");
  const membershipCount = document.getElementById("membershipCount");
  const statusLabel = document.getElementById("statusLabel");
  const actionText = document.getElementById("actionText");
  const requestIdFilter = document.getElementById("requestIdFilter");
  const residentFilter = document.getElementById("residentFilter");
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  let memberships = [];

  // Fetch membership records from backend
  async function loadMembershipRecords() {
    try {
      const res = await fetch("/api/membership"); // Update route if needed
      const data = await res.json();
      memberships = data; // store all records
      renderMembershipRecords(memberships);
      renderApprovedResidents(memberships);
      populateFilters(memberships);
    } catch (err) {
      console.error("Error fetching membership records:", err);
      actionText.textContent = "Failed to load data";
    }
  }

  // Render Membership Records Table
  function renderMembershipRecords(records) {
    membershipTableBody.innerHTML = "";
    records.forEach(record => {
      const tr = document.createElement("tr");
      tr.classList.add("border-b", "hover:bg-gray-100");
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
        <td class="px-4 py-2">${record.ApprovedAt ? new Date(record.ApprovedAt).toLocaleString() : "-"}</td>
        <td class="px-4 py-2 text-center">
          ${record.Status === "Pending" ? `
            <button class="approveBtn bg-green-500 text-white px-2 py-1 rounded mr-1" data-id="${record.RequestID}">Approve</button>
            <button class="rejectBtn bg-red-500 text-white px-2 py-1 rounded" data-id="${record.RequestID}">Reject</button>
          ` : "-"}
        </td>
      `;
      membershipTableBody.appendChild(tr);
    });

    // Update total count and last action
    membershipCount.textContent = records.length;
    statusLabel.textContent = "All";
    actionText.textContent = new Date().toLocaleTimeString();

    attachActionButtons();
  }

  // Render Approved Residents Table
  function renderApprovedResidents(records) {
    residentsTableBody.innerHTML = "";
    const approved = records.filter(r => r.Status === "Approved");
    approved.forEach(record => {
      const tr = document.createElement("tr");
      tr.classList.add("border-b", "hover:bg-gray-100");
      tr.innerHTML = `
        <td class="px-4 py-2">${record.ResidentName}</td>
        <td class="px-4 py-2">${record.NationalID}</td>
        <td class="px-4 py-2">${record.PhoneNumber}</td>
        <td class="px-4 py-2">${record.Email}</td>
        <td class="px-4 py-2">${record.HouseNumber}</td>
        <td class="px-4 py-2">${record.CourtName}</td>
      `;
      residentsTableBody.appendChild(tr);
    });
  }

  // Populate filters dropdown
  function populateFilters(records) {
    const uniqueRequestIDs = [...new Set(records.map(r => r.RequestID))];
    const uniqueResidents = [...new Set(records.map(r => r.ResidentName))];

    requestIdFilter.innerHTML = `<option value="">All Request IDs</option>`;
    residentFilter.innerHTML = `<option value="">All Residents</option>`;

    uniqueRequestIDs.forEach(id => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      requestIdFilter.appendChild(option);
    });

    uniqueResidents.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      residentFilter.appendChild(option);
    });
  }

  // Filter functionality
  requestIdFilter.addEventListener("change", () => {
    const filtered = memberships.filter(r => 
      !requestIdFilter.value || r.RequestID == requestIdFilter.value
    );
    renderMembershipRecords(filtered);
    renderApprovedResidents(filtered);
  });

  residentFilter.addEventListener("change", () => {
    const filtered = memberships.filter(r => 
      !residentFilter.value || r.ResidentName === residentFilter.value
    );
    renderMembershipRecords(filtered);
    renderApprovedResidents(filtered);
  });

  clearFilterBtn.addEventListener("click", () => {
    requestIdFilter.value = "";
    residentFilter.value = "";
    renderMembershipRecords(memberships);
    renderApprovedResidents(memberships);
  });

  // Attach approve/reject buttons
  function attachActionButtons() {
    document.querySelectorAll(".approveBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const requestId = btn.dataset.id;
        await updateMembershipStatus(requestId, "Approved");
      });
    });

    document.querySelectorAll(".rejectBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const requestId = btn.dataset.id;
        await updateMembershipStatus(requestId, "Rejected");
      });
    });
  }

  // Update membership status
  async function updateMembershipStatus(requestId, status) {
    try {
      const res = await fetch(`/api/membership/${status.toLowerCase()}/${requestId}`, {
        method: "PUT"
      });
      if (!res.ok) throw new Error("Failed to update status");
      await loadMembershipRecords();
    } catch (err) {
      console.error(err);
      alert(`Failed to ${status.toLowerCase()} request`);
    }
  }

  // Initial load
  loadMembershipRecords();
});
const membershipTableBody = document.getElementById("membershipTableBody");
const residentsTableBody = document.getElementById("residentsTableBody");
const membershipCount = document.getElementById("membershipCount");
const statusLabel = document.getElementById("statusLabel");
const actionText = document.getElementById("actionText");

async function loadMembershipRecords() {
  try {
    const res = await fetch("/api/membership");
    const records = await res.json();

    // Clear tables
    membershipTableBody.innerHTML = "";
    residentsTableBody.innerHTML = "";

    let totalRecords = records.length;

    records.forEach(record => {
      const tr = document.createElement("tr");
      tr.classList.add("text-gray-700");

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
        <td class="px-4 py-2">${record.ApprovedAt ? new Date(record.ApprovedAt).toLocaleString() : "-"}</td>
        <td class="px-4 py-2 text-center">
          ${record.Status === "Pending" ? `<button onclick="approveRequest(${record.RequestID})" class="bg-green-500 text-white px-2 py-1 rounded mr-1">Approve</button>
          <button onclick="rejectRequest(${record.RequestID})" class="bg-red-500 text-white px-2 py-1 rounded">Reject</button>` : "-"}
        </td>
      `;

      membershipTableBody.appendChild(tr);

      // Add to approved residents table if approved
      if (record.Status === "Approved") {
        const resTr = document.createElement("tr");
        resTr.classList.add("text-gray-700");
        resTr.innerHTML = `
          <td class="px-4 py-2">${record.ResidentName}</td>
          <td class="px-4 py-2">${record.NationalID}</td>
          <td class="px-4 py-2">${record.PhoneNumber}</td>
          <td class="px-4 py-2">${record.Email}</td>
          <td class="px-4 py-2">${record.HouseNumber}</td>
          <td class="px-4 py-2">${record.CourtName}</td>
        `;
        residentsTableBody.appendChild(resTr);
      }
    });

    membershipCount.textContent = totalRecords;
    statusLabel.textContent = "All";
    actionText.textContent = "Loaded successfully";

  } catch (err) {
    console.error("Error loading membership records:", err);
    actionText.textContent = "Error loading records";
  }
}

// Approve request
async function approveRequest(RequestID) {
  try {
    await fetch(`/api/membership/approve/${RequestID}`, { method: "PUT" });
    loadMembershipRecords();
  } catch (err) {
    console.error("Error approving request:", err);
  }
}

// Reject request
async function rejectRequest(RequestID) {
  try {
    await fetch(`/api/membership/reject/${RequestID}`, { method: "PUT" });
    loadMembershipRecords();
  } catch (err) {
    console.error("Error rejecting request:", err);
  }
}

// Initialize
loadMembershipRecords();
