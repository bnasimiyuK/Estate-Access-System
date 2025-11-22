// membership.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("membershipForm");
  const feedbackMessage = document.getElementById("feedbackMessage");
  const membershipTableBody = document.getElementById("membershipTableBody");
  const membershipCount = document.getElementById("membershipCount");

  // Load membership requests from server
  async function loadMembershipRequests() {
    try {
      const response = await fetch("/api/memberships/records"); // backend endpoint
      if (!response.ok) throw new Error("Failed to fetch membership records");

      const result = await response.json();
      const data = result.data || [];

      membershipTableBody.innerHTML = "";
      data.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="border px-2 py-1">${item.RequestID}</td>
          <td class="border px-2 py-1">${item.ResidentName}</td>
          <td class="border px-2 py-1">${item.NationalID}</td>
          <td class="border px-2 py-1">${item.PhoneNumber}</td>
          <td class="border px-2 py-1">${item.Email}</td>
          <td class="border px-2 py-1">${item.HouseNumber}</td>
          <td class="border px-2 py-1">${item.CourtName}</td>
          <td class="border px-2 py-1">${item.Status}</td>
          <td class="border px-2 py-1">${new Date(item.RequestedAt).toLocaleString()}</td>
          <td class="border px-2 py-1">${item.RoleName}</td>
        `;
        membershipTableBody.appendChild(row);
      });

      membershipCount.textContent = data.length;
    } catch (err) {
      console.error(err);
      feedbackMessage.textContent = "Error loading membership requests.";
    }
  }

  // Submit new membership request
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch("/api/memberships/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "Submission failed");

      feedbackMessage.textContent = "Request submitted successfully!";
      form.reset();
      loadMembershipRequests(); // refresh table
    } catch (err) {
      console.error(err);
      feedbackMessage.textContent = `Error: ${err.message}`;
    }
  });

  // Initial load
  loadMembershipRequests();
});
