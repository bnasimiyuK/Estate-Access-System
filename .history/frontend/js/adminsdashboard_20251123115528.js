// =========================================================
// adminsdashboard.js - Unified Admin Dashboard Loader
// =========================================================

// 🔑 ENVIRONMENT & AUTH SETUP
const API_HOST = "http://localhost:4050";
const token = localStorage.getItem("accessToken");
if (!token) window.location.href = "/login.html";

// Define API Endpoints
const ENDPOINTS = {
    DASHBOARD_SUMMARY: `${API_HOST}/api/residents/dashboard/summary`,
    DASHBOARD_CHART: `${API_HOST}/api/residents/admin/accesschart`,
    SYNC: `${API_HOST}/api/admin/sync`,
    PENDING_REQUESTS: `${API_HOST}/api/admin/requests/pending`,
    APPROVED_RESIDENTS: `${API_HOST}/api/admin/residents/approved`,
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
};

// ================================
// AUTH & LOGOUT
document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("accessToken");
    window.location.href = "/login.html";
});

// ================================
// UTILITIES
function getAuthHeaders() {
    return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
}

function displayMessage(message, isError = false) {
    const msgElement = document.getElementById("msg");
    if (!msgElement) return;
    msgElement.textContent = message;
    msgElement.className = `p-3 rounded-lg text-sm font-semibold mb-3 ${isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`;
    setTimeout(() => {
        msgElement.textContent = '';
        msgElement.className = 'text-sm text-gray-700 mb-3';
    }, 5000);
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    try { return new Date(timestamp).toLocaleString(); } 
    catch (e) { return 'N/A'; }
}

const safeUpdate = (id, value, suffix = '') => {
    const el = document.getElementById(id);
    if (el) el.textContent = value + suffix;
};

// ================================
// MEMBERSHIP FUNCTIONS
async function handleApproveClick(requestId) {
    safeUpdate('actionText', `Processing Approval for ${requestId}...`);
    try {
        const resp = await fetch(ENDPOINTS.APPROVE_REQUEST(requestId), { method: 'PUT', headers: getAuthHeaders() });
        if (!resp.ok) throw new Error((await resp.json().catch(()=>({}))).message || `Approval failed`);
        displayMessage(`Successfully approved ${requestId}`, false);
        await loadPendingRequests(); await loadApprovedResidents();
    } catch(e){ displayMessage(`Approval failed: ${e.message}`, true); }
}

async function handleRejectClick(requestId) {
    if (!confirm(`Reject request ${requestId}?`)) return;
    try {
        const resp = await fetch(ENDPOINTS.REJECT_REQUEST(requestId), { method:'PUT', headers:getAuthHeaders() });
        if(!resp.ok) throw new Error((await resp.json().catch(()=>({}))).message || `Rejection failed`);
        displayMessage(`Successfully rejected ${requestId}`, false);
        await loadPendingRequests(); await loadApprovedResidents();
    } catch(e){ displayMessage(`Rejection failed: ${e.message}`, true); }
}

async function handleDeleteClick(requestId) {
    if (!confirm(`Delete request ${requestId}?`)) return;
    try {
        const resp = await fetch(ENDPOINTS.DELETE_REQUEST(requestId), { method:'DELETE', headers:getAuthHeaders() });
        if(!resp.ok) throw new Error((await resp.json().catch(()=>({}))).message || `Deletion failed`);
        displayMessage(`Deleted request ${requestId}`, false);
        await loadPendingRequests(); await loadApprovedResidents();
    } catch(e){ displayMessage(`Deletion failed: ${e.message}`, true); }
}

