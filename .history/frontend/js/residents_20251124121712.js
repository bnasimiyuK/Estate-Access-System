console.log("🏘️ residents.js loaded");

// -------------------- Backend API URL --------------------
const API_BASE = "http://localhost:4050/api";

// -------------------- On DOM Load --------------------
document.addEventListener("DOMContentLoaded", async () => {
  await loadResidents();
  setupSyncButton();
});

// -------------------- Load Residents --------------------
async function loadResidents() {
  const token = localStorage.getItem("token");
  if (!token) return alert("Please log in first.");

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const role = payload.role.toLowerCase();

    const API_URL = role === "admin"
      ? `${API_BASE}/residents/all`
      : `${API_BASE}/residents/profile`;

    const res = await fetch(API_URL, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    populateResidentsTable(role, data);

  } catch (err) {
    console.error("❌ Failed to load residents:", err);
    alert("Error loading residents data. Check console.");
  }
}

// -------------------- Populate DataTable --------------------
function populateResidentsTable(role, data) {
  const residents = Array.isArray(data) ? data : [data];

  if ($.fn.DataTable.isDataTable("#residentsTable")) {
    $("#residentsTable").DataTable().destroy();
  }

  const columns = [
    { data: "ResidentID", title: "Resident ID" },
    { data: "UserID", title: "User ID" },
    { data: "ResidentName", title: "Name" },
    { data: "NationalID", title: "National ID" },
    { data: "PhoneNumber", title: "Phone" },
    { data: "Email", title: "Email" },
    { data: "HouseNumber", title: "House" },
    { data: "CourtName", title: "Court" },
    { data: "Occupation", title: "Occupation" },
    { 
      data: "DateJoined", 
      title: "Date Joined",
      render: d => d ? new Date(d).toLocaleDateString() : "-"
    },
    { 
      data: "Status", 
      title: "Status",
      render: s => {
        const color = s === "Active" ? "green" : s === "Rejected" ? "red" : "yellow";
        return `<span class="px-2 py-1 rounded-full bg-${color}-100 text-${color}-800 font-semibold text-xs">${s}</span>`;
      }
    },
    { data: "RoleName", title: "Role" },
    { data: "TotalDue", title: "Total Due" }
  ];

  const table = $("#residentsTable").DataTable({
    data: residents,
    columns: columns,
    dom: "Brtip",
    buttons: [
      "excelHtml5",
      "pdfHtml5",
      "print",
      { text: 'Sort by Name', action: function () { this.api().order([2, 'asc']).draw(); } },
      { text: 'Sort by Date Joined', action: function () { this.api().order([9, 'desc']).draw(); } }
    ],
    responsive: true,
    pageLength: 10,
    initComplete: function () {
      this.api().columns().every(function () {
        const column = this;
        $(column.header()).find('input.column-filter').on('keyup change', function () {
          column.search(this.value).draw();
        });
      });
    }
  });
}

// -------------------- Sync Button for Admin --------------------
function setupSyncButton() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const payload = JSON.parse(atob(token.split(".")[1]));
  const role = payload.role.toLowerCase();
  const btn = document.getElementById("syncResidentsBtn");

  if (!btn || role !== "admin") {
    if (btn) btn.style.display = "none";
    return;
  }

  btn.addEventListener("click", async () => {
    try {
      const res = await fetch(`${API_BASE}/residents/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      alert(result.message || "Residents synced successfully");
      await loadResidents();
    } catch (err) {
      console.error("❌ Sync failed:", err);
      alert("Failed to sync residents.");
    }
  });
}
// --------------------------
// Residents Dashboard JS
// --------------------------
const sidebarButtons = document.querySelectorAll('.sidebarBtn');
const mainContent = document.getElementById('dynamic-section-content');

sidebarButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    const url = btn.dataset.target;
    if (!url) return;

    // Highlight selected button
    sidebarButtons.forEach(b => b.classList.remove('bg-blue-600', 'shadow-inner'));
    btn.classList.add('bg-blue-600', 'shadow-inner');

    // Load content dynamically
    mainContent.innerHTML = '<p>Loading...</p>';
    try {
      const res = await fetch(url);
      const html = await res.text();
      mainContent.innerHTML = html;
    } catch (err) {
      mainContent.innerHTML = `<p class="text-red-600">Failed to load: ${err.message}</p>`;
    }
  });
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('accessToken');
  window.location.href = '/login.html';
});

// --------------------------
// Placeholder: Populate summary cards (fetch from API)
// --------------------------
async function loadResidentDashboard() {
  try {
    // Simulated fetch
    const data = {
      paymentStatus: 'Paid',
      activeVisitorPasses: 3,
      lastAccessAttempts: 7,
      residentAlerts: 1
    };
    document.getElementById('paymentStatusCard').textContent = data.paymentStatus;
    document.getElementById('activeVisitorPasses').textContent = data.activeVisitorPasses;
    document.getElementById('lastAccessAttempts').textContent = data.lastAccessAttempts;
    document.getElementById('residentAlerts').textContent = data.residentAlerts;
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

// Initial load
loadResidentDashboard();