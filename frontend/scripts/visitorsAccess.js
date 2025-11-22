import {
  validateNationalID,
  validatePhone,
  validateRequired,
  showFormError,
  clearFormError
} from "./validation.js";

// ==============================
// Load Residents in Dropdown
// ==============================
async function loadResidents() {
  try {
    const res = await fetch("/api/residents/all");
    const data = await res.json();

    const dropdown = document.getElementById("ResidentID");
    dropdown.innerHTML = `<option value="">Select Resident Being Visited</option>`;

    data.forEach(resident => {
      dropdown.innerHTML += `
        <option value="${resident.ResidentID}">
          ${resident.FullName} — House ${resident.HouseNumber}
        </option>
      `;
    });

  } catch (err) {
    console.error("Failed to load residents", err);
  }
}

loadResidents();


// ==============================
// Visitor Check-In
// ==============================
document.getElementById("visitorCheckInForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = VisitorName.value.trim();
  const id = VisitorID.value.trim();
  const phone = VisitorPhone.value.trim();
  const residentID = ResidentID.value.trim();
  const purpose = Purpose.value.trim();

  clearFormError("visitorError");
  document.getElementById("visitorSuccess").classList.add("hidden");

  // VALIDATION
  if (!validateRequired(name, id, phone, residentID, purpose)) {
    return showFormError("visitorError", "All fields are required.");
  }

  if (!validateNationalID(id)) {
    return showFormError("visitorError", "Visitor National ID must be 8 digits.");
  }

  if (!validatePhone(phone)) {
    return showFormError("visitorError", "Invalid phone number. Use +254 format.");
  }

  // SUBMIT CHECK-IN
  try {
    const res = await fetch("/api/visitorsaccess/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        VisitorName: name,
        NationalID: id,
        Phone: phone,
        ResidentID: residentID,
        Purpose: purpose,
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return showFormError("visitorError", data.error || "Check-in failed.");
    }

    document.getElementById("visitorSuccess").innerText =
      "Visitor checked-in successfully!";
    document.getElementById("visitorSuccess").classList.remove("hidden");

    document.getElementById("visitorCheckInForm").reset();

    loadActiveVisitors();

  } catch (err) {
    showFormError("visitorError", "Network error. Try again.");
  }
});


// ==============================
// Load Active Visitors
// ==============================
async function loadActiveVisitors() {
  try {
    const res = await fetch("/api/visitorsaccess/active");
    const data = await res.json();

    const tbody = document.getElementById("activeVisitorsBody");
    tbody.innerHTML = "";

    data.forEach(v => {
      tbody.innerHTML += `
        <tr>
          <td class="border px-2 py-1">${v.VisitID}</td>
          <td class="border px-2 py-1">${v.VisitorName}</td>
          <td class="border px-2 py-1">${v.ResidentName}</td>
          <td class="border px-2 py-1">${new Date(v.TimeIn).toLocaleString()}</td>
          <td class="border px-2 py-1">
            <button onclick="checkoutVisitor(${v.VisitID})"
              class="bg-red-600 text-white px-2 py-1 rounded">
              Check-Out
            </button>
          </td>
        </tr>
      `;
    });

  } catch (err) {
    console.error("Failed to load active visitors", err);
  }
}

loadActiveVisitors();


// ==============================
// Visitor Check-Out
// ==============================
window.checkoutVisitor = async function (id) {
  try {
    const res = await fetch(`/api/visitorsaccess/checkout/${id}`, {
      method: "PUT"
    });

    if (!res.ok) {
      alert("Checkout failed.");
      return;
    }

    loadActiveVisitors();

  } catch (err) {
    alert("Network error.");
  }
}
