// ========================
// membership.js (REFRACTORED FIXED)
// ========================

// ========================
// GLOBAL SETTINGS
// ========================
const API_HOST = "http://localhost:4050";
const TOKEN_KEY = "accessToken";
const AUTH_TOKEN = localStorage.getItem(TOKEN_KEY);

// ========================
// DOM ELEMENTS
// ========================
const membershipForm = document.getElementById("membershipForm");
const courtDropdown = document.getElementById("courtDropdown");
const membershipCount = document.getElementById("membershipCount");
const feedbackMessage = document.getElementById("feedbackMessage");

// ========================
// DISPLAY MESSAGES
// ========================
function displayMessage(msg, type = "info") {
  feedbackMessage.textContent = msg;
  feedbackMessage.className = 'mt-4 text-center p-3 rounded-lg';

  switch (type) {
    case "success":
      feedbackMessage.classList.add("bg-green-100", "text-green-700");
      break;
    case "error":
      feedbackMessage.classList.add("bg-red-100", "text-red-700");
      break;
    default:
      feedbackMessage.classList.add("bg-gray-200", "text-gray-800");
  }

  setTimeout(() => {
    feedbackMessage.textContent = '';
    feedbackMessage.className = 'mt-4 text-center p-3 rounded-lg';
  }, 4000);
}

// ========================
// FETCH HELPER
// ========================
async function apiFetch(endpoint, options = {}) {
  if (!AUTH_TOKEN) {
    displayMessage("Authentication token missing. Please log in.", "error");
    throw new Error("No auth token");
  }

  const defaultHeaders = {
    "Authorization": `Bearer ${AUTH_TOKEN}`
  };

  // Add Content-Type if body exists
  if (options.body && !options.headers?.["Content-Type"]) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const config = { ...options, headers: { ...defaultHeaders, ...options.headers } };

  try {
    console.log(`[API Fetch] ${API_HOST}${endpoint}`, config);
    const res = await fetch(`${API_HOST}${endpoint}`, config);

    // If redirect occurs, fetch will return ok: false (status 301/302)
    if (res.status >= 300 && res.status < 400) {
      throw new Error(`Redirect detected: ${res.status}. Use exact endpoint URL.`);
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errData.message || `HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`API Fetch Error [${endpoint}]:`, err);
    throw err;
  }
}

// ========================
// LOAD COURTS
// ========================
async function loadCourts() {
  if (!courtDropdown) return;
  courtDropdown.innerHTML = '<option value="">Loading courts...</option>';
  try {
    const courts = await apiFetch("/api/courts/all", { method: "GET" });
    courtDropdown.innerHTML = '<option value="">Select Court</option>';
    courts.forEach(court => {
      const opt = document.createElement("option");
      opt.value = court.CourtID || court.id;
      opt.textContent = court.CourtName || court.name;
      courtDropdown.appendChild(opt);
    });
  } catch (err) {
    courtDropdown.innerHTML = '<option value="" disabled>Failed to load courts</option>';
    displayMessage("Failed to load courts.", "error");
  }
}

// ========================
// LOAD MEMBERSHIP COUNT
// ========================
async function loadMembershipCount() {
  if (!membershipCount) return;
  membershipCount.textContent = '...';
  try {
    const data = await apiFetch("/api/admin/membership/count", { method: "GET" });
    membershipCount.textContent = data.count?.toLocaleString() || 0;
  } catch {
    membershipCount.textContent = 'N/A';
  }
}

// ========================
// FORM SUBMISSION
// ========================
async function membershipFormSubmitHandler(e) {
    e.preventDefault();

    const residentName = document.getElementById("ResidentName")?.value.trim();
    const nationalId   = document.getElementById("NationalID")?.value.trim();
    const phoneNumber  = document.getElementById("PhoneNumber")?.value.trim();
    const email        = document.getElementById("Email")?.value.trim();
    const houseNumber  = document.getElementById("HouseNumber")?.value.trim();
    const courtName    = courtDropdown.selectedOptions[0]?.text || "";
    const roleName     = document.getElementById("RoleName")?.value;

    if (!residentName || !nationalId || !phoneNumber || !email || !houseNumber || !courtName || !roleName) {
        displayMessage("Please fill all required fields.", "error");
        return;
    }

    const body = {
        ResidentName: residentName,
        NationalID: nationalId,
        PhoneNumber: phoneNumber,
        Email: email,
        HouseNumber: houseNumber,
        CourtName: courtName,
        RoleName: roleName,
        Action: actionNotes,
    };

    console.log("Submitting membership:", body);

    try {
        const response = await fetch("/api/membership/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const result = await response.json();
        console.log("API result:", result);

        displayMessage(`Membership submitted successfully! Request ID: ${result.RequestID || "N/A"}`, "success");
        membershipForm.reset();
        loadMembershipCount();
    } catch (err) {
        console.error("Submit error:", err);
        displayMessage(`Failed to submit membership: ${err.message}`, "error");
    }
}