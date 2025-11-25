const API_HOST = "http://localhost:4050"; // backend host

// ---------------- HELPER ----------------
async function fetchAPI(endpoint, method = "GET", body = null) {
    const token = localStorage.getItem("token");
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

// ---------------- DOM ELEMENTS ----------------
const residentSelect = document.getElementById("residentIdSelect");
const serviceInput = document.getElementById("serviceNameInput");
const amountInput = document.getElementById("paymentAmountInput");
const phoneInput = document.getElementById("phoneNumberInput");
const payBtn = document.getElementById("payBtn");
const payResult = document.getElementById("paymentResult");

// ---------------- LOAD RESIDENTS ----------------
async function loadResidents() {
    try {
        const data = await fetchAPI("/api/residents/ids");
        residentSelect.innerHTML = '<option value="" disabled selected>Select Resident</option>';
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

// ---------------- LOAD PAYMENTS ----------------
async function loadPayments() {
    try {
        const payments = await fetchAPI("/api/payments/all");
        const tbody = document.getElementById("paymentsBody");
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
                <td>${p.PhoneNumber || "-"}</td>
                <td>${p.VerifiedDate ? new Date(p.VerifiedDate).toLocaleString() : "-"}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

// ---------------- LOAD VERIFIED PAYMENTS ----------------
async function loadVerifiedPayments() {
    try {
        const verified = await fetchAPI("/api/payments/verified");
        const tbody = document.getElementById("verifiedBody");
        tbody.innerHTML = "";
        verified.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${p.ResidentID}</td>
                <td>${p.Amount.toFixed(2)}</td>
                <td>${p.Reference || "-"}</td>
                <td>${p.VerifiedDate ? new Date(p.VerifiedDate).toLocaleString() : "-"}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

// ---------------- LOAD BALANCES ----------------
async function loadBalances() {
    try {
        const balances = await fetchAPI("/api/payments/balances");
        const tbody = document.getElementById("balanceBody");
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

// ---------------- MAKE PAYMENT ----------------
async function makePayment() {
    const residentId = residentSelect.value;
    const serviceName = serviceInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const phone = phoneInput.value.trim();

    if (!residentId || !serviceName || !amount || !phone) {
        payResult.textContent = "All fields are required!";
        payResult.className = "text-red-600 mt-2 p-2 text-center";
        return;
    }

    try {
        const data = await fetchAPI("/api/payments/make-payment", "POST", {
            residentId,
            amount,
            phone,
            reference: serviceName
        });

        payResult.textContent = "Payment initiated. Complete payment on phone.";
        payResult.className = "text-green-600 mt-2 p-2 text-center";

        // Refresh tables
        loadPayments();
        loadVerifiedPayments();
        loadBalances();
    } catch (err) {
        console.error(err);
        payResult.textContent = "Payment failed: " + err.message;
        payResult.className = "text-red-600 mt-2 p-2 text-center";
    }
}

// ---------------- EVENT LISTENERS ----------------
document.addEventListener("DOMContentLoaded", () => {
    loadResidents();
    loadPayments();
    loadVerifiedPayments();
    loadBalances();

    if (payBtn) payBtn.addEventListener("click", makePayment);
});
