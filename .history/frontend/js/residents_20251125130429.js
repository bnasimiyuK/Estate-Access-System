console.log("🏘️ residents.js loaded");

// ========================================================
// 🌐 BACKEND API BASE URL
// ========================================================
const API_BASE = "http://localhost:4050/api";

// ========================================================
// 🟦 ON PAGE LOAD
// ========================================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("📌 DOM Loaded – Starting residents load...");
  await loadResidents();
  setupSyncButton();
});

// ========================================================
// 🟦 LOAD RESIDENTS FROM BACKEND
// ========================================================
async function loadResidents() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please log in first.");
    window.location.href = "/login.html";
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const role = payload.role?.toLowerCase();

    const API_URL =
      role === "admin"
        ? `${API_BASE}/residents/all`
        : `${API_BASE}/residents/profile`;

    console.log("➡️ Fetching Residents From:", API_URL);

    const res = await fetch(API_URL, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.error("❌ Backend Error:", await res.text());
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log("📦 Residents Received:", data);

    populateResidentsTable(role, data);
  } catch (err) {
    console.error("❌ Failed to load residents:", err);
    alert("Error loading residents data. Check console.");
  }
}

// ========================================================
// 🟦 POPULATE DATATABLE
// ========================================================
function populateResidentsTable(role, data) {
  const residents = Array.isArray(data) ? data : [data];

  if ($.fn.DataTable.isDataTable("#residentsTable")) {
    $("#residentsTable").DataTable().destroy();
  }

  const tableColumns = [
    { data: "ResidentID", title: "Resident ID" },
    { data: "UserID", title: "User ID" },
    { data: "ResidentName", title: "Name" },
    { data: "NationalID", title: "National ID" },
    { data: "HouseNumber", title: "House No." },
    { data: "CourtName", title: "Court Name" },
    { data: "PhoneNumber", title: "Phone" },
    { data: "Email", title: "Email" },
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
  ];

  $("#residentsTable").DataTable({
    data: residents,
    columns: tableColumns,
    dom: "Bfrtip",
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
    pageLength: 10,
    responsive: true,
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

// ========================================================
// 🟦 ADMIN – SYNC RESIDENTS BUTTON
// ========================================================
function setupSyncButton() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const payload = JSON.parse(atob(token.split(".")[1]));
  const role = payload.role?.toLowerCase();

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
      alert(result.message || "Residents synced.");

      await loadResidents();
    } catch (err) {
      console.error("❌ Sync failed:", err);
      alert("Failed to sync residents.");
    }
  });
}
