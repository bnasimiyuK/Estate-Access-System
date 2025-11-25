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
        <td>${p.ResidentName}</td>
        <td>${p.Amount.toFixed(2)}</td>
        <td>${p.PaymentMethod}</td>
        <td>${new Date(p.PaymentDate).toLocaleString()}</td>
        <td>${p.Reference || "-"}</td>
        <td>${p.Status}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    alert("Failed to load payments: " + err.message);
  }
}

// Load balances
async function loadBalances() {
  try {
    const balances = await fetchAPI("/api/residents/balances");
    const container = document.querySelector("#balances");
    container.innerHTML = balances.map(b => `
      <div>
        <strong>${b.ResidentName}:</strong> Total Due: ${b.TotalDue.toFixed(2)}, Paid: ${b.TotalPaid.toFixed(2)}, Balance: ${b.Balance.toFixed(2)}
      </div>
    `).join("");
  } catch (err) {
    console.error(err);
  }
}

// Make MPESA Payment
async function makePayment() {
  const residentId = document.querySelector("#residentId").value;
  const phone = document.querySelector("#phone").value;
  const amount = document.querySelector("#amount").value;
  const reference = document.querySelector("#reference").value;

  try {
    const data = await fetchAPI("/api/residents/pay", "POST", { residentId, phone, amount, reference });
    alert(`Payment initiated. Check your phone. Transaction ID: ${data.paymentId}`);
    loadPayments();
  } catch (err) {
    console.error(err);
    alert("Payment failed: " + err.message);
  }
}

// ---------------- ADMIN FUNCTIONS ----------------

// Load recent payments
async function loadRecentPayments(limit = 10) {
  try {
    const payments = await fetchAPI(`/api/admin/payments/recent?limit=${limit}`);
    const tbody = document.querySelector("#recentPayments tbody");
    tbody.innerHTML = "";
    payments.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.PaymentID}</td>
        <td>${p.ResidentName}</td>
        <td>${p.Amount.toFixed(2)}</td>
        <td>${p.PaymentMethod}</td>
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

// Verify a pending payment
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
  if (document.querySelector("#makePaymentBtn")) {
    document.querySelector("#makePaymentBtn").addEventListener("click", makePayment);
    loadPayments();
    loadBalances();
  }
  
  if (document.querySelector("#recentPayments")) {
    loadRecentPayments();
  }
});
