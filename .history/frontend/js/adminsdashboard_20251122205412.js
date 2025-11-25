// ================================
// 🔑 ENVIRONMENT & AUTH SETUP
// ================================
const API_HOST = "http://localhost:4050";
const token = localStorage.getItem("accessToken");

if (!token) window.location.href = "/login.html";

// ================================
// API ENDPOINTS
// ================================
const ENDPOINTS = {
    DASHBOARD_SUMMARY: `${API_HOST}/api/residents/dashboard/summary`,
    DASHBOARD_CHART: `${API_HOST}/api/residents/admin/accesschart`,
    PENDING_REQUESTS: `${API_HOST}/api/admin/requests/pending`,
    APPROVED_RESIDENTS: `${API_HOST}/api/admin/residents/approved`,
    APPROVE_REQUEST: (id) => `${API_HOST}/api/admin/approve/${id}`,
    REJECT_REQUEST: (id) => `${API_HOST}/api/admin/reject/${id}`,
    DELETE_REQUEST: (id) => `${API_HOST}/api/admin/delete/${id}`,
    SYNC: `${API_HOST}/api/admin/sync`,
};

// ================================
// HELPERS
// ================================
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

function displayMessage(msg, isError = false) {
    const el = document.getElementById("msg");
    if (!el) return;
    el.textContent = msg;
    el.className = isError ? "text-red-600" : "text-green-600";
    setTimeout(() => { el.textContent = ""; el.className = ""; }, 5000);
}

function formatTimestamp(ts) {
    return ts ? new Date(ts).toLocaleString() : "N/A";
}

// ================================
// MEMBERSHIP FUNCTIONS
// ================================
async function loadPendingRequests() {
    const table = document.getElementById("membershipTableBody");
    if (!table) return;
    table.innerHTML = '<tr><td colspan="11">Loading...</td></tr>';

    try {
        const resp = await fetch(ENDPOINTS.PENDING_REQUESTS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
        const requests = await resp.json();

        if (!requests.length) {
            table.innerHTML = '<tr><td colspan="11">No pending requests.</td></tr>';
            return;
        }

        table.innerHTML = requests.map(r => `
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
                <td>${formatTimestamp(r.RequestedAt)}</td>
                <td>
                    <button data-id="${r.RequestID}" class="approve-btn">Approve</button>
                    <button data-id="${r.RequestID}" class="reject-btn">Reject</button>
                    <button data-id="${r.RequestID}" class="delete-btn">Delete</button>
                </td>
            </tr>
        `).join("");

        // Attach listeners after DOM injection
        document.querySelectorAll(".approve-btn").forEach(b => b.addEventListener("click", e => handleApproveClick(e.target.dataset.id)));
        document.querySelectorAll(".reject-btn").forEach(b => b.addEventListener("click", e => handleRejectClick(e.target.dataset.id)));
        document.querySelectorAll(".delete-btn").forEach(b => b.addEventListener("click", e => handleDeleteClick(e.target.dataset.id)));

    } catch (err) {
        console.error(err);
        table.innerHTML = '<tr><td colspan="11">Error loading data.</td></tr>';
        displayMessage("Error loading pending requests.", true);
    }
}

async function loadApprovedResidents() {
    const table = document.getElementById("residentsTableBody");
    if (!table) return;
    table.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

    try {
        const resp = await fetch(ENDPOINTS.APPROVED_RESIDENTS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error(resp.statusText);
        const residents = await resp.json();

        if (!residents.length) {
            table.innerHTML = '<tr><td colspan="8">No approved residents.</td></tr>';
            return;
        }

        table.innerHTML = residents.map(r => `
            <tr>
                <td>${r.ResidentName}</td>
                <td>${r.NationalID}</td>
                <td>${r.PhoneNumber}</td>
                <td>${r.Email}</td>
                <td>${r.HouseNumber}</td>
                <td>${r.CourtName}</td>
                <td>${r.RoleName}</td>
            </tr>
        `).join("");

    } catch (err) {
        console.error(err);
        table.innerHTML = '<tr><td colspan="8">Error loading approved residents.</td></tr>';
    }
}

// Approve / Reject / Delete actions
async function handleApproveClick(id) { await handleAction(id, ENDPOINTS.APPROVE_REQUEST); }
async function handleRejectClick(id) { await handleAction(id, ENDPOINTS.REJECT_REQUEST); }
async function handleDeleteClick(id) { await handleAction(id, ENDPOINTS.DELETE_REQUEST, 'DELETE'); }

async function handleAction(id, urlFn, method = 'PUT') {
    try {
        const resp = await fetch(urlFn(id), { method, headers: getAuthHeaders() });
        if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
        displayMessage(`Action successful for ${id}`);
        await loadPendingRequests();
        await loadApprovedResidents();
    } catch (err) {
        console.error(err);
        displayMessage(`Action failed for ${id}`, true);
    }
}

// ================================
// DASHBOARD SUMMARY
// ================================
async function loadDashboardSummary() {
    try {
        const resp = await fetch(ENDPOINTS.DASHBOARD_SUMMARY, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error(resp.statusText);
        const data = await resp.json();
        document.getElementById("totalResidents").textContent = data.residents || 0;
        document.getElementById("pendingPayments").textContent = data.pendingPayments || 0;
        document.getElementById("compliancePct").textContent = (data.compliance || 0) + "%";
        document.getElementById("overrideCount").textContent = data.overrides || 0;
    } catch (err) {
        console.error(err);
    }
}

async function loadAccessChart() {
    try {
        const resp = await fetch(ENDPOINTS.DASHBOARD_CHART, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error(resp.statusText);
        const data = await resp.json();
        const ctx = document.getElementById("accessChart").getContext("2d");
        new Chart(ctx, {
            type: "line",
            data: { labels: data.days || [], datasets: [{ label: "Access Attempts", data: data.counts || [], borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.2)", fill: true }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } catch (err) {
        console.error(err);
    }
}

// ================================
// INITIALIZATION
// ================================
document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("accessToken");
    window.location.href = "/login.html";
});

// Load dashboard immediately
(async () => {
    await loadDashboardSummary();
    await loadAccessChart();
    await loadPendingRequests();
    await loadApprovedResidents();
})();
