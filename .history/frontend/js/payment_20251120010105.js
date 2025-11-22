//--------------------------------------
// GLOBALS
//--------------------------------------
const token = localStorage.getItem("accessToken");
if (!token) {
    window.location.href = "login.html";
}

const axiosAuth = axios.create({
    baseURL: "/api",
    headers: { Authorization: `Bearer ${token}` }
});

//--------------------------------------
// LOAD RESIDENT IDS (Dropdown)
//--------------------------------------
async function loadResidentIDs() {
    try {
        const res = await axiosAuth.get("/residents/approved");
        const select = document.getElementById("residentId");
        select.innerHTML = `<option value="">Select Resident ID</option>`;
        res.data.forEach(r => {
            select.innerHTML += `<option value="${r.ResidentID}">${r.ResidentID} - ${r.ResidentName}</option>`;
        });
    } catch (err) {
        console.error("Error loading residents:", err);
    }
}

//--------------------------------------
// SUBMIT PAYMENT (Make Payment Form)
//--------------------------------------
document.getElementById("makePaymentForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        residentId: document.getElementById("residentId").value,
        amount: document.getElementById("amount").value,
        paymentMethod: document.getElementById("paymentMethod").value,
        reference: document.getElementById("reference").value
    };

    try {
        const res = await axiosAuth.post("/payments/make", data);
        document.getElementById("msg").innerHTML = `<span class="text-green-600">${res.data.message}</span>`;
        loadPayments();
        loadBalances();
    } catch (err) {
        console.error(err);
        document.getElementById("msg").innerHTML = `<span class="text-red-600">Error submitting payment.</span>`;
    }
});

