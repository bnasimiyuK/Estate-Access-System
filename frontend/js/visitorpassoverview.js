document.addEventListener("DOMContentLoaded", fetchVisitorPasses);

async function fetchVisitorPasses() {
  const tableBody = document.getElementById("visitorPassesTableBody");
  const statusMsg = document.getElementById("statusMsg");

  try {
    // Replace this URL with your actual API endpoint that returns the visitor passes JSON
    const response = await axios.get("http://localhost:4050/api/visitor-passes");
    
    if (response.status === 200 && Array.isArray(response.data)) {
      const passes = response.data;

      // Clear previous rows if any
      tableBody.innerHTML = "";

      if (passes.length === 0) {
        statusMsg.innerText = "No visitor passes found.";
        return;
      }

      passes.forEach(pass => {
        const row = document.createElement("tr");

        row.innerHTML = `
          <td class="border px-4 py-2">${pass.Id}</td>
          <td class="border px-4 py-2">${escapeHTML(pass.VisitorName)}</td>
          <td class="border px-4 py-2">${escapeHTML(pass.ResidentId)}</td>
          <td class="border px-4 py-2">${escapeHTML(pass.PassCode)}</td>
          <td class="border px-4 py-2">${escapeHTML(pass.Status)}</td>
          <td class="border px-4 py-2">${new Date(pass.IssuedAt).toLocaleString()}</td>
        `;

        tableBody.appendChild(row);
      });

      statusMsg.innerText = "";
    } else {
      statusMsg.innerText = "Failed to fetch visitor passes.";
    }
  } catch (error) {
    console.error(error);
    statusMsg.innerText = "Error loading visitor passes.";
  }
}

// Basic function to prevent XSS by escaping HTML characters
function escapeHTML(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
