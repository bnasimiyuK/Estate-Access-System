// ================================
// visitor-registration.js
// ================================
const API_BASE = "http://localhost:4050/api/visitors";
const RESIDENT_API = "http://localhost:4050/api/residents";
const ADMIN_API = "http://localhost:4050/api/admins";

// Run after DOM loads
document.addEventListener("DOMContentLoaded", async () => {
  console.log("📋 Visitor Registration Loaded");

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const status = localStorage.getItem("status");

  // 🧩 1️⃣ Route Protection
  if (!token || (role !== "Resident" && role !== "Admin")) {
    alert("⚠️ Only approved residents or admins can register visitors.");
    window.location.href = "login.html";
    return;
  }

  if (role === "Resident" && status !== "Approved") {
    alert("🚫 Access denied. Your account is not approved yet.");
    window.location.href = "dashboard.html";
    return;
  }

  // 🧱 2️⃣ Load Info (Admin or Resident)
  if (role === "Admin") {
    await loadAdminInfo(userId, token);
  } else {
    await loadResidentInfo(userId, token);
  }

  // 🧱 3️⃣ Setup Form
  setupFormBehavior(role);
});

// ================================
// 🧠 Fetch and Auto-fill Resident Info
// ================================
async function loadResidentInfo(userId, token) {
  try {
    const res = await fetch(`${RESIDENT_API}/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to fetch resident info");
    const resident = await res.json();

    document.getElementById("ResidentID").value = resident.ResidentID || "";
    document.getElementById("ResidentName").value = resident.ResidentName || "";
    if (document.getElementById("CourtName"))
      document.getElementById("CourtName").value = resident.CourtName || "";
    if (document.getElementById("HouseNumber"))
      document.getElementById("HouseNumber").value = resident.HouseNumber || "";

    console.log("✅ Resident Info Loaded:", resident);
  } catch (error) {
    console.error("❌ Error loading resident info:", error);
    document.getElementById("msg").textContent =
      "Error loading your info. Try again.";
  }
}

// ================================
// 🧠 Fetch and Auto-fill Admin Info
// ================================
async function loadAdminInfo(adminId, token) {
  try {
    const res = await fetch(`${ADMIN_API}/${adminId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to fetch admin info");
    const admin = await res.json();

    // Fill resident-equivalent fields for admin
    document.getElementById("ResidentID").value = admin.AdminID || "";
    document.getElementById("ResidentName").value = admin.FullName || "Estate Admin";
    if (document.getElementById("CourtName"))
      document.getElementById("CourtName").value = "Admin Access";
    if (document.getElementById("HouseNumber"))
      document.getElementById("HouseNumber").value = "-";

    console.log("✅ Admin Info Loaded:", admin);
  } catch (error) {
    console.error("❌ Error loading admin info:", error);
    document.getElementById("msg").textContent =
      "Error loading admin info. Try again.";
  }
}

// ================================
// 🧱 Setup Form & Submission Logic
// ================================
function setupFormBehavior(role) {
  const registrationType = document.getElementById("registrationType");
  const visitorContainer = document.getElementById("visitorContainer");
  const addVisitorBtn = document.getElementById("addVisitorBtn");
  const form = document.getElementById("visitorForm");
  const msg = document.getElementById("msg");

  // Group mode toggle
  registrationType.addEventListener("change", () => {
    if (registrationType.value === "group") {
      addVisitorBtn.classList.remove("hidden");
    } else {
      addVisitorBtn.classList.add("hidden");
      visitorContainer.innerHTML = createVisitorEntry();
    }
  });

  // Add visitor entry dynamically
  addVisitorBtn.addEventListener("click", () => {
    visitorContainer.insertAdjacentHTML("beforeend", createVisitorEntry());
  });

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const visitors = Array.from(
      visitorContainer.querySelectorAll(".visitor-entry")
    ).map((entry) => ({
      VisitorName: entry.querySelector('[name="VisitorName"]').value.trim(),
      NationalID: entry.querySelector('[name="NationalID"]').value.trim(),
      PhoneNumber: entry.querySelector('[name="PhoneNumber"]').value.trim(),
      VehicleNumber:
        entry.querySelector('[name="VehicleNumber"]').value.trim() || null,
      Purpose: entry.querySelector('[name="Purpose"]').value.trim(),
      DateOfVisit: entry.querySelector('[name="DateOfVisit"]').value,
    }));

    if (visitors.some((v) => !v.VisitorName || !v.NationalID || !v.PhoneNumber)) {
      alert("⚠️ Please fill all required visitor details.");
      return;
    }

    const payload = {
      ResidentID: document.getElementById("ResidentID").value,
      ResidentName: document.getElementById("ResidentName").value,
      visitors,
      CreatedBy: role, // identify if it was Admin or Resident
    };

    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        msg.textContent = "✅ Visitors registered successfully!";
        msg.classList.remove("text-red-400");
        msg.classList.add("text-green-400");
        form.reset();
        registrationType.value = "single";
        visitorContainer.innerHTML = createVisitorEntry();
      } else {
        throw new Error(result.message || "Failed to register visitors");
      }
    } catch (err) {
      console.error("❌ Error submitting visitor form:", err);
      msg.textContent = "❌ Server error. Please try again.";
      msg.classList.remove("text-green-400");
      msg.classList.add("text-red-400");
    }
  });
}

// ================================
// 🧩 Create visitor entry block
// ================================
function createVisitorEntry() {
  return `
  <div class="visitor-entry border p-3 rounded-lg mb-3 bg-gray-50">
    <label class="block font-medium text-sm">Visitor Name</label>
    <input type="text" name="VisitorName" class="input-box" required />

    <label class="block font-medium text-sm mt-2">National ID</label>
    <input type="text" name="NationalID" class="input-box" required />

    <label class="block font-medium text-sm mt-2">Phone Number</label>
    <input type="text" name="PhoneNumber" class="input-box" required />

    <label class="block font-medium text-sm mt-2">Vehicle Number</label>
    <input type="text" name="VehicleNumber" class="input-box" />

    <label class="block font-medium text-sm mt-2">Purpose of Visit</label>
    <textarea name="Purpose" class="input-box" rows="2" required></textarea>

    <label class="block font-medium text-sm mt-2">Date of Visit</label>
    <input type="date" name="DateOfVisit" class="input-box" required />
  </div>`;
}
