// Reports page
const API = { paymentsReport: '/api/reports/payments', accessLogs: '/api/access/logs' };

async function loadPaymentsReport() {
  try {
    const res = await axios.get(API.paymentsReport);
    // expected: { totalResidents, paid, overdue, paymentsByMonth: [{month, amount}, ...] }
    const data = res.data || {};
    const statsDiv = document.getElementById('paymentsStats');
    statsDiv.innerHTML = `
      <div class="grid grid-cols-3 gap-4">
        <div class="p-3 border rounded"><div class="text-sm">Total Residents</div><div class="text-2xl font-bold">${data.totalResidents ?? '-'}</div></div>
        <div class="p-3 border rounded"><div class="text-sm">Paid</div><div class="text-2xl font-bold">${data.paid ?? '-'}</div></div>
        <div class="p-3 border rounded"><div class="text-sm">Overdue</div><div class="text-2xl font-bold">${data.overdue ?? '-'}</div></div>
      </div>
    `;

    // draw chart for paymentsByMonth or fallback sample
    const labels = (data.paymentsByMonth||[]).map(x => x.month) || ['Jan','Feb','Mar','Apr'];
    const amounts = (data.paymentsByMonth||[]).map(x => x.amount) || [1200,900,1500,1100];

    const ctx = document.getElementById('paymentsSummary').getContext('2d');
    if (window.paymentsChart) window.paymentsChart.destroy();
    window.paymentsChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Collected', data: amounts }] },
      options: { responsive: true }
    });

  } catch (err) {
    console.error(err);
    document.getElementById('paymentsStats').innerHTML = '<div class="text-red-600">Error loading payments report</div>';
  }
}

async function loadAccessTrends() {
  try {
    const res = await axios.get(API.accessLogs);
    const logs = Array.isArray(res.data) ? res.data : [];
    // build daily counts sample for last 7 days
    const last7 = {};
    for (let i=6;i>=0;i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const key = d.toISOString().slice(0,10);
      last7[key] = 0;
    }
    logs.forEach(l => {
      const day = (l.at || l.timestamp) ? (new Date(l.at || l.timestamp)).toISOString().slice(0,10) : null;
      if (day && last7.hasOwnProperty(day)) last7[day]++;
    });
    const labels = Object.keys(last7);
    const data = Object.values(last7);

    const ctx2 = document.getElementById('accessTrends').getContext('2d');
    if (window.accessChart) window.accessChart.destroy();
    window.accessChart = new Chart(ctx2, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Access events', data }]},
      options: { responsive: true }
    });

  } catch (err) {
    console.error(err);
  }
}

// init
loadPaymentsReport();
loadAccessTrends();
