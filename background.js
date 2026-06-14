// DarkShift — Background Service Worker v3

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['globalEnabled'], (data) => {
    if (data.globalEnabled === undefined) {
      chrome.storage.sync.set({
        globalEnabled: false,
        sites: {},
        brightness: 1.0,
        contrast: 1.0,
        colorTemp: 50,
        scheduleEnabled: false,
        scheduleFrom: 21,
        scheduleTo: 7,
        skipNativeDark: true
      });
    }
  });

  // Schedule alarm — fires every minute to re-evaluate schedule
  chrome.alarms.create('scheduleCheck', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'scheduleCheck') return;
  // Re-evaluate all tabs when schedule might have ticked over
  chrome.storage.sync.get(
    ['scheduleEnabled','scheduleFrom','scheduleTo','brightness','contrast','colorTemp','sites','globalEnabled','skipNativeDark'],
    (data) => {
      if (!data.scheduleEnabled) return;
      const h = new Date().getHours();
      const from = data.scheduleFrom ?? 21;
      const to   = data.scheduleTo   ?? 7;
      const inSched = from <= to ? (h >= from && h < to) : (h >= from || h < to);

      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (!tab.id || !tab.url) return;
          const blocked=['chrome://','chrome-extension://','edge://','about:','moz-extension://'];
          if(blocked.some(p=>tab.url.startsWith(p))) return;
          try {
            const host = new URL(tab.url).hostname;
            const siteOverride = (data.sites || {})[host] ?? null;
            let dark = inSched;
            if (siteOverride === true)  dark = true;
            if (siteOverride === false) dark = false;
            chrome.tabs.sendMessage(tab.id, {
              action: dark ? 'apply' : 'remove',
              brightness: data.brightness ?? 1.0,
              contrast:   data.contrast   ?? 1.0,
              colorTemp:  data.colorTemp  ?? 50
            }).catch(() => {});
          } catch (_) {}
        });
      });
    }
  );
});