async function handleSyncClick(event) {
    const btn = event.currentTarget;
    const originalText = btn.textContent, originalClass = btn.className;
    btn.disabled = true; btn.textContent='Syncing...'; btn.className='bg-yellow-500 text-white px-4 py-2 rounded-lg animate-pulse';
    try {
        const resp = await fetch(ENDPOINTS.SYNC, { method:'POST', headers:getAuthHeaders() });
        if(!resp.ok) throw new Error((await resp.json().catch(()=>({}))).message || 'Sync failed');
        btn.textContent='Sync Complete!'; btn.className='bg-green-600 text-white px-4 py-2 rounded-lg';
        displayMessage("Data synchronization successful", false);
        await loadPendingRequests(); await loadApprovedResidents();
    } catch(err){ btn.textContent='Sync Failed ❌'; btn.className='bg-red-600 text-white px-4 py-2 rounded-lg'; displayMessage(`Sync failed: ${err.message}`,true); }
    finally{ setTimeout(()=>{ btn.disabled=false; btn.textContent=originalText; btn.className=originalClass; }, 3000); }
}

async function loadPendingRequests() {
    const tbody = document.getElementById('membershipTableBody');
    if(!tbody) return;
    tbody.innerHTML='<tr><td colspan="11">Loading...</td></tr>';
    try {
        const resp = await fetch(ENDPOINTS.PENDING_REQUESTS, { headers:getAuthHeaders() });
        if(!resp.ok) throw new Error('Failed to fetch pending requests');
        const requests = await resp.json();
        tbody.innerHTML = requests.length === 0 ? '<tr><td colspan="11">No requests</td></tr>' : '';
        requests.forEach(r=>{
            const row = tbody.insertRow();
            row.innerHTML=`
                <td>${r.RequestID||r.id}</td>
                <td>${r.ResidentName||'N/A'}</td>
                <td>${r.NationalID||'N/A'}</td>
                <td>${r.PhoneNumber||'N/A'}</td>
                <td>${r.Email||'N/A'}</td>
                <td>${r.HouseNumber||'N/A'}</td>
                <td>${r.CourtName||'N/A'}</td>
                <td>${r.RoleName||'N/A'}</td>
                <td>${r.Status||'Pending'}</td>
                <td>${formatTimestamp(r.RequestedAt||r.requestedAt)}</td>
                <td class="flex space-x-1">
                    <button class="approve-btn" data-id="${r.RequestID||r.id}">Approve</button>
                    <button class="reject-btn" data-id="${r.RequestID||r.id}">Reject</button>
                    <button class="delete-btn" data-id="${r.RequestID||r.id}">Delete</button>
                </td>
            `;
        });
        tbody.querySelectorAll('.approve-btn').forEach(b=>b.addEventListener('click', e=>handleApproveClick(e.target.dataset.id)));
        tbody.querySelectorAll('.reject-btn').forEach(b=>b.addEventListener('click', e=>handleRejectClick(e.target.dataset.id)));
        tbody.querySelectorAll('.delete-btn').forEach(b=>b.addEventListener('click', e=>handleDeleteClick(e.target.dataset.id)));
    } catch(e){ displayMessage(`Failed to load pending requests: ${e.message}`, true); }
}

async function loadApprovedResidents() {
    const tbody = document.getElementById('residentsTableBody');
    if(!tbody) return;
    tbody.innerHTML='<tr><td colspan="8">Loading...</td></tr>';
    try {
        const resp = await fetch(ENDPOINTS.APPROVED_RESIDENTS,{headers:getAuthHeaders()});
        if(!resp.ok) throw new Error('Failed to fetch approved residents');
        const residents = await resp.json();
        tbody.innerHTML = residents.length===0 ? '<tr><td colspan="8">No residents</td></tr>' : '';
        residents.forEach(r=>{
            const row=tbody.insertRow();
            row.innerHTML=`
                <td>${r.ResidentName||'N/A'}</td>
                <td>${r.NationalID||'N/A'}</td>
                <td>${r.PhoneNumber||'N/A'}</td>
                <td>${r.Email||'N/A'}</td>
                <td>${r.HouseNumber||'N/A'}</td>
                <td>${r.CourtName||'N/A'}</td>
                <td>${r.RoleName||'N/A'}</td>
            `;
        });
    } catch(e){ displayMessage(`Failed to load approved residents: ${e.message}`, true); }
}

