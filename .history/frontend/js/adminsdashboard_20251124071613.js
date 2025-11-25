// =========================================================
// unifiedDashboard.js - Admin & Security Dashboard Loader
// =========================================================

// 🔑 ENVIRONMENT & AUTH SETUP
const API_HOST = "http://localhost:4050";
const token = localStorage.getItem("accessToken");
const userRole = localStorage.getItem("userRole"); // "admin" or "security"
if (!token) window.location.href = "/login.html";

// ================================
// ENDPOINTS
const ENDPOINTS = {
    DASHBOARD_SUMMARY: userRole === "admin" ? `${API_HOST}/api/admin/summary` : `${API_HOST}/api/residents/dashboard/summary`,
    DASHBOARD_CHART: userRole === "admin" ? `${API_HOST}/api/admin/accesschart` : `${API_HOST}/api/residents/admin/accesschart`,
    SYNC: `${API_HOST}/api/admin/sync`,
    PENDING_REQUESTS: `${API_HOST}/api/admin/requests/pending`,
    APPROVED_RESIDENTS: `${API_HOST}/api/admin/residents/approved`,
    APPROVE_REQUEST: (id) => `${API_HOST}/api/admin/approve/${id}`,
    REJECT_REQUEST: (id) => `${API_HOST}/api/admin/reject/${id}`,
    DELETE_REQUEST: (id) => `${API_HOST}/api/admin/delete/${id}`,
    ALL_RESIDENTS: `${API_HOST}/api/admin/residents/all`,
    ACCESS_LOGS: userRole === "admin" ? `${API_HOST}/api/admin/accesslogs` : `${API_HOST}/api/accesslogs`,
};

// ================================
// AUTH & LOGOUT
document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");
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

        // Page-specific loaders
        if(url.includes("dashboardoverview.html")) { 
            await loadDashboardSummary(); 
            await loadAccessChart(); 
        } 
        else if(url.includes("membership.html")) { 
            import('/js/membership.js').then(module => {
                module.initMembershipPage();
            });
        } 
        else if(url.includes("accesslogs.html")) { 
            await loadAccessLogs(); 
        }
    } catch(e){
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
// ACCESS LOGS
async function loadAccessLogs() {
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
        const resp = await fetch(ENDPOINTS.ACCESS_LOGS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error('Failed to fetch access logs');
        const logs = await resp.json();
        tbody.innerHTML = logs.length === 0 ? '<tr><td colspan="4">No logs found</td></tr>' : '';
        logs.forEach(log => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${formatTimestamp(log.TimestampUtc || log.timestamp)}</td>
                <td>${log.UserId || log.userId}</td>
                <td>${log.Action || log.action}</td>
                <td>${log.LogType || log.type}</td>
            `;
        });
    } catch (e) {
        displayMessage(`Failed to load access logs: ${e.message}`, true);
    }
}

// ================================
// INITIAL LOAD
document.addEventListener('DOMContentLoaded',()=> {
    loadPageIntoMainContent('sections/dashboardoverview.html');
});
