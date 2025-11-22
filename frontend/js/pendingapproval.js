const API_BASE = "http://localhost:4050/api/security/visitors";

async function fetchPendingApprovals() {
  const table = document.getElementById("pendingTable");
  table.innerHTML = "<tr><td colspan='5' class='text-center py-2'>Loading...</td></tr>";
  try {
    const res = await fetch(`${API_BASE}/pending-l2`);
    const visitors = await res.json();
    if (!visitors.length) {
      table.innerHTML = "<tr><td colspan='5' class='text-center py-2'>No pending approvals</td></tr>";
      return;
    }
    table.innerHTML = visitors.map(v => `
      <tr>
        <td class="py-1 px-2 border">${v.VisitorName}</td>
        <td class="py-1 px-2 border">${v.ResidentName}</td>
        <td class="py-1 px-2 border">${new Date(v.DateOfVisit).toLocaleString()}</td>
        <td class="py-1 px-2 border">${v.AccessCode}</td>
        <td class="py-1 px-2 border flex gap-2">
          <button class="bg-green-600 px-2 py-0.5 rounded text-white" onclick="approveVisitor(${v.VisitorAccessID})">Approve</button>
          <button class="bg-red-600 px-2 py-0.5 rounded text-white" onclick="denyVisitor(${v.VisitorAccessID})">Deny</button>
        </td>
      </tr>
    `).join("");
  } catch(err) {
    console.error(err);
    table.innerHTML = "<tr><td colspan='5' class='text-center py-2 text-red-600'>Error loading pending approvals</td></tr>";
  }
}

async function approveVisitor(id) {
  await fetch(`${API_BASE}/approve-l2/${id}`, { method: "PUT" });
  fetchPendingApprovals();
}

async function denyVisitor(id) {
  await fetch(`${API_BASE}/deny-l2/${id}`, { method: "PUT" });
  fetchPendingApprovals();
}

fetchPendingApprovals();
