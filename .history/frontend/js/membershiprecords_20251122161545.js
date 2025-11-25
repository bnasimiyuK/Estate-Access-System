// js/membershiprecords.js

const membershipTableBody = document.getElementById("membershipTableBody");
const membershipCount = document.getElementById("membershipCount");
const requestIdFilter = document.getElementById("requestIdFilter");
const residentFilter = document.getElementById("residentFilter");
const clearFilterBtn = document.getElementById("clearFilterBtn");
const statusLabel = document.getElementById("statusLabel");
const actionText = document.getElementById("actionText");

const pendingTableBody = document.getElementById("pendingTableBody"); 
const pendingCount = document.getElementById("pendingCount");

// 🚨 IMPORTANT: Ensure API_HOST matches your backend server URL
const API_HOST = "http://localhost:4050"; 
const token = localStorage.getItem("token"); // Assuming JWT is stored here

let memberships = [];

// =====================
// Custom Notification Helper (Replaces alert/confirm)
// =====================

// Display a simple message in the dashboard
function showMessage(type, message) {
    const msgElement = document.getElementById("msg");
    if (!msgElement) return;

    msgElement.textContent = message;
    msgElement.className = "text-sm p-3 rounded-lg font-medium transition-all duration-300";

    if (type === 'success') {
        msgElement.classList.add("bg-green-100", "text-green-800");
    } else if (type === 'error') {
        msgElement.classList.add("bg-red-100", "text-red-800");
    } else {
        msgElement.classList.add("bg-gray-100", "text-gray-800");
    }
}


