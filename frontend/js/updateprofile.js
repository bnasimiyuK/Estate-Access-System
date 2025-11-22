const API_URL = "http://localhost:5000/api/residents"; // Adjust to your backend route

document.addEventListener("DOMContentLoaded", async () => {
  await loadProfile();
  
  const form = document.getElementById("updateProfileForm");
  form.addEventListener("submit", updateProfile);
});

// Load current profile
async function loadProfile() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to fetch profile");

    const user = await res.json();
    document.getElementById("fullName").value = user.FullName || "";
    document.getElementById("email").value = user.Email || "";
    document.getElementById("phone").value = user.Phone || "";
    document.getElementById("houseNo").value = user.HouseNo || "";

  } catch (err) {
    console.error("Error loading profile:", err);
    showMessage("Error loading profile data.", "error");
  }
}

// Update profile
async function updateProfile(e) {
  e.preventDefault();

  const updatedData = {
    FullName: document.getElementById("fullName").value,
    Phone: document.getElementById("phone").value,
    HouseNo: document.getElementById("houseNo").value,
    Password: document.getElementById("password").value
  };

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(updatedData)
    });

    const data = await res.json();

    if (res.ok) {
      showMessage("Profile updated successfully!", "success");
      setTimeout(() => window.location.href = "dashboard.html", 2000);
    } else {
      showMessage(data.message || "Failed to update profile.", "error");
    }

  } catch (err) {
    console.error(err);
    showMessage("An error occurred. Try again.", "error");
  }
}

// Helper message display
function showMessage(text, type) {
  const box = document.getElementById("messageBox");
  box.classList.remove("hidden", "text-green-600", "text-red-600");
  box.textContent = text;

  if (type === "success") box.classList.add("text-green-600");
  else box.classList.add("text-red-600");
}

// Logout helper
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}