function attachMembershipListeners(){
    document.getElementById("syncBtn")?.addEventListener("click",handleSyncClick);
    document.getElementById("clearFilterBtn")?.addEventListener("click", ()=>{
        document.getElementById('requestIdFilter').value=''; 
        document.getElementById('residentFilter').value='';
        displayMessage("Filters cleared.", false);
    });
}

// ================================
// DASHBOARD FUNCTIONS
async function loadDashboardSummary(){
    try{
        const res = await fetch(ENDPOINTS.DASHBOARD_SUMMARY,{headers:getAuthHeaders()});
        if(!res.ok) throw new Error(res.statusText);
        const d=await res.json();
        safeUpdate("totalResidents",d.residents||0);
        safeUpdate("pendingPayments",d.pendingPayments||0);
        safeUpdate("compliancePct",d.compliance||0,'%');
        safeUpdate("overrideCount",d.overrides||0);
    }catch(e){ console.error(e); }
}

async function loadAccessChart(){
    try{
        const res=await fetch(ENDPOINTS.DASHBOARD_CHART,{headers:getAuthHeaders()});
        if(!res.ok) throw new Error(res.statusText);
        const data=await res.json();
        const el=document.getElementById("accessChart");
        if(!el) return;
        const ctx=el.getContext("2d");
        if(window.accessChartInstance) window.accessChartInstance.destroy();
        window.accessChartInstance = new Chart(ctx,{
            type:'line',
            data:{labels:data.days||[], datasets:[{label:'Access Attempts', data:data.counts||[], borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.2)', fill:true}]},
            options:{responsive:true, maintainAspectRatio:false}
        });
    }catch(e){ console.error(e); }
}

// ================================
// SIDEBAR & PAGE LOADING
const sidebarButtons = document.querySelectorAll(".sidebarBtn");
const mainContent = document.getElementById("main-content-area");

async function loadPageIntoMainContent(url){
    if(!mainContent) return;
    mainContent.innerHTML='<div>Loading...</div>';
    try{
        const res = await fetch(url);
        if(!res.ok) throw new Error(res.status);
        const html=await res.text();
        mainContent.innerHTML=html;

        // Execute page-specific loaders
        if(url.includes("dashboardoverview.html")) { await loadDashboardSummary(); await loadAccessChart(); }
        else if(url.includes("membership.html")) { attachMembershipListeners(); await loadPendingRequests(); }
        else if(url.includes("membershiprecords.html")) { attachMembershipListeners(); await loadApprovedResidents(); }
        // Add other page loaders like payments, residents, visitors, reports, manual overrides...
    }catch(e){
        console.error(e);
        mainContent.innerHTML=`<div class="text-red-600">Failed to load: ${url}</div>`;
    }
}

// Sidebar click handler
sidebarButtons.forEach(btn=>{
    btn.addEventListener("click",()=>{
        sidebarButtons.forEach(b=>b.classList.remove("bg-blue-600","text-white"));
        btn.classList.add("bg-blue-600","text-white");
        const page=btn.dataset.target;
        if(page) loadPageIntoMainContent(page);
    });
});

// ================================
// INITIAL LOAD
document.addEventListener('DOMContentLoaded',()=>{
    loadPageIntoMainContent('sections/dashboardoverview.html');
});
async function loadaccesslogs() {
    const tbody = document.getElementById('accessLogsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

    try {
        const resp = await fetch(ENDPOINTS.ACCESS_LOGS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error('Failed to fetch access logs');

        const logs = await resp.json();

        tbody.innerHTML = logs.length === 0
            ? '<tr><td colspan="4">No logs found</td></tr>'
            : '';

        logs.forEach(log => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${formatTimestamp(log.Timestamp || log.timestamp)}</td>
                <td>${log.UserID || log.userId}</td>
                <td>${log.Action || log.action}</td>
                <td>${log.Type || log.type}</td>
            `;
        });
    } catch (e) {
        displayMessage(`Failed to load access logs: ${e.message}`, true);
    }
}
