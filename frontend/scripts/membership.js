// ===============================
// GLOBAL VALIDATION HELPERS
// ===============================
export function validateNationalID(id) {
  return /^[0-9]{8}$/.test(id.trim());
}

export function validatePhone(phone) {
  return /^\+\d{9,15}$/.test(phone.trim());
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateRequired(...fields) {
  return fields.every(field => field && field.trim().length > 0);
}

function showMessage(element, message) {
  element.textContent = message;
  element.classList.remove("hidden");
}

function hideMessage(element) {
  element.textContent = "";
  element.classList.add("hidden");
}

// ===============================
// FORM HANDLER
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("membershipForm");
  const errorEl = document.getElementById("membershipError");
  const successEl = document.getElementById("membershipSuccess");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    hideMessage(errorEl);
    hideMessage(successEl);

    // Get values
    const ResidentName = document.getElementById("ResidentName").value;
    const NationalID = document.getElementById("NationalID").value;
    const PhoneNumber = document.getElementById("PhoneNumber").value;
    const Email = document.getElementById("Email").value;
    const HouseNumber = document.getElementById("HouseNumber").value;
    const CourtName = document.getElementById("CourtName").value;
    const RoleID = document.getElementById("RoleID").value;

    // Validate
    if (!validateRequired(ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName)) {
      return showMessage(errorEl, "Please fill all required fields.");
    }
    if (!validateNationalID(NationalID)) {
      return showMessage(errorEl, "National ID must be 8 digits.");
    }
    if (!validatePhone(PhoneNumber)) {
      return showMessage(errorEl, "Phone number must include country code (e.g., +2547...).");
    }
    if (!validateEmail(Email)) {
      return showMessage(errorEl, "Invalid email address.");
    }

    // Send to backend
    try {
      const res = await fetch("/api/admin/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleID })
      });

      const data = await res.json();

      if (!res.ok) {
        return showMessage(errorEl, data.message || "Failed to submit request.");
      }

      showMessage(successEl, "Membership request submitted successfully!");
      form.reset();
    } catch (err) {
      console.error(err);
      showMessage(errorEl, "Server error. Try again later.");
    }
  });
});
