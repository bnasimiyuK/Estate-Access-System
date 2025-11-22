// frontend/scripts/payments.js
// loads Chart.js via CDN dynamically then fetches data from backend and renders charts
export async function init() {
  // load Chart.js if not present
  if (typeof window.Chart === 'undefined') {
    await loadChartJs();
  }

  try {
    // Example endpoints (implement in backend):
    // GET /api/payments/summary/monthly  -> { labels: [...], totals: [...] }
    // GET /api/payments/summary/methods  -> { labels: [...], counts: [...] }
    // GET /api/payments/recent           -> [ {PaymentID, Resident, Amount, Method, Date, Reference}, ... ]

    const [monthlyRes, methodRes, recentRes] = await Promise.all([
      fetch('/api/payments/summary/monthly'),
      fetch('/api/payments/summary/methods'),
      fetch('/api/payments/recent?limit=20')
    ]);
    if (!monthlyRes.ok || !methodRes.ok || !recentRes.ok) {
      console.warn('Some payment endpoints failed');
    }

    const monthly = await monthlyRes.json().catch(()=>({labels:[],totals:[]}));
    const methods = await methodRes.json().catch(()=>({labels:[],counts:[]}));
    const recent = await recentRes.json().catch(()=>[]);

    renderLineChart('paymentsLineChart', monthly.labels || [], monthly.totals || []);
    renderDonutChart('paymentMethodChart', methods.labels || [], methods.counts || []);
    renderRecentPayments(recent || []);

  } catch (err) {
    console.error('Payments init error', err);
  }
}

function loadChartJs() {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Chart.js'));
    document.head.appendChild(s);
  });
}

let lineChart, donutChart;
function renderLineChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Collections (KSh)', data, fill: true, tension: 0.2 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

function renderDonutChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data }] },
    options: { responsive: true }
  });
}

function renderRecentPayments(list) {
  const tbody = document.getElementById('recentPaymentsBody');
  tbody.innerHTML = '';
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-600">No payments found</td></tr>`;
    return;
  }
  list.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="border p-2">${p.PaymentID ?? ''}</td>
      <td class="border p-2">${p.ResidentName ?? ''}</td>
      <td class="border p-2">${p.Amount ?? ''}</td>
      <td class="border p-2">${p.Method ?? ''}</td>
      <td class="border p-2">${new Date(p.PaymentDate).toLocaleString()}</td>
      <td class="border p-2">${p.Reference ?? ''}</td>
    `;
    tbody.appendChild(tr);
  });
}
