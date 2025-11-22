// frontend/scripts/adminsdashboard.js
const sidebarBtns = document.querySelectorAll('.sidebar-btn');
const contentContainer = document.getElementById('contentContainer');
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

async function loadSection(file) {
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const html = await res.text();
    contentContainer.innerHTML = html;

    // Determine script path: replace sections/... .html -> scripts/....js
    const scriptPath = file.replace(/^sections\//, 'scripts/').replace(/\.html$/, '.js');

    // Try dynamic import (make path relative to current file)
    try {
      // dynamic import expects same-origin path; ensure correct relative path
      const module = await import(`./${scriptPath}`);
      if (module && typeof module.init === 'function') {
        // pass contentContainer if needed
        module.init && module.init();
      }
    } catch (err) {
      // Not fatal — some sections may not have scripts
      console.warn('No module or failed to import', scriptPath, err);
    }
  } catch (err) {
    contentContainer.innerHTML = `<div class="p-4 text-red-600">Failed to load: ${err.message}</div>`;
    console.error(err);
  }
}

// Attach click handlers
sidebarBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // highlight active
    sidebarBtns.forEach(b => b.classList.remove('bg-blue-700','text-white'));
    btn.classList.add('bg-blue-700','text-white');

    const file = btn.dataset.file;
    if (file) loadSection(file);
  });
});

// load first available by default (if any)
if (sidebarBtns.length) {
  const firstFile = sidebarBtns[0].dataset.file;
  sidebarBtns[0].classList.add('bg-blue-700','text-white');
  if (firstFile) loadSection(firstFile);
}
