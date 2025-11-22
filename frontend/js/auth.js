
const API_BASE = '/api';
const token = localStorage.getItem('token');
if (!token) {
  // for pages other than index, redirect
  // don't redirect index.html itself (leave blank)
}
async function authorizedFetch(url, opts = {}) {
  opts.headers = { ...(opts.headers || {}), 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
  if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
  const r = await fetch(url, opts);
  if (r.status === 401 || r.status === 403) {
    // clear token and redirect to login
    localStorage.removeItem('token');
    window.location.href = '/';
    throw new Error('Unauthorized');
  }
  return r;
}

function getPayload() {
  if (!token) return null;
  try { return JSON.parse(atob(token.split('.')[1])); } catch(e){ return null; }
}

