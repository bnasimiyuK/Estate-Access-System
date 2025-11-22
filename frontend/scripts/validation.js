// ===============================================
// GLOBAL VALIDATION HELPERS
// ===============================================

// 8-digit Kenya ID
export function validateNationalID(id) {
  return /^[0-9]{8}$/.test(id.trim());
}

// Phone number with country code (+254...)
export function validatePhone(phone) {
  return /^\+\d{1,3}\d{7,12}$/.test(phone.trim());
}

// Email address
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Check empty fields
export function validateRequired(...fields) {
  return fields.every(field => field && field.trim().length > 0);
}

// Generic error display
export function showFormError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = message;
    el.classList.remove("hidden");
  }
}

export function clearFormError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.classList.add("hidden");
}
