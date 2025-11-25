console.log("🏘️ residents.js loaded");

// -------------------- Backend API URL --------------------
const API_BASE = "http://localhost:4050/api";

// -------------------- On DOM Load --------------------
document.addEventListener("DOMContentLoaded", async () => {
  await loadResidents();
  setupSyncButton();
});

// -------------------- Load Residents from Backend --------------------
async function loadResidents() {
  const token = localStorage.getItem("accessToken");
  if (!token) return alert("Please log in first.");

  try {
    // Decode token to get role
    const payload = JSON.parse(atob(token.split(".")[1]));
    const role = payload.role.toLowerCase();

    console.log("User role:", role);

    // ADMIN → see all residents
    // RESIDENT → see own profile
    const API_URL =
      role === "admin"
        ? `${API_BASE}/residents/all`
        : `${API_BASE}/residents/profile`;

    console.log("Fetching from:", API_URL);

    const res = await fetch(API_URL, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    console.log("Residents received:", data);

    populateResidentsTable(role, data);

  } catch (err) {
    console.error("❌ Failed to load residents:", err);
    alert("Error loading residents data. Check console for details.");
  }
}

// -------------------- Populate DataTable --------------------
function populateResidentsTable(role, data) {

  // If backend returns 1 record for residents → convert to array
  const residents = Array.isArray(data) ? data : [data];

  // Safely rebuild DataTable
  if ($.fn.DataTable.isDataTable("#residentsTable")) {
    $("#residentsTable").DataTable().clear().destroy();
  }

  const table = $("#residentsTable").DataTable({
    data: residents,
    columns: [
      { data: "ResidentID", title: "ResidentID" },
      { data: "UserID", title: "UserID" },
      { data: "ResidentName", title: "Resident Name" },
      { data: "NationalID", title: "National ID" },
      { data: "HouseNumber", title: "House No." },
      { data: "CourtName", title: "Court Name" },
      { data: "PhoneNumber", title: "Phone" },
      { data: "Email", title: "Email" },
      { data: "Occupation", title: "Occupation" },
      {
        data: "DateJoined",
        title: "Date Joined",
        render: (d) => (d ? new Date(d).toLocaleDateString() : "-"),
      },
      {
        data: "Status",
        title: "Status",
        render: (s) => {
          const color =
            s === "Active"
              ? "green"
              : s === "Rejected"
              ? "red"
              : "yellow";
          return `<span class="px-2 py-1 rounded-full bg-${color}-100 text-${color}-800 font-semibold text-xs">${s}</span>`;
        },
      },
      { data: "RoleName", title: "Role" },
      { data: "TotalDue", title: "Total Due" },
    ],

    dom: "Brtip",
    buttons: [
      "excelHtml5",
      "pdfHtml5",
      "print",
      {
        text: "Sort by Name",
        action: function () {
          this.api().order([2, "asc"]).draw();
        },
      },
      {
        text: "Sort by Date Joined",
        action: function () {
          this.api().order([9, "desc"]).draw();
        },
      },
    ],

    responsive: true,
    pageLength: 10,

    initComplete: function () {
      this.api()
        .columns()
        .every(function () {
          const column = this;
          $(column.header())
            .find("input.column-filter")
            .on("keyup change", function () {
              column.search(this.value).draw();
            });
        });
    },
  });
}

// -------------------- Sync Button for Admin --------------------
function setupSyncButton() {
  const token = localStorage.getItem("accessToken");
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
