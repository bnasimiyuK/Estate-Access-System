// frontend/payments.js

const API_HOST = "http://localhost:4050"; // Your backend host

// ---------------- HELPER ----------------
async function fetchAPI(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem("token"); // JWT stored after login
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_HOST}${endpoint}`, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "API request failed");
  }
  return res.json();
}

// ---------------- RESIDENT FUNCTIONS ----------------
const residentSelect = document.getElementById("residentIdSelect");
const serviceInput = document.getElementById("serviceNameInput");
const amountInput = document.getElementById("paymentAmountInput");
const phoneInput = document.getElementById("phoneNumberInput");
const payBtn = document.getElementById("payBtn");
const payResult = document.getElementById("paymentResult");

// Fetch existing resident IDs
async function loadResidents() {
  try {
    const data = await fetchAPI("/api/residents/ids");
    data.forEach(r => {
      const option = document.createElement("option");
      option.value = r.ResidentID;
      option.textContent = `${r.ResidentID} - ${r.ResidentName}`;
      residentSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load residents:", err);
  }
}

// Load all resident payments
async function loadPayments() {
  try {
    const payments = await fetchAPI("/api/residents/payments");
    const tbody = document.querySelector("#paymentsTable tbody");
    tbody.innerHTML = "";
    payments.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.PaymentID}</td>
        <td>${p.ResidentID}</td>
        <td>${p.Amount.toFixed(2)}</td>
        <td>${new Date(p.PaymentDate).toLocaleString()}</td>
        <td>${p.Status}</td>
        <td>${p.Reference || "-"}</td>
        <td>${p.PaymentMethod || "-"}</td>
        <td>${p.Action || "-"}</td>
        <td>${p.NationalID || "-"}</td>
        <td>${p.serviceName || "-"}</td>
        <td>${p.PhoneNumber || "-"}</td>
        <td>${p.VerifiedDate ? new Date(p.VerifiedDate).toLocaleString() : "-"}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    alert("Failed to load payments: " + err.message);
  }
}

// Load balances summary
async function loadBalances() {
  try {
    const balances = await fetchAPI("/api/residents/balances");
    const tbody = document.querySelector("#balanceBody");
    tbody.innerHTML = "";
    balances.forEach(b => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${b.ResidentID}</td>
        <td>${b.TotalPaid.toFixed(2)}</td>
        <td>${b.TotalDue.toFixed(2)}</td>
        <td>${b.Balance.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

// Handle MPESA payment
async function makePayment() {
  const residentId = residentSelect.value;
  const serviceName = serviceInput.value.trim();
  const amount = amountInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!residentId || !serviceName || !amount || !phone) {
    payResult.textContent = "All fields are required!";
    payResult.classList.remove("hidden", "text-green-600");
    payResult.classList.add("text-red-600");
    return;
  }

  try {
    const data = await fetchAPI("/api/payments/make-payment", "POST", {
      residentId,
      amount,
      phone,
      reference: serviceName
    });

    payResult.textContent = `Payment initiated: ${JSON.stringify(data.stkResponse)}`;
    payResult.classList.remove("hidden", "text-red-600");
    payResult.classList.add("text-green-600");

    loadPayments(); // Refresh payment table
  } catch (err) {
    console.error(err);
    payResult.textContent = "Payment failed: " + err.message;
    payResult.classList.remove("hidden", "text-green-600");
    payResult.classList.add("text-red-600");
  }
}

// ---------------- ADMIN FUNCTIONS ----------------
async function loadRecentPayments(limit = 10) {
  try {
    const payments = await fetchAPI(`/api/admin/payments/recent?limit=${limit}`);
    const tbody = document.querySelector("#recentPayments tbody");
    tbody.innerHTML = "";
    payments.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.PaymentID}</td>
        <td>${p.ResidentID}</td>
        <td>${p.Amount.toFixed(2)}</td>
        <td>${p.PaymentMethod || "-"}</td>
        <td>${new Date(p.PaymentDate).toLocaleString()}</td>
        <td>${p.Reference || "-"}</td>
        <td>${p.Status}</td>
        <td>${p.Status === "Pending" ? `<button onclick="verifyPayment(${p.PaymentID})">Verify</button>` : "Verified"}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

async function verifyPayment(paymentId) {
  if (!confirm("Are you sure you want to verify this payment?")) return;
  try {
    await fetchAPI(`/api/admin/payments/verify/${paymentId}`, "POST");
    alert("Payment verified successfully!");
    loadRecentPayments();
  } catch (err) {
    console.error(err);
    alert("Verification failed: " + err.message);
  }
}

// ---------------- EVENT LISTENERS ----------------
document.addEventListener("DOMContentLoaded", () => {
  if (residentSelect) {
    loadResidents();
    payBtn.addEventListener("click", makePayment);
    loadPayments();
    loadBalances();
  }

  if (document.querySelector("#recentPayments")) {
    loadRecentPayments();
  }
});
