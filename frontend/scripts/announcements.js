// frontend/scripts/announcements.js
import { validateRequired, showFormError, clearFormError } from './validation.js';

export async function init() {
  const titleEl = document.getElementById('announceTitle');
  const bodyEl = document.getElementById('announceBody');
  const postBtn = document.getElementById('announcePostBtn');
  const clearBtn = document.getElementById('announceClearBtn');
  const msgEl = document.getElementById('announceMsg');
  const listEl = document.getElementById('announcementsList');

  function showMsg(text, ok = true) {
    msgEl.textContent = text;
    msgEl.classList.remove('hidden');
    msgEl.classList.toggle('text-green-600', ok);
    msgEl.classList.toggle('text-red-600', !ok);
    setTimeout(()=> msgEl.classList.add('hidden'), 4000);
  }

  async function loadAnnouncements() {
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      renderList(data || []);
    } catch (err) {
      console.error(err);
      showMsg('Failed to load announcements', false);
    }
  }

  function renderList(list) {
    listEl.innerHTML = '';
    if (!list.length) {
      listEl.innerHTML = `<div class="p-4 text-gray-600">No announcements</div>`;
      return;
    }
    list.forEach(a => {
      const div = document.createElement('div');
      div.className = 'p-4 border rounded bg-gray-50';
      div.innerHTML = `
        <h3 class="font-semibold">${a.Title ?? ''}</h3>
        <p class="text-sm text-gray-700 mt-1">${a.Message ?? ''}</p>
        <div class="text-xs text-gray-500 mt-2">${new Date(a.CreatedAt || a.createdAt || Date.now()).toLocaleString()}</div>
      `;
      listEl.appendChild(div);
    });
  }

  postBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    clearFormError('announceMsg');
    const title = titleEl.value.trim();
    const body = bodyEl.value.trim();

    if (!validateRequired(title, body)) {
      showFormError('announceMsg', 'Title and message required.');
      return;
    }

    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ title: title, message: body })
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({message:'Failed'}));
        showFormError('announceMsg', err.message || 'Posting failed');
        return;
      }
      titleEl.value = '';
      bodyEl.value = '';
      showMsg('Announcement posted');
      await loadAnnouncements();
    } catch (err) {
      console.error(err);
      showFormError('announceMsg', 'Network error');
    }
  });

  clearBtn.addEventListener('click', () => {
    titleEl.value = '';
    bodyEl.value = '';
    clearFormError('announceMsg');
  });

  await loadAnnouncements();
}
