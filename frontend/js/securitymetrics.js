// ======================
// Tab Switching
// ======================
const tabPending = document.getElementById("tabPending");
const tabCheckin = document.getElementById("tabCheckin");
const tabLogs = document.getElementById("tabLogs");

const pendingSection = document.getElementById("pendingSection");
const checkinSection = document.getElementById("checkinSection");
const logsSection = document.getElementById("logsSection");

tabPending.addEventListener("click", () => {
  pendingSection.classList.remove("hidden");
  checkinSection.classList.add("hidden");
  logsSection.classList.add("hidden");
  fetchPendingVisitors();
});

tabCheckin.addEventListener("click", () => {
  pendingSection.classList.add("hidden");
  checkinSection.classList.remove("hidden");
  logsSection.classList.add("hidden");
});

tabLogs.addEventListener("click", () => {
  pendingSection.classList.add("hidden");
  checkinSection.classList.add("hidden");
  logsSection.classList.remove("hidden");
  fetchAccessLogs();
});

// ======================
// API BASE URL
// ======================
const API_BASE = "http://localhost:4050/api/security";

// ======================
// Pending Approvals
// ======================
async function fetchPendingVisitors() {
  const table = document.getElementById("pendingTable");
  table.innerHTML = "<tr><td colspan='5' class='text-center py-2'>Loading...</td></tr>";
  try {
    const res = await fetch(`${API_BASE}/visitors/pending-l2`);
    const visitors = await res.json();
    if (visitors.length === 0) {
      table.innerHTML = "<tr><td colspan='5' class='text-center py-2'>No pending approvals</td></tr>";
      return;
    }
    table.innerHTML = visitors.map(v => `
      <tr>
        <td class="py-1 px-2 border">${v.VisitorName}</td>
        <td class="py-1 px-2 border">${v.ResidentName}</td>
        <td class="py-1 px-2 border">${new Date(v.DateOfVisit).toLocaleString()}</td>
        <td class="py-1 px-2 border">${v.AccessCode}</td>
        <td class="py-1 px-2 border flex gap-1">
          <button class="approveBtn bg-green-500 text-white px-2 py-0.5 rounded" data-id="${v.VisitorAccessID}">Approve</button>
          <button class="denyBtn bg-red-500 text-white px-2 py-0.5 rounded" data-id="${v.VisitorAccessID}">Deny</button>
        </td>
      </tr>
    `).join("");

    // Attach buttons
    document.querySelectorAll(".approveBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        await fetch(`${API_BASE}/visitors/approve-l2/${id}`, { method: "PUT" });
        fetchPendingVisitors();
      });
    });

    document.querySelectorAll(".denyBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        await fetch(`${API_BASE}/visitors/deny-l2/${id}`, { method: "PUT" });
        fetchPendingVisitors();
      });
    });

  } catch (err) {
    table.innerHTML = "<tr><td colspan='5' class='text-center py-2 text-red-600'>Error loading data</td></tr>";
    console.error(err);
  }
}

// ======================
// Check-In / Check-Out
// ======================
const checkinBtn = document.getElementById("checkinBtn");
const checkoutBtn = document.getElementById("checkoutBtn");
const accessCodeInput = document.getElementById("accessCodeInput");
const checkinMsg = document.getElementById("checkinMsg");

checkinBtn.addEventListener("click", async () => {
  const code = accessCodeInput.value.trim();
  if (!code) return alert("Enter access code");
  try {
    const res = await fetch(`${API_BASE}/visitors/checkin/${code}`, { method: "POST" });
    const data = await res.json();
    checkinMsg.textContent = data.message || data.error;
    accessCodeInput.value = "";
  } catch (err) {
    console.error(err);
    checkinMsg.textContent = "Check-in failed";
  }
});

checkoutBtn.addEventListener("click", async () => {
  const code = accessCodeInput.value.trim();
  if (!code) return alert("Enter access code");
  try {
    const res = await fetch(`${API_BASE}/visitors/checkout/${code}`, { method: "POST" });
    const data = await res.json();
    checkinMsg.textContent = data.message || data.error;
    accessCodeInput.value = "";
  } catch (err) {
    console.error(err);
    checkinMsg.textContent = "Check-out failed";
  }
});

// ======================
// Access Logs
// ======================
async function fetchAccessLogs() {
  const table = document.getElementById("logsTable");
  table.innerHTML = "<tr><td colspan='5' class='text-center py-2'>Loading...</td></tr>";
  try {
    const res = await fetch(`${API_BASE}/accesslogs`);
    const logs = await res.json();
    if (logs.length === 0) {
      table.innerHTML = "<tr><td colspan='5' class='text-center py-2'>No logs found</td></tr>";
      return;
    }
    table.innerHTML = logs.map(log => `
      <tr>
        <td class="py-1 px-2 border">${new Date(log.TimestampUtc).toLocaleString()}</td>
        <td class="py-1 px-2 border">${log.UserId}</td>
        <td class="py-1 px-2 border">${log.Action}</td>
        <td class="py-1 px-2 border">${log.Resource}</td>
        <td class="py-1 px-2 border">${log.Metadata}</td>
      </tr>
    `).join("");
  } catch (err) {
    table.innerHTML = "<tr><td colspan='5' class='text-center py-2 text-red-600'>Error loading logs</td></tr>";
    console.error(err);
  }
}
