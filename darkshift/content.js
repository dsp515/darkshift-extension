// DarkShift — Content Script v3

const STYLE_ID = 'darkshift-style';
const TEMP_STYLE_ID = 'darkshift-temp';

// ── Dark mode detection ──────────────────────────────────────────
function pageIsNativelyDark() {
  // 1. OS/browser prefers-color-scheme
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return true;

  // 2. <html> or <body> color-scheme meta / attribute signals
  const htmlEl = document.documentElement;
  const bodyEl = document.body;
  const cs = htmlEl.style.colorScheme || bodyEl?.style.colorScheme || '';
  if (cs.includes('dark')) return true;
  const metaCS = document.querySelector('meta[name="color-scheme"]');
  if (metaCS && metaCS.content.includes('dark')) return true;

  // 3. data-theme / class heuristics
  const theme =
    htmlEl.dataset.theme || htmlEl.dataset.colorScheme ||
    bodyEl?.dataset.theme || bodyEl?.dataset.colorScheme || '';
  if (/dark/i.test(theme)) return true;
  if (htmlEl.classList.contains('dark') || htmlEl.classList.contains('dark-mode') ||
      bodyEl?.classList.contains('dark') || bodyEl?.classList.contains('dark-mode')) return true;

  // 4. Background colour luminance check
  const bg = window.getComputedStyle(htmlEl).backgroundColor ||
             window.getComputedStyle(bodyEl || htmlEl).backgroundColor;
  if (bg) {
    const m = bg.match(/\d+/g);
    if (m && m.length >= 3) {
      const lum = 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2];
      if (lum < 80) return true;
    }
  }

  return false;
}

// ── CSS builders ─────────────────────────────────────────────────
function buildFilter(brightness, contrast) {
  return `invert(1) hue-rotate(180deg) brightness(${brightness}) contrast(${contrast})`;
}

function colorTempCSS(temp) {
  // temp 0-100: 0=cool(blue), 50=neutral, 100=warm(amber)
  // Apply via CSS filter sepia + hue-rotate on the overlay
  if (temp === 50) return '';
  if (temp < 50) {
    // Cool: slight hue shift toward blue
    const deg = Math.round((50 - temp) * 0.4); // max -20deg
    return `hue-rotate(-${deg}deg)`;
  } else {
    // Warm: sepia-like shift
    const s = Math.round((temp - 50) * 0.4); // max 20deg
    return `sepia(${s}%) saturate(${110 + s}%)`;
  }
}

function applyDark(brightness = 1.0, contrast = 1.0, colorTemp = 50) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }

  const tempFilter = colorTempCSS(colorTemp);
  const baseFilter = buildFilter(brightness, contrast);
  const fullFilter = tempFilter ? `${baseFilter} ${tempFilter}` : baseFilter;

  style.textContent = `
    html {
      filter: ${fullFilter} !important;
      background: #000 !important;
    }
    img, video, iframe, canvas, picture,
    embed, object, svg image,
    [style*="background-image"] {
      filter: ${buildFilter(brightness, contrast)} !important;
    }
  `;
}

function removeDark() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

// ── Schedule helper ───────────────────────────────────────────────
function inSchedule(from, to) {
  const h = new Date().getHours();
  if (from <= to) return h >= from && h < to;
  return h >= from || h < to;
}

// ── Init ──────────────────────────────────────────────────────────
function init() {
  const host = window.location.hostname;
  const keys = [
    'globalEnabled','sites','brightness','contrast','colorTemp',
    'scheduleEnabled','scheduleFrom','scheduleTo','skipNativeDark'
  ];
  chrome.storage.sync.get(keys, (data) => {
    const globalEnabled   = data.globalEnabled   ?? false;
    const sites           = data.sites           ?? {};
    const brightness      = data.brightness      ?? 1.0;
    const contrast        = data.contrast        ?? 1.0;
    const colorTemp       = data.colorTemp       ?? 50;
    const scheduleEnabled = data.scheduleEnabled ?? false;
    const scheduleFrom    = data.scheduleFrom    ?? 21;
    const scheduleTo      = data.scheduleTo      ?? 7;
    const skipNativeDark  = data.skipNativeDark  ?? true;
    const siteOverride    = sites[host]          ?? null;

    // Whitelist: explicitly disabled for this site
    if (siteOverride === false) { removeDark(); return; }

    // Skip if page already dark and setting enabled
    if (skipNativeDark && pageIsNativelyDark()) { removeDark(); return; }

    let dark = false;
    if (scheduleEnabled) {
      dark = inSchedule(scheduleFrom, scheduleTo);
      // Site override still respected inside schedule
      if (siteOverride === false) dark = false;
      if (siteOverride === true)  dark = true;
    } else {
      if      (siteOverride === true)  dark = true;
      else if (siteOverride === false) dark = false;
      else                             dark = globalEnabled;
    }

    if (dark) applyDark(brightness, contrast, colorTemp);
    else      removeDark();
  });
}

// ── Message listener ──────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'apply') {
    applyDark(msg.brightness ?? 1.0, msg.contrast ?? 1.0, msg.colorTemp ?? 50);
  }
  if (msg.action === 'remove') {
    removeDark();
  }
  if (msg.action === 'update') {
    const el = document.getElementById(STYLE_ID);
    if (el) applyDark(msg.brightness ?? 1.0, msg.contrast ?? 1.0, msg.colorTemp ?? 50);
  }
  if (msg.action === 'query_dark') {
    // Popup asks: is this page natively dark?
    chrome.runtime.sendMessage({ action: 'dark_status', isDark: pageIsNativelyDark() });
  }
});

init();
