const API = {
  checkin: "/api/visitorsaccess/checkin",
  checkout: "/api/visitorsaccess/checkout",
  visitorPasses: "/api/visitorsaccess",
};

// ------------------------
// Elements
// ------------------------
const ciPass = document.getElementById("ciPass");
const ciBtn = document.getElementById("ciBtn");
const ciScanBtn = document.getElementById("ciScanBtn");
const ciStatus = document.getElementById("ciStatus");

const coPass = document.getElementById("coPass");
const coBtn = document.getElementById("coBtn");
const coSimBtn = document.getElementById("coSimBtn");
const coStatus = document.getElementById("coStatus");

// ------------------------
// Check-In Logic
// ------------------------
async function checkin(code) {
  ciStatus.textContent = "Processing...";
  ciStatus.className = "";
  try {
    const res = await axios.post(API.checkin, { code });
    ciStatus.textContent = res.data.message || "Checked in";
    ciStatus.className = "text-green-600";
  } catch (err) {
    console.error(err);
    ciStatus.textContent = err?.response?.data?.error || "Error checking in";
    ciStatus.className = "text-red-600";
  }
}

ciBtn.addEventListener("click", () => {
  const code = ciPass.value.trim();
  if (!code) {
    ciStatus.textContent = "Enter pass code";
    ciStatus.className = "text-red-600";
    return;
  }
  checkin(code);
});

ciScanBtn.addEventListener("click", async () => {
  try {
    const r = await axios.get(API.visitorPasses);
    const active = Array.isArray(r.data) && r.data.find(p => p.status === "active");
    if (!active) {
      ciStatus.textContent = "No active pass to simulate";
      ciStatus.className = "text-yellow-600";
      return;
    }
    ciPass.value = active.passCode;
    checkin(active.passCode);
  } catch (err) {
    console.error(err);
    ciStatus.textContent = "Error fetching passes";
    ciStatus.className = "text-red-600";
  }
});

// ------------------------
// Check-Out Logic
// ------------------------
async function checkout(code) {
  coStatus.textContent = "Processing...";
  coStatus.className = "";
  try {
    const res = await axios.post(API.checkout, { code });
    coStatus.textContent = res.data.message || "Checked out";
    coStatus.className = "text-green-600";
  } catch (err) {
    console.error(err);
    coStatus.textContent = err?.response?.data?.error || "Error checking out";
    coStatus.className = "text-red-600";
  }
}

coBtn.addEventListener("click", () => {
  const code = coPass.value.trim();
  if (!code) {
    coStatus.textContent = "Enter pass code";
    coStatus.className = "text-red-600";
    return;
  }
  checkout(code);
});

coSimBtn.addEventListener("click", async () => {
  try {
    const r = await axios.get(API.visitorPasses);
    const most = Array.isArray(r.data) && r.data.slice().reverse().find(p => p.status === "checked-in" || p.status === "active");
    if (!most) {
      coStatus.textContent = "No recent passes to simulate";
      coStatus.className = "text-yellow-600";
      return;
    }
    coPass.value = most.passCode;
    checkout(most.passCode);
  } catch (err) {
    console.error(err);
    coStatus.textContent = "Error fetching passes";
    coStatus.className = "text-red-600";
  }
});
