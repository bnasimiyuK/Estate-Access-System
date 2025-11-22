// formValidator.js
export function showError(input, message) {
  const errorEl = input.nextElementSibling;
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }
  input.classList.add("border-red-500");
}

export function clearError(input) {
  const errorEl = input.nextElementSibling;
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }
  input.classList.remove("border-red-500");
}

export function validateField(input) {
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
  if (input.dataset.type === "nationalId" && !/^\d{8}$/.test(value)) {
    showError(input, "National ID must be exactly 8 digits.");
    return false;
  }
  if (input.dataset.type === "phone" && !/^\+\d{9,15}$/.test(value)) {
    showError(input, "Phone number must include country code, e.g. +254712345678");
    return false;
  }
  return true;
}

export function validateForm(form) {
  let valid = true;
  form.querySelectorAll(".validate-field").forEach(input => {
    if (!validateField(input)) valid = false;
  });
  return valid;
}
