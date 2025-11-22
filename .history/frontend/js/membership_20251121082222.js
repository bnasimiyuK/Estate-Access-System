document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("membershipForm");
  const feedbackMessage = document.getElementById("feedbackMessage");
  const membershipTableBody = document.getElementById("membershipTableBody");
  const membershipCount = document.getElementById("membershipCount");

  const token = localStorage.getItem("token"); // JWT from login
  if (!token) feedbackMessage.textContent = "You must log in to submit requests.";

  // -------------------------
  // Load membership requests
  // -------------------------
  async function loadMembershipRequests() {
    try {
      const response = await fetch("/api/membership/all", {
        headers: { "Authorization": "Bearer " + token }
      });
      if (!response.ok) throw new Error("Failed to fetch membership requests");

      const data = await response.json();
      const requests = data.data || [];

      membershipTableBody.innerHTML = "";
      requests.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="border px-2 py-1">${item.RequestID}</td>
          <td class="border px-2 py-1">${item.ResidentName}</td>
          <td class="border px-2 py-1">${item.NationalID}</td>
          <td class="border px-2 py-1">${item.PhoneNumber}</td>
          <td class="border px-2 py-1">${item.Email}</td>
          <td class="border px-2 py-1">${item.HouseNumber}</td>
          <td class="border px-2 py-1">${item.CourtName}</td>
          <td class="border px-2 py-1">${item.RoleName}</td>
          <td class="border px-2 py-1">${new Date(item.RequestedAt).toLocaleString()}</td>
          <td class="border px-2 py-1">${item.Status}</td>
        `;
        membershipTableBody.appendChild(row);
      });

      membershipCount.textContent = requests.length;

    } catch (err) {
      console.error(err);
      membershipTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-red-600 p-2">Failed to load requests.</td></tr>`;
      feedbackMessage.textContent = "Error loading membership requests.";
    }
  }

  // -------------------------
  // Submit new membership request
  // -------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch("/api/membership/request", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      feedbackMessage.textContent = result.message;
      feedbackMessage.className = "text-green-600 font-semibold mt-1 text-sm";
      form.reset();
      loadMembershipRequests();
    } catch (err) {
      console.error(err);
      feedbackMessage.textContent = err.message;
      feedbackMessage.className = "text-red-600 font-semibold mt-1 text-sm";
    }
  });

  loadMembershipRequests();
});
