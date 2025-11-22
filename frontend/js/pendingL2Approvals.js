// -------------------------
// LOAD PENDING L2 APPROVALS
// -------------------------
async function loadPendingL2() {
  const table = document.getElementById("pendingL2Table");
  table.innerHTML = "<tr><td colspan='6' class='p-4 text-center'>Loading...</td></tr>";

  try {
    const res = await axios.get("/api/l2/pending");

    if (!res.data || res.data.length === 0) {
      table.innerHTML = `
        <tr><td colspan="6" class="p-4 text-center text-gray-500">
        No pending L2 approvals</td></tr>`;
      return;
    }

    table.innerHTML = "";

    res.data.forEach(v => {
      const row = `
        <tr class="border">
          <td class="p-2 border">${v.visitorName}</td>
          <td class="p-2 border">${v.residentId}</td>
          <td class="p-2 border">${v.reason}</td>
          <td class="p-2 border">${new Date(v.requestedAt).toLocaleString()}</td>
          <td class="p-2 border">
            <button 
              class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              onclick="approveL2('${v.id}')">
              Approve
            </button>
          </td>
          <td class="p-2 border">
            <button 
              class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              onclick="rejectL2('${v.id}')">
              Reject
            </button>
          </td>
        </tr>
      `;
      table.innerHTML += row;
    });

  } catch (error) {
    console.error("Error loading pending L2:", error);
    table.innerHTML = `
      <tr><td colspan="6" class="p-4 text-center text-red-500">
      Error loading data</td></tr>`;
  }
}

// -------------------------
// APPROVE L2 VISITOR
// -------------------------
async function approveL2(id) {
  try {
    await axios.post(`/api/l2/approve/${id}`);
    document.getElementById("statusMsg").textContent = "Visitor approved successfully.";
    loadPendingL2();
  } catch (error) {
    console.error("Error approving:", error);
    document.getElementById("statusMsg").textContent = "Error approving visitor.";
  }
}

// -------------------------
// REJECT L2 VISITOR
// -------------------------
async function rejectL2(id) {
  try {
    await axios.post(`/api/l2/reject/${id}`);
    document.getElementById("statusMsg").textContent = "Visitor rejected.";
    loadPendingL2();
  } catch (error) {
    console.error("Error rejecting:", error);
    document.getElementById("statusMsg").textContent = "Error rejecting visitor.";
  }
}

// Auto-load on page open
window.onload = loadPendingL2;