// =====================
// FETCH MEMBERSHIP DATA (All Records)
// =====================
async function loadMembershipRecords() {
    try {
        actionText.textContent = "Loading all records...";
        // 🚨 FIX 1: Use the correct Admin route for all records
        const res = await fetch(`${API_HOST}/api/membershiprecords/all`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        memberships = await res.json();

        renderTable(memberships);
        populateFilters(memberships);
        actionText.textContent = `Last records update: ${new Date().toLocaleTimeString()}`;
        membershipCount.textContent = memberships.length;
    } catch (err) {
        console.error("Error loading memberships:", err);
        actionText.textContent = "Error loading data";
    }
}

// =====================
// FETCH APPROVED RESIDENTS (for bottom table)
// =====================
async function loadApprovedResidents() {
    const residentsTableBody = document.getElementById("residentsTableBody");
    try {
        const res = await fetch(`${API_HOST}/api/membershiprecords/residents/approved`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const approvedResidents = await res.json();
        
        residentsTableBody.innerHTML = "";
        approvedResidents.forEach(item => {
            const row = document.createElement("tr");
            row.classList.add("border-b", "hover:bg-green-50");
            row.innerHTML = `
                <td class="px-4 py-2">${item.ResidentName}</td>
                <td class="px-4 py-2">${item.NationalID}</td>
                <td class="px-4 py-2">${item.PhoneNumber}</td>
                <td class="px-4 py-2">${item.Email}</td>
                <td class="px-4 py-2">${item.HouseNumber}</td>
                <td class="px-4 py-2">${item.CourtName}</td>
            `;
            residentsTableBody.appendChild(row);
        });

    } catch (err) {
        console.error("Error loading approved residents:", err);
        residentsTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-red-600">Failed to load approved residents</td></tr>`;
    }
}

// =====================
// FETCH PENDING REQUESTS (for middle table)
// =====================
async function loadPendingRequests() {
    try {
        // 🚨 FIX 2: Use the correct Admin route for pending requests
        const res = await fetch(`${API_HOST}/api/membershiprecords/requests/pending`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const pendingRequests = await res.json();

        renderPendingTable(pendingRequests);
        pendingCount.textContent = pendingRequests.length;
        actionText.textContent = `Pending requests updated at: ${new Date().toLocaleTimeString()}`;
    } catch (err) {
        console.error("Error loading pending requests:", err);
        pendingTableBody.innerHTML = `<tr><td colspan="12" class="text-center text-red-600">Failed to load pending requests</td></tr>`;
    }
}

// =====================
// RENDER PENDING TABLE
// =====================
function renderPendingTable(data) {
    pendingTableBody.innerHTML = "";

    data.forEach((item) => {
        const row = document.createElement("tr");
        row.classList.add("border-b", "bg-yellow-50");

        row.innerHTML = `
            <td class="px-4 py-2">${item.RequestID}</td>
            <td class="px-4 py-2">${item.ResidentName}</td>
            <td class="px-4 py-2">${item.NationalID}</td>
            <td class="px-4 py-2">${item.PhoneNumber}</td>
            <td class="px-4 py-2">${item.Email}</td>
            <td class="px-4 py-2">${item.HouseNumber}</td>
            <td class="px-4 py-2">${item.CourtName}</td>
            <td class="px-4 py-2">${item.RoleName}</td>
            <td class="px-4 py-2"><span class="bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">${item.Status}</span></td>
            <td class="px-4 py-2">${item.RequestedAt ? new Date(item.RequestedAt).toLocaleDateString() : "-"}</td>
            <td class="px-4 py-2 text-center space-x-2">
                <button class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs" onclick="handleAdminAction(${item.RequestID}, 'Approve')">
                    Approve
                </button>
                <button class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs" onclick="handleAdminAction(${item.RequestID}, 'Reject')">
                    Reject
                </button>
            </td>
        `;

        pendingTableBody.appendChild(row);
    });
}


// =====================
// APPROVE/REJECT HANDLER
// =====================
// 🚨 FIX 3: Centralized admin action to handle both Approve and Reject
async function handleAdminAction(requestId, action) {
    showMessage('info', `Processing ${action} for Request ID: ${requestId}...`);

    const confirmation = window.confirm(`Are you sure you want to ${action.toLowerCase()} request ID ${requestId}?`);
    
    if (!confirmation) {
        showMessage('default', 'Action cancelled.');
        return;
    }

    try {
        // 🚨 FIX 4: Use the correct Admin route for status update
        const endpoint = `${API_HOST}/api/membershiprecords/${action.toLowerCase()}/${requestId}`;
        
        const res = await fetch(endpoint, {
            method: "PUT",
            headers: { 
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            // The body is required by the controller for logging the admin's action
            body: JSON.stringify({ adminAction: `${action}ed via Admin Dashboard` })
        });

        const result = await res.json();

        if (!res.ok) throw new Error(result.message || `HTTP error! Status: ${res.status}`);

        showMessage('success', `✅ Request ${requestId} successfully ${action.toLowerCase()}d!`);
        
        // Refresh both tables to reflect the change
        await loadPendingRequests(); 
        await loadMembershipRecords();
        await loadApprovedResidents();

    } catch (err) {
        console.error(`Error ${action.toLowerCase()}ing request:`, err);
        showMessage('error', `❌ Failed to ${action.toLowerCase()} request ${requestId}. Reason: ${err.message}`);
    }
}


// =====================
// RENDER ALL RECORDS TABLE
// =====================
function renderTable(data) {
    membershipTableBody.innerHTML = "";

    data.forEach((item) => {
        const row = document.createElement("tr");
        row.classList.add("border-b");
        
        const statusClass = 
            item.Status === 'Approved' ? 'bg-green-200 text-green-800' : 
            item.Status === 'Rejected' ? 'bg-red-200 text-red-800' :
            'bg-yellow-200 text-yellow-800';

        row.innerHTML = `
            <td class="px-4 py-2">${item.RequestID}</td>
            <td class="px-4 py-2">${item.ResidentName}</td>
            <td class="px-4 py-2">${item.NationalID}</td>
            <td class="px-4 py-2">${item.PhoneNumber}</td>
            <td class="px-4 py-2">${item.Email}</td>
            <td class="px-4 py-2">${item.HouseNumber}</td>
            <td class="px-4 py-2">${item.CourtName}</td>
            <td class="px-4 py-2">${item.RoleName}</td>
            <td class="px-4 py-2"><span class="text-xs font-semibold px-2 py-1 rounded ${statusClass}">${item.Status}</span></td>
            <td class="px-4 py-2">${item.RequestedAt ? new Date(item.RequestedAt).toLocaleString() : "-"}</td>
            <td class="px-4 py-2">${item.ApprovedAt ? new Date(item.ApprovedAt).toLocaleString() : "-"}</td>
            <td class="px-4 py-2 text-center">
                <button class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs" onclick="viewDetails(${item.RequestID})">
                    View
                </button>
            </td>
        `;

        membershipTableBody.appendChild(row);
    });
}


// =====================
// POPULATE & FILTER HANDLERS
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

clearFilterBtn.addEventListener("click", () => {
    requestIdFilter.value = "";
    residentFilter.value = "";
    statusLabel.textContent = "All";
    renderTable(memberships);
});

requestIdFilter.addEventListener("change", applyFilters);
residentFilter.addEventListener("change", applyFilters);

// Global reference for admin action (used by event listeners)
window.handleAdminAction = handleAdminAction;
window.viewDetails = (requestId) => showMessage('default', `Viewing details for RequestID: ${requestId}. Implement modal for full details.`);


// =====================
// INITIAL LOAD
// =====================
window.addEventListener("DOMContentLoaded", () => {
    loadMembershipRecords(); // existing memberships
    loadPendingRequests();   // new pending requests
    loadApprovedResidents(); // approved residents table
});