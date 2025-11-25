const API = { logs: '/api/access/logs' };
const logsTbody = document.getElementById('logsTbody');
const logsFrom = document.getElementById('logsFrom');
const logsTo = document.getElementById('logsTo');
const logsFilter = document.getElementById('logsFilter');
const logsRefresh = document.getElementById('logsRefresh');

async function loadLogs(from=null, to=null) {
  logsTbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center">Loading...</td></tr>';

  try {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const res = await axios.get(API.logs, { params });
    const arr = Array.isArray(res.data) ? res.data : [];

    if (!arr.length) {
      logsTbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center">No logs</td></tr>';
      return;
    }

    logsTbody.innerHTML = '';
    arr.forEach(log => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2 border">${new Date(log.TimestampUtc).toLocaleString()}</td>
        <td class="p-2 border">${log.LogType || log.Action}</td>
        <td class="p-2 border"><pre class="whitespace-pre-wrap">${JSON.stringify({
          UserId: log.UserId,
          Action: log.Action,
          Resource: log.Resource,
          IpAddress: log.IpAddress,
          UserAgent: log.UserAgent,
          Referrer: log.Referrer,
          Metadata: log.Metadata
        }, null, 2)}</pre></td>
      `;
      logsTbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    logsTbody.innerHTML = '<tr><td colspan="3" class="p-4 text-red-600">Error loading logs</td></tr>';
  }
}

logsFilter.addEventListener('click', () => {
  const from = logsFrom.value || null;
  const to = logsTo.value || null;
  loadLogs(from, to);
});

logsRefresh.addEventListener('click', () => loadLogs());
loadLogs(); // initial load
