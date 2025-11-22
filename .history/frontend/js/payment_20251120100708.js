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
// DASHBOARD SUMMARY
//--------------------------------------
async function loadDashboardSummary() {
    try {
        const res = await axiosAuth.get("/payments/summary");

        const div = document.getElementById("dashboardSummary");
        div.innerHTML = `
            <div class="bg-white p-3 rounded-xl shadow text-center">
                <p class="font-bold text-indigo-700">Total Payments</p>
                <p class="text-lg">${res.data.totalPayments}</p>
            </div>

            <div class="bg-white p-3 rounded-xl shadow text-center">
                <p class="font-bold text-green-700">Verified</p>
                <p class="text-lg">${res.data.totalVerified}</p>
            </div>

            <div class="bg-white p-3 rounded-xl shadow text-center">
                <p class="font-bold text-red-700">Pending</p>
                <p class="text-lg">${res.data.totalPending}</p>
            </div>
        `;
    } catch (err) {
        console.error("Summary load error:", err);
    }
}

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
                    <td>${p.PaymentID}</td>
                    <td>${p.ResidentID}</td>
                    <td>${p.Amount}</td>
                    <td>${new Date(p.PaymentDate).toLocaleString()}</td>
                    <td class="${p.Status === 'Verified' ? 'text-green-600' : 'text-red-600'}">${p.Status}</td>
                    <td>${p.Reference}</td>
                    <td>${p.PaymentMethod}</td>
                    <td>
                        ${p.Status !== "Verified"
                            ? `<button class="bg-green-600 text-white px-1 rounded text-xs"
                                    onclick="verifyPayment(${p.PaymentID})">Verify</button>`
                            : "✔"}
                    </td>
                    <td>${p.NationalID || ""}</td>
                    <td>${p.ServiceName || ""}</td>
                    <td>${p.PhoneNumber || ""}</td>
                    <td>${p.VerifiedDate ? new Date(p.VerifiedDate).toLocaleString() : ""}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Error loading payments:", err);
    }
}

//--------------------------------------
// VERIFY PAYMENT
//--------------------------------------
async function verifyPayment(id) {
    if (!confirm("Confirm payment verification?")) return;

    try {
        await axiosAuth.put(`/payments/verify/${id}`);
        loadPayments();
        loadVerifiedPayments();
        loadBalances();
        loadDashboardSummary();
    } catch (err) {
        console.error("Verify error:", err);
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
                    <td>${v.ResidentID}</td>
                    <td>${v.Amount}</td>
                    <td>${v.Reference}</td>
                    <td>${v.VerifiedDate ? new Date(v.VerifiedDate).toLocaleString() : ""}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Verified payments load error:", err);
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
                    <td>${b.ResidentName}</td>
                    <td>${b.TotalPaid}</td>
                    <td>${b.TotalDue}</td>
                    <td>${b.Balance}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Balances load error:", err);
    }
}

//--------------------------------------
// FILTERS
//--------------------------------------
document.getElementById("filterInput").addEventListener("input", function () {
    const filter = this.value.toLowerCase();
    document.querySelectorAll("#paymentsBody tr").forEach(row => {
        row.style.display = row.cells[1].innerText.toLowerCase().includes(filter)
            ? ""
            : "none";
    });
});

document.getElementById("verifiedFilterInput").addEventListener("input", function () {
    const filter = this.value.toLowerCase();
    document.querySelectorAll("#verifiedBody tr").forEach(row => {
        row.style.display = row.cells[0].innerText.toLowerCase().includes(filter)
            ? ""
            : "none";
    });
});

//--------------------------------------
// EXPORT CSV & EXCEL
//--------------------------------------
function exportCSV(tableId) {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll("tr");

    const csv = [...rows]
        .map(r => [...r.children].map(c => c.innerText).join(","))
        .join("\n");

    const file = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = `${tableId}.csv`;
    link.click();
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
// MPESA PAYMENT
//--------------------------------------
document.getElementById("payBtn").addEventListener("click", async () => {
    const service = document.getElementById("serviceName").value;
    const amount = document.getElementById("paymentAmount").value;
    const phone = document.getElementById("phoneNumber").value;

    const result = document.getElementById("paymentResult");

    if (!service || !amount || !phone) {
        result.innerText = "Please fill in all fields";
        result.className = "text-red-600 text-xs";
        return;
    }

    result.innerText = "Processing...";
    result.className = "text-gray-600 text-xs";

    try {
        const res = await axiosAuth.post("/residents/pay", {
            serviceName: service,
            amount,
            phone
        });

        result.innerText = res.data.message || "Payment successful";
        result.className = "text-green-600 text-xs";

        document.getElementById("serviceName").value = "";
        document.getElementById("paymentAmount").value = "";
        document.getElementById("phoneNumber").value = "";

        // reload
        loadPayments();
        loadVerifiedPayments();
        loadBalances();
        loadDashboardSummary();

    } catch (err) {
        console.error(err);
        result.innerText = "Payment failed";
        result.className = "text-red-600 text-xs";
    }
});

//--------------------------------------
// INITIAL LOAD
//--------------------------------------
window.addEventListener("DOMContentLoaded", () => {
    loadDashboardSummary();
    loadPayments();
    loadVerifiedPayments();
    loadBalances();
});
