// membership.js
import { API_HOST, token } from "./config.js"; // adjust path if needed

// --- Utility: Display messages ---
function displayMessage(msg, isError = false) {
    const msgEl = document.getElementById("msgBox");
    if (msgEl) {
        msgEl.textContent = msg;
        msgEl.style.color = isError ? "red" : "green";
        setTimeout(() => { msgEl.textContent = ""; }, 4000);
    } else {
        console[isError ? "error" : "log"](msg);
    }
}

// --- Fetch pending membership requests ---
async function loadPendingRequests() {
    try {
        const res = await fetch(`${API_HOST}/membership/requests`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const requests = await res.json();
        renderRequestsTable(requests);
    } catch (err) {
        displayMessage(`Error loading requests: ${err.message}`, true);
    }
}

// --- Render requests table ---
function renderRequestsTable(requests) {
    const tbody = document.querySelector("#membershipTable tbody");
    if (!tbody) return;
    tbody.innerHTML = ""; // clear existing rows

    const idFilter = document.getElementById("requestIdFilter")?.value?.trim().toLowerCase() || "";
    const residentFilter = document.getElementById("residentFilter")?.value?.trim().toLowerCase() || "";

    const filtered = requests.filter(r => {
        const matchesId = r.RequestID?.toString().toLowerCase().includes(idFilter);
        const matchesResident = r.ResidentName?.toLowerCase().includes(residentFilter);
        return matchesId && matchesResident;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">No pending requests found.</td></tr>`;
        return;
    }

    filtered.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${r.RequestID}</td>
            <td>${r.ResidentName}</td>
            <td>${r.NationalID}</td>
            <td>${r.RequestedAt ? new Date(r.RequestedAt).toLocaleString() : "-"}</td>
            <td>${r.Status || "Pending"}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Handle sync button click ---
async function handleSyncClick() {
    displayMessage("Syncing membership requests...");
    await loadPendingRequests();
    displayMessage("Membership requests synced successfully.", false);
}

// --- Initialize membership page ---
export function initMembershipPage() {
    // Bind buttons
    document.getElementById("syncBtn")?.addEventListener("click", handleSyncClick);
    document.getElementById("clearFilterBtn")?.addEventListener("click", () => {
        document.getElementById('requestIdFilter').value = '';
        document.getElementById('residentFilter').value = '';
        displayMessage("Filters cleared.", false);
    });

    // Load table initially
    loadPendingRequests();

    // Optional: filter on input change
    document.getElementById('requestIdFilter')?.addEventListener('input', loadPendingRequests);
    document.getElementById('residentFilter')?.addEventListener('input', loadPendingRequests);
}