//--------------------------------------
// LOAD PAYMENT HISTORY
//--------------------------------------
async function loadPayments() {
    try {
        const res = await axiosAuth.get("/payments");
        const tbody = document.getElementById("paymentsBody");
        tbody.innerHTML = "";

        res.data.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td class="px-1 py-0.5">${p.PaymentID}</td>
                    <td class="px-1 py-0.5">${p.ResidentID}</td>
                    <td class="px-1 py-0.5">${p.Amount}</td>
                    <td class="px-1 py-0.5">${new Date(p.PaymentDate).toLocaleDateString()}</td>
                    <td class="px-1 py-0.5 ${p.Status === 'Verified' ? 'text-green-600' : 'text-red-600'}">${p.Status}</td>
                    <td class="px-1 py-0.5">${p.Reference}</td>
                    <td class="px-1 py-0.5">${p.PaymentMethod}</td>
                    <td class="px-1 py-0.5">
                        ${p.Status !== "Verified" ? `<button class="bg-green-600 text-white px-1 rounded text-xs" onclick="verifyPayment(${p.PaymentID})">Verify</button>` : '✔'}
                    </td>
                    <td class="px-1 py-0.5">${p.NationalID || ''}</td>
                    <td class="px-1 py-0.5">${p.ServiceName || ''}</td>
                    <td class="px-1 py-0.5">${p.PhoneNumber || ''}</td>
                    <td class="px-1 py-0.5">${p.VerifiedDate ? new Date(p.VerifiedDate).toLocaleDateString() : ''}</td>
                </tr>`;
        });
    } catch (err) {
        console.error("Error loading payments:", err);
    }
}

//--------------------------------------
// VERIFY PAYMENT
//--------------------------------------
async function verifyPayment(id) {
    if (!confirm("Verify this payment?")) return;
    try {
        await axiosAuth.put(`/payments/verify/${id}`);
        loadPayments();
        loadVerifiedPayments();
        loadBalances();
    } catch (err) {
        console.error("Error verifying:", err);
    }
}

//--------------------------------------
// LOAD VERIFIED PAYMENTS
//--------------------------------------
async function loadVerifiedPayments() {
    try {
        const res = await axiosAuth.get("/payments/verified");
        const tbody = document.getElementById("verifiedBody");
        tbody.innerHTML = "";
        res.data.forEach(v => {
            tbody.innerHTML += `
                <tr>
                    <td class="px-1 py-0.5">${v.ResidentID}</td>
                    <td class="px-1 py-0.5">${v.Amount}</td>
                    <td class="px-1 py-0.5">${v.Reference}</td>
                    <td class="px-1 py-0.5">${v.VerifiedDate ? new Date(v.VerifiedDate).toLocaleDateString() : ''}</td>
                    <td class="px-1 py-0.5">${v.Action || ''}</td>
                    <td class="px-1 py-0.5">${v.NationalID || ''}</td>
                    <td class="px-1 py-0.5">${v.ServiceName || ''}</td>
                    <td class="px-1 py-0.5">${v.PhoneNumber || ''}</td>
                </tr>`;
        });
    } catch (err) {
        console.error("Error loading verified payments:", err);
    }
}

//--------------------------------------
// LOAD BALANCES
//--------------------------------------
async function loadBalances() {
    try {
        const res = await axiosAuth.get("/payments/balances");
        const tbody = document.getElementById("balanceBody");
        tbody.innerHTML = "";
        res.data.forEach(b => {
            tbody.innerHTML += `
                <tr>
                    <td class="px-1 py-0.5">${b.ResidentName}</td>
                    <td class="px-1 py-0.5">${b.TotalPaid}</td>
                    <td class="px-1 py-0.5">${b.TotalDue}</td>
                    <td class="px-1 py-0.5">${b.Balance}</td>
                </tr>`;
        });
    } catch (err) {
        console.error("Error loading balances:", err);
    }
}

//--------------------------------------
// FILTER TABLES
//--------------------------------------
document.getElementById("filterInput").addEventListener("input", function () {
    const filter = this.value.toLowerCase();
    document.querySelectorAll("#paymentsBody tr").forEach(row => {
        row.style.display = row.cells[1].innerText.toLowerCase().includes(filter) ? "" : "none";
    });
});

document.getElementById("verifiedFilterInput").addEventListener("input", function () {
    const filter = this.value.toLowerCase();
    document.querySelectorAll("#verifiedBody tr").forEach(row => {
        row.style.display = row.cells[0].innerText.toLowerCase().includes(filter) ? "" : "none";
    });
});

//--------------------------------------
// EXPORT CSV & EXCEL
//--------------------------------------
function exportCSV(tableId) {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll("tr");
    const csv = [...rows].map(row => [...row.querySelectorAll("th,td")].map(c => c.innerText).join(",")).join("\n");

    const csvFile = new Blob([csv], { type: "text/csv" });
    const tempLink = document.createElement("a");
    tempLink.href = URL.createObjectURL(csvFile);
    tempLink.download = `${tableId}.csv`;
    tempLink.click();
}

function exportExcel(tableId) {
    const table = document.getElementById(tableId);
    const wb = XLSX.utils.table_to_book(table);
    XLSX.writeFile(wb, `${tableId}.xlsx`);
}

document.getElementById("exportCsv").onclick = () => exportCSV("paymentsTable");
document.getElementById("exportVerifiedCsv").onclick = () => exportCSV("verifiedTable");
document.getElementById("exportBalancesCsv").onclick = () => exportCSV("balanceTable");
document.getElementById("exportExcel").onclick = () => exportExcel("paymentsTable");
document.getElementById("exportVerifiedExcel").onclick = () => exportExcel("verifiedTable");
document.getElementById("exportBalancesExcel").onclick = () => exportExcel("balanceTable");

//--------------------------------------
// MPESA PAY NOW HANDLER
//--------------------------------------
document.getElementById("payBtn").addEventListener("click", async () => {
    const service = document.getElementById("serviceName").value;
    const amount = document.getElementById("paymentAmount").value;
    const phone = document.getElementById("phoneNumber").value;
    const resultDiv = document.getElementById("paymentResult");

    if (!service || !amount || !phone) {
        resultDiv.innerText = "Please fill in all fields";
        resultDiv.className = "text-red-600 mt-1 text-xs";
        return;
    }

    resultDiv.innerText = "Processing payment...";
    resultDiv.className = "text-gray-700 mt-1 text-xs";

    try {
        const res = await fetch("/api/residents/pay", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ serviceName: service, amount, phone })
        });
        const data = await res.json();

        if (res.ok) {
            resultDiv.innerText = data.message || "Payment submitted successfully";
            resultDiv.className = "text-green-600 mt-1 text-xs";
            document.getElementById("serviceName").value = "";
            document.getElementById("paymentAmount").value = "";
            document.getElementById("phoneNumber").value = "";
            loadPayments();
            loadVerifiedPayments();
            loadBalances();
        } else {
            resultDiv.innerText = data.message || "Payment failed";
            resultDiv.className = "text-red-600 mt-1 text-xs";
        }
    } catch (err) {
        console.error(err);
        resultDiv.innerText = "Payment submission error";
        resultDiv.className = "text-red-600 mt-1 text-xs";
    }
});

//--------------------------------------
// INITIAL LOAD
//--------------------------------------
window.addEventListener('DOMContentLoaded', () => {
    loadResidentIDs();
    loadPayments();
    loadVerifiedPayments();
    loadBalances();
});
