document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("membershipForm");
  const feedbackMessage = document.getElementById("feedbackMessage");
  const membershipTableBody = document.getElementById("membershipTableBody");
  const membershipCount = document.getElementById("membershipCount");

  // Fetch and display membership requests
  async function loadMembershipRequests() {
    try {
      const response = await fetch("/api/memberships/records");
      if (!response.ok) throw new Error("Failed to fetch membership records");

      const data = await response.json();
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
    } catch (error) {
      console.error(error);
      feedbackMessage.textContent = "Error loading membership requests.";
    }
  }

  // Submit membership form
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch("/api/memberships/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to submit membership request");
      feedbackMessage.textContent = "Request submitted successfully!";
      form.reset();
      loadMembershipRequests(); // Refresh table
    } catch (error) {
      console.error(error);
      feedbackMessage.textContent = "Error submitting request.";
    }
  });

  loadMembershipRequests();
});
