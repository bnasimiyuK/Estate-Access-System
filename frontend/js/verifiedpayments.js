<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>

  const VERIFIED_URL = "http://localhost:4050/api/payments?status=Verified";
  const verifiedBody = document.getElementById("verifiedBody");
  const socket = io("http://localhost:4050");

  // ✅ Function to render verified payments
  async function loadVerified() {
    try {
      const res = await fetch(VERIFIED_URL);
      const data = await res.json();

      verifiedBody.innerHTML = "";

      if (data.length === 0) {
        verifiedBody.innerHTML = `
          <tr>
            <td colspan="6" class="py-4 text-gray-500 text-center">
              No verified payments yet.
            </td>
          </tr>`;
        return;
      }

      data.forEach((p) => {
        verifiedBody.insertAdjacentHTML(
          "beforeend",
          `<tr class="hover:bg-green-50 transition">
            <td class="px-4 py-2 font-medium">${p.PaymentID}</td>
            <td class="px-4 py-2">${p.ResidentID}</td>
            <td class="px-4 py-2">KSh ${p.Amount.toLocaleString()}</td>
            <td class="px-4 py-2">${new Date(p.PaymentDate).toLocaleDateString()}</td>
            <td class="px-4 py-2">${p.Reference || "-"}</td>
            <td class="px-4 py-2">${p.PaymentMethod || "-"}</td>
          </tr>`
        );
      });
    } catch (err) {
      console.error("❌ Error loading verified payments:", err);
    }
  }

  // ✅ WebSocket live updates
  socket.on("connect", () => {
    console.log("🔌 Connected to live payments server:", socket.id);
  });

  // When any payment gets verified
  socket.on("payment:verified", (payment) => {
    console.log("✅ Live update received:", payment);
    loadVerified(); // refresh table instantly
  });

  // Optional: Also reload if a new payment is added (useful for admins)
  socket.on("payment:new", (payment) => {
    console.log("🆕 New payment added:", payment);
    loadVerified();
  });

  // ✅ Initial load + periodic backup refresh every 10s
  document.addEventListener("DOMContentLoaded", loadVerified);
  setInterval(loadVerified, 10000);

