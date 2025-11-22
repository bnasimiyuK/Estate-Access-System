// ================================
// js/visitorhistory.js
// ================================
console.log("📋 visitorhistory.js loaded");

const API_URL = "http://localhost:4050/api/visitors/all";
const tableBody = document.getElementById("visitorHistoryBody");
const msg = document.getElementById("msg");

document.addEventListener("DOMContentLoaded", async () => {
  await loadVisitors();
});

async function loadVisitors() {
  msg.textContent = "⏳ Loading visitor records...";

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const data = await response.json();
    const visitors = data.records || [];

    tableBody.innerHTML = "";

    if (visitors.length === 0) {
      msg.textContent = "📭 No visitor records found.";
      return;
    }

    visitors.forEach(v => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="px-4 py-2">${v.VisitorID}</td>
        <td class="px-4 py-2">${v.ResidentName}</td>
        <td class="px-4 py-2">${v.CourtName}</td>
        <td class="px-4 py-2">${v.HouseNumber}</td>
        <td class="px-4 py-2">${v.VisitorName}</td>
        <td class="px-4 py-2">${v.NationalID}</td>
        <td class="px-4 py-2">${v.PhoneNumber}</td>
        <td class="px-4 py-2">${v.VehicleNumber || "-"}</td>
        <td class="px-4 py-2">${v.Purpose}</td>
        <td class="px-4 py-2">${formatDate(v.DateOfVisit)}</td>
      `;
      tableBody.appendChild(row);
    });

    msg.textContent = `✅ Loaded ${visitors.length} record(s).`;
  } catch (err) {
    console.error("❌ Fetch error:", err);
    msg.textContent = "❌ Could not load visitor records.";
  }
}

function formatDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleString() : "-";
}
