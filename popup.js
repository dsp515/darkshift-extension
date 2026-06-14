// DarkShift — Popup Script v3

const STORAGE_KEYS = [
  'globalEnabled','sites','brightness','contrast','colorTemp',
  'scheduleEnabled','scheduleFrom','scheduleTo','skipNativeDark'
];

// ── Helpers ──────────────────────────────────────────────────────
async function getTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}
function hostname(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}
function parseHour(timeStr) {
  return parseInt(timeStr.split(':')[0], 10);
}
function send(tabId, msg) {
  chrome.tabs.sendMessage(tabId, msg).catch(() => {});
}
function tempLabel(v) {
  if (v < 20) return 'Cool';
  if (v < 40) return 'Slightly Cool';
  if (v < 60) return 'Neutral';
  if (v < 80) return 'Warm';
  return 'Very Warm';
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  const tab  = await getTab();
  const host = hostname(tab?.url ?? '');

  document.getElementById('siteName').textContent = host || 'this page';

  const data = await chrome.storage.sync.get(STORAGE_KEYS);

  const globalEnabled   = data.globalEnabled   ?? false;
  const sites           = data.sites           ?? {};
  const brightness      = data.brightness      ?? 1.0;
  const contrast        = data.contrast        ?? 1.0;
  const colorTemp       = data.colorTemp       ?? 50;
  const scheduleEnabled = data.scheduleEnabled ?? false;
  const scheduleFrom    = data.scheduleFrom    ?? 21;
  const scheduleTo      = data.scheduleTo      ?? 7;
  const skipNativeDark  = data.skipNativeDark  ?? true;

  // ── Wire DOM refs ──
  const globalEl      = document.getElementById('globalToggle');
  const siteEl        = document.getElementById('siteToggle');
  const brightEl      = document.getElementById('brightnessSlider');
  const brightVal     = document.getElementById('brightnessVal');
  const contrastEl    = document.getElementById('contrastSlider');
  const contrastVal   = document.getElementById('contrastVal');
  const colorTempEl   = document.getElementById('colorTempSlider');
  const colorTempVal  = document.getElementById('colorTempVal');
  const schedEl       = document.getElementById('scheduleToggle');
  const schedTimes    = document.getElementById('scheduleTimes');
  const fromEl        = document.getElementById('scheduleFrom');
  const toEl          = document.getElementById('scheduleTo');
  const skipEl        = document.getElementById('skipNativeDark');
  const nativeBadge   = document.getElementById('nativeDarkBadge');

  // ── Set initial values ──
  globalEl.checked     = globalEnabled;
  const override       = sites[host] ?? null;
  siteEl.checked       = override !== null ? override : globalEnabled;
  brightEl.value       = Math.round(brightness * 100);
  brightVal.textContent = Math.round(brightness * 100) + '%';
  contrastEl.value     = Math.round(contrast * 100);
  contrastVal.textContent = Math.round(contrast * 100) + '%';
  colorTempEl.value    = colorTemp;
  colorTempVal.textContent = tempLabel(colorTemp);
  schedEl.checked      = scheduleEnabled;
  schedTimes.style.display = scheduleEnabled ? 'flex' : 'none';
  fromEl.value = String(scheduleFrom).padStart(2,'0') + ':00';
  toEl.value   = String(scheduleTo).padStart(2,'0') + ':00';
  skipEl.checked = skipNativeDark;

  // Check if this page is natively dark
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'query_dark' }).catch(() => {});
    // Response comes via runtime message from content.js
    chrome.runtime.onMessage.addListener(function onDarkStatus(msg) {
      if (msg.action === 'dark_status') {
        if (msg.isDark && skipNativeDark) {
          nativeBadge.classList.add('show');
        }
        chrome.runtime.onMessage.removeListener(onDarkStatus);
      }
    });
  }

  // ── Shared getter for current sliders ──
  function getSliderValues() {
    return {
      brightness: parseInt(brightEl.value) / 100,
      contrast:   parseInt(contrastEl.value) / 100,
      colorTemp:  parseInt(colorTempEl.value)
    };
  }

  // ── Global toggle ──
  globalEl.addEventListener('change', async () => {
    const on = globalEl.checked;
    await chrome.storage.sync.set({ globalEnabled: on });
    const { sites: s = {} } = await chrome.storage.sync.get('sites');
    if (s[host] === undefined) siteEl.checked = on;
    const { brightness: b, contrast: c, colorTemp: t } = getSliderValues();
    send(tab.id, { action: on ? 'apply' : 'remove', brightness: b, contrast: c, colorTemp: t });
  });

  // ── Site toggle ──
  siteEl.addEventListener('change', async () => {
    const on = siteEl.checked;
    const { sites: s = {} } = await chrome.storage.sync.get('sites');
    s[host] = on;
    await chrome.storage.sync.set({ sites: s });
    const { brightness: b, contrast: c, colorTemp: t } = getSliderValues();
    send(tab.id, { action: on ? 'apply' : 'remove', brightness: b, contrast: c, colorTemp: t });
    renderWhitelist(s);
  });

  // ── Brightness ──
  brightEl.addEventListener('input', async () => {
    const val = parseInt(brightEl.value) / 100;
    brightVal.textContent = brightEl.value + '%';
    await chrome.storage.sync.set({ brightness: val });
    const { contrast: c, colorTemp: t } = getSliderValues();
    send(tab.id, { action: 'update', brightness: val, contrast: c, colorTemp: t });
  });

  // ── Contrast ──
  contrastEl.addEventListener('input', async () => {
    const val = parseInt(contrastEl.value) / 100;
    contrastVal.textContent = contrastEl.value + '%';
    await chrome.storage.sync.set({ contrast: val });
    const { brightness: b, colorTemp: t } = getSliderValues();
    send(tab.id, { action: 'update', brightness: b, contrast: val, colorTemp: t });
  });

  // ── Color temperature ──
  colorTempEl.addEventListener('input', async () => {
    const val = parseInt(colorTempEl.value);
    colorTempVal.textContent = tempLabel(val);
    await chrome.storage.sync.set({ colorTemp: val });
    const { brightness: b, contrast: c } = getSliderValues();
    send(tab.id, { action: 'update', brightness: b, contrast: c, colorTemp: val });
  });

  // ── Schedule toggle ──
  schedEl.addEventListener('change', async () => {
    const on = schedEl.checked;
    schedTimes.style.display = on ? 'flex' : 'none';
    await chrome.storage.sync.set({ scheduleEnabled: on });
    const { sites: s = {}, globalEnabled: ge = false } =
      await chrome.storage.sync.get(['sites','globalEnabled']);
    const siteOn = s[host] ?? ge;
    const { brightness: b, contrast: c, colorTemp: t } = getSliderValues();
    if (on || siteOn) send(tab.id, { action: 'apply', brightness: b, contrast: c, colorTemp: t });
    else              send(tab.id, { action: 'remove' });
  });

  // ── Schedule times ──
  async function saveSchedule() {
    await chrome.storage.sync.set({
      scheduleFrom: parseHour(fromEl.value),
      scheduleTo:   parseHour(toEl.value)
    });
  }
  fromEl.addEventListener('change', saveSchedule);
  toEl.addEventListener('change',   saveSchedule);

  // ── Skip native dark ──
  skipEl.addEventListener('change', async () => {
    await chrome.storage.sync.set({ skipNativeDark: skipEl.checked });
    // Re-init content script behaviour
    const { brightness: b, contrast: c, colorTemp: t } = getSliderValues();
    send(tab.id, { action: skipEl.checked ? 'remove' : 'apply', brightness: b, contrast: c, colorTemp: t });
  });

  // ── Whitelist render ──
  function renderWhitelist(siteMap) {
    const disabled = Object.entries(siteMap).filter(([,v]) => v === false);
    const enabled  = Object.entries(siteMap).filter(([,v]) => v === true);

    const dlEl = document.getElementById('whitelistList');
    const elEl = document.getElementById('enabledList');

    dlEl.innerHTML = disabled.length
      ? disabled.map(([h]) => `
          <div class="wl-item">
            <span>${h}</span>
            <button class="wl-remove" data-host="${h}" data-list="disabled" title="Remove">✕</button>
          </div>`).join('')
      : '<div class="wl-empty">No sites disabled yet.</div>';

    elEl.innerHTML = enabled.length
      ? enabled.map(([h]) => `
          <div class="wl-item">
            <span>${h}</span>
            <button class="wl-remove" data-host="${h}" data-list="enabled" title="Remove">✕</button>
          </div>`).join('')
      : '<div class="wl-empty">No sites force-enabled yet.</div>';
  }

  // Remove from whitelist
  document.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('wl-remove')) return;
    const h = e.target.dataset.host;
    const { sites: s = {} } = await chrome.storage.sync.get('sites');
    delete s[h];
    await chrome.storage.sync.set({ sites: s });
    renderWhitelist(s);
    showToast(`Removed override for ${h}`);
  });

  renderWhitelist(sites);

  // ── Export ──
  document.getElementById('exportBtn').addEventListener('click', async () => {
    const d = await chrome.storage.sync.get(STORAGE_KEYS);
    const json = JSON.stringify(d, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'darkshift-settings.json'; a.click();
    URL.revokeObjectURL(url);
    showToast('Settings exported!');
  });

  // ── Import ──
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        await chrome.storage.sync.set(d);
        showToast('Settings imported! Reload popup.');
        setTimeout(() => location.reload(), 1200);
      } catch {
        showToast('Invalid settings file.');
      }
    };
    reader.readAsText(file);
  });

  // ── Tabs ──
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

init();
