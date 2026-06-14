// DarkShift — Content Script v5

const STYLE_ID = 'darkshift-style';

// ─── CSS builders ────────────────────────────────────────────────
function buildFilter(b, c) {
  return `invert(1) hue-rotate(180deg) brightness(${b}) contrast(${c})`;
}
function tempCSS(t) {
  if (t === 50) return '';
  if (t < 50)  return `hue-rotate(-${Math.round((50-t)*0.4)}deg)`;
  const s = Math.round((t-50)*0.4);
  return `sepia(${s}%) saturate(${110+s}%)`;
}
function applyDark(b=1.0, c=1.0, t=50) {
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(el);
  }
  const base = buildFilter(b, c);
  const tmp  = tempCSS(t);
  el.textContent = `
    html { filter: ${tmp ? base+' '+tmp : base} !important;  }
    img,video,iframe,canvas,picture,embed,object,svg image,[style*="background-image"] {
      filter: ${base} !important;
    }`;
}
function removeDark() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

// ─── Schedule ────────────────────────────────────────────────────
function inSchedule(from, to) {
  const h = new Date().getHours();
  return from <= to ? h >= from && h < to : h >= from || h < to;
}

// ─── PHASE 1: DOM attribute check (safe at document_start) ───────
// Does NOT use computed styles — body may not exist yet.
// Does NOT check prefers-color-scheme — that is OS preference,
// not page state. Two sites on the same OS can differ.
function hasDarkAttributes() {
  const html = document.documentElement;
  const body = document.body; // may be null

  // color-scheme inline style
  const cs = html.style.colorScheme || body?.style.colorScheme || '';
  if (cs.includes('dark')) return true;

  // <meta name="color-scheme" content="dark">
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta?.content?.includes('dark')) return true;

  // data-theme / data-color-scheme / .dark / .dark-mode on <html> or <body>
  for (const el of [html, body]) {
    if (!el) continue;
    const theme = el.dataset.theme || el.dataset.colorScheme || '';
    if (/dark/i.test(theme)) return true;
    if (el.classList.contains('dark') || el.classList.contains('dark-mode')) return true;
  }

  return false;
}

// ─── PHASE 2: Luminance check (reliable only post-DOM) ───────────
// Returns true if the page's actual rendered background is dark.
// Handles sites that respond to prefers-color-scheme via CSS
// (their bg turns dark at render time, not via HTML attributes).
function getBgLuminance() {
  try {
    for (const el of [document.documentElement, document.body]) {
      if (!el) continue;
      const bg = window.getComputedStyle(el).backgroundColor;
      if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') continue;
      const m = bg.match(/\d+/g);
      if (m && m.length >= 3) return 0.299*+m[0] + 0.587*+m[1] + 0.114*+m[2];
    }
  } catch (_) {}
  return 255; // unknown → assume light, don't block DarkShift
}

// ─── Main init ───────────────────────────────────────────────────
function init() {
  const host = window.location.hostname;
  chrome.storage.sync.get(
    ['globalEnabled','sites','brightness','contrast','colorTemp',
     'scheduleEnabled','scheduleFrom','scheduleTo'],
    (data) => {
      const globalEnabled   = data.globalEnabled   ?? false;
      const sites           = data.sites           ?? {};
      const brightness      = data.brightness      ?? 1.0;
      const contrast        = data.contrast        ?? 1.0;
      const colorTemp       = data.colorTemp       ?? 50;
      const scheduleEnabled = data.scheduleEnabled ?? false;
      const scheduleFrom    = data.scheduleFrom    ?? 21;
      const scheduleTo      = data.scheduleTo      ?? 7;
      const siteOverride    = sites[host]          ?? null;

      // ── PHASE 1A: explicit whitelist off ─────────────────────
      if (siteOverride === false) { removeDark(); return; }

      // ── Determine if settings say dark should apply ───────────
      let shouldApply;
      if (scheduleEnabled) {
        shouldApply = inSchedule(scheduleFrom, scheduleTo);
        if (siteOverride === false) shouldApply = false;
        if (siteOverride === true)  shouldApply = true;
      } else {
        if      (siteOverride === true)  shouldApply = true;
        else if (siteOverride === false) shouldApply = false;
        else                             shouldApply = globalEnabled;
      }

      if (!shouldApply) { removeDark(); return; }

      // ── PHASE 1B: DOM attribute dark check ───────────────────
      // Safe at document_start. If page already signals dark → skip.
      if ((data.skipNativeDark ?? true) && hasDarkAttributes()) { removeDark(); return; }

      // ── Apply immediately (prevents white flash on light pages) ─
      applyDark(brightness, contrast, colorTemp);

      // ── PHASE 2: Luminance recheck after DOM + CSS paint ─────
      // Required for pages that go dark via prefers-color-scheme CSS
      // (e.g. Chrome dark mode → Google renders dark background).
      // We can't detect this at document_start — computed styles
      // aren't available until the DOM loads and CSS resolves.
      //
      // siteOverride === true = user explicitly wants dark on this
      // site → trust the user, skip the luminance check.
      if (siteOverride !== true) {
        const recheckLuminance = () => {
          if ((data.skipNativeDark ?? true) && getBgLuminance() < 80) {
            // Page IS dark — our filter would invert it to light. Remove.
            removeDark();
          }
          // If still light: keep dark filter. Done.
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded',
            () => setTimeout(recheckLuminance, 150));
        } else {
          setTimeout(recheckLuminance, 150);
        }
      }

      // ── PHASE 3: MutationObserver for SPAs ───────────────────
      // Sites like YouTube, GitHub, Twitter toggle dark class/attr
      // dynamically. Watch for changes and re-evaluate.
      const observer = new MutationObserver(() => {
        if (hasDarkAttributes() || getBgLuminance() < 80) {
          removeDark();
        } else if (shouldApply && !document.getElementById(STYLE_ID)) {
          applyDark(brightness, contrast, colorTemp);
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class','style','data-theme','data-color-scheme']
      });
      // Also watch body once it exists
      const bodyWatcher = setInterval(() => {
        if (document.body) {
          observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class','style','data-theme','data-color-scheme']
          });
          clearInterval(bodyWatcher);
        }
      }, 50);
    }
  );
}

// ─── Message listener ────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'apply') { init(); return; }
  // legacy
  if (false) applyDark(msg.brightness??1.0, msg.contrast??1.0, msg.colorTemp??50);
  if (msg.action === 'remove') removeDark();
  if (msg.action === 'update' && document.getElementById(STYLE_ID))
    applyDark(msg.brightness??1.0, msg.contrast??1.0, msg.colorTemp??50);
  if (msg.action === 'query_dark')
    chrome.runtime.sendMessage({
      action: 'dark_status',
      isDark: hasDarkAttributes() || getBgLuminance() < 80
    });
});

init();
