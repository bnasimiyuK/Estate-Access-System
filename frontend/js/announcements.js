document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("announcementsTable");
  const form = document.getElementById("announcementForm");
  const titleInput = document.getElementById("announcementTitle");
  const messageInput = document.getElementById("announcementMessage");
  const formMsg = document.getElementById("formMsg");

  const token = localStorage.getItem("accessToken");
  const userRole = localStorage.getItem("role");

  if (userRole === "admin") form.classList.remove("hidden");

  // ------------------------------
  // Validation Functions
  // ------------------------------
  function showError(input, message) {
    const errorEl = input.nextElementSibling;
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
    input.classList.add("border-red-500");
  }

  function clearError(input) {
    const errorEl = input.nextElementSibling;
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
    input.classList.remove("border-red-500");
  }

  function validateField(input) {
    clearError(input);
    const value = input.value.trim();
    const required = input.dataset.required === "true";
    const minlength = parseInt(input.dataset.minlength || "0");

    if (required && !value) {
      showError(input, "This field is required.");
      return false;
    }
    if (minlength && value.length < minlength) {
      showError(input, `Must be at least ${minlength} characters.`);
      return false;
    }
    return true;
  }

  function validateForm() {
    let valid = true;
    document.querySelectorAll(".validate-field").forEach(input => {
      if (!validateField(input)) valid = false;
    });
    return valid;
  }

  // ------------------------------
  // Load Announcements
  // ------------------------------
  async function loadAnnouncements() {
    try {
      const res = await fetch("/api/announcements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      tableBody.innerHTML = data
        .map(a => {
          const isAdmin = userRole === "admin";
          return `
            <tr class="border-b">
              <td class="px-4 py-2">${a.Title}</td>
              <td class="px-4 py-2">${a.Message}</td>
              <td class="px-4 py-2">${a.CreatedBy || "-"}</td>
              <td class="px-4 py-2">${new Date(a.CreatedAt).toLocaleString()}</td>
              <td class="px-4 py-2">
                ${isAdmin ? `<button data-id="${a.AnnouncementID}" class="deleteBtn bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Delete</button>` : "-"}
              </td>
            </tr>
          `;
        })
        .join("");

      document.querySelectorAll(".deleteBtn").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (!confirm("Are you sure you want to delete this announcement?")) return;
          const id = btn.dataset.id;
          try {
            const res = await fetch(`/api/announcements/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            const result = await res.json();
            alert(result.message);
            loadAnnouncements();
          } catch (err) {
            console.error(err);
            alert("Failed to delete announcement");
          }
        });
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="5" class="text-red-500 p-4">Failed to load announcements</td></tr>`;
    }
  }

  // ------------------------------
  // Submit Announcement
  // ------------------------------
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      formMsg.textContent = "";

      if (!validateForm()) return;

      const Title = titleInput.value.trim();
      const Message = messageInput.value.trim();

      try {
        const res = await fetch("/api/announcements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ Title, Message }),
        });

        const result = await res.json();

        if (res.ok) {
          formMsg.textContent = result.message;
          formMsg.className = "mt-2 text-green-600 font-semibold";
          titleInput.value = "";
          messageInput.value = "";
          loadAnnouncements();
        } else {
          formMsg.textContent = result.error || "Failed to post announcement";
          formMsg.className = "mt-2 text-red-600 font-semibold";
        }
      } catch (err) {
        console.error(err);
        formMsg.textContent = "Server error";
        formMsg.className = "mt-2 text-red-600 font-semibold";
      }
    });
  }

  loadAnnouncements();
});
