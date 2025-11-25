console.log("🏘️ residents.js loaded");

// Load residents on page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadResidents();
  setupSyncButton();
});

// ========================================================
// LOAD RESIDENTS
// ========================================================
async function loadResidents() {
  const token = localStorage.getItem("token"); // JWT token
  if (!token) return alert("Please log in first.");

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const role = payload.role.toLowerCase();

    // Use admin or resident endpoint
    const API_URL =
      role === "admin"
        ? "http://localhost:4050/api/residents/all"
        : "http://localhost:4050/api/residents/profile";

    const response = await fetch(API_URL, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    populateResidentsTable(role, data);

  } catch (err) {
    console.error("❌ Failed to load residents:", err);
    alert("Error loading residents. Check console.");
  }
}

// ========================================================
// POPULATE DATATABLE
// ========================================================
function populateResidentsTable(role, data) {

  const residents = Array.isArray(data) ? data : [data];

  // Destroy old instance
  if ($.fn.DataTable.isDataTable("#residentsTable")) {
    $("#residentsTable").DataTable().destroy();
  }

  // Initialize DataTable
  $("#residentsTable").DataTable({
    data: residents,
    columns: [
      { data: "ResidentID" },
      { data: "UserID" },
      { data: "ResidentName" },
      { data: "NationalID" },
      { data: "PhoneNumber" },
      { data: "Email" },
      { data: "HouseNumber" },
      { data: "CourtName" },
      { data: "Occupation" },
      {
        data: "DateJoined",
        render: d => d ? new Date(d).toLocaleDateString() : "-"
      },
      {
        data: "Status",
        render: s => {
          const color =
            s === "Approved"
              ? "green"
              : s === "Rejected"
              ? "red"
              : "yellow";

          return `<span class="px-2 py-1 rounded-full bg-${color}-100 text-${color}-800 font-semibold text-xs">${s}</span>`;
        }
      },
      { data: "RoleName" },
      { data: "TotalDue" }
    ],

    dom: "Brtip",
    buttons: [
      "excelHtml5",
      "pdfHtml5",
      "print",
      {
        text: 'Sort by Name',
        action: function () {
          this.api().order([2, 'asc']).draw();
        }
      },
      {
        text: 'Sort by Date Joined',
        action: function () {
          this.api().order([9, 'desc']).draw();
        }
      }
    ],

    responsive: true,
    pageLength: 10,

    initComplete: function () {
      // Enable column filtering
      this.api().columns().every(function () {
        const column = this;
        $(column.header())
          .find("input.column-filter")
          .on("keyup change", function () {
            column.search(this.value).draw();
          });
      });
    }
  });
}

// ========================================================
// ADMIN — SYNC BUTTON
// ========================================================
function setupSyncButton() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const payload = JSON.parse(atob(token.split(".")[1]));
  const role = payload.role.toLowerCase();
  const btn = document.getElementById("syncResidentsBtn");

  if (role !== "admin") {
    btn.style.display = "none";
    return;
  }

  btn.addEventListener("click", async () => {
    try {
      const res = await fetch("http://localhost:4050/api/residents/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await res.json();
      alert(result.message);

      await loadResidents();

    } catch (err) {
      console.error("❌ Sync failed:", err);
      alert("Failed to sync residents.");
    }
  });
}
