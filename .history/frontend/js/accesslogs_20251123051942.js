 async function fetchLogs() {
    try {
      const response = await fetch("http://localhost:4050/api/logs");
      if (!response.ok) throw new Error("Network response was not ok");

      const logs = await response.json();
      const tbody = document.querySelector("#logsTable tbody");
      tbody.innerHTML = "";

      logs.forEach(log => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${log.Id}</td>
          <td>${log.TimestampUtc}</td>
          <td>${log.UserId}</td>
          <td>${log.Action}</td>
          <td>${log.Resource}</td>
          <td>${log.IpAddress}</td>
          <td>${log.UserAgent}</td>
          <td>${log.Referrer}</td>
          <td><pre>${JSON.stringify(log.Metadata, null, 2)}</pre></td>
          <td>${log.LogType}</td>
        `;
        tbody.appendChild(row);
      });
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  }

  // Load logs on page load
  window.onload = fetchLogs;