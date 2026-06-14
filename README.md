# 🌙 DarkShift

Smart dark mode for every website.

DarkShift is a lightweight browser extension that intelligently applies dark mode to websites while preserving images, videos, charts, and site functionality.

Built with a special focus on Salesforce Lightning Experience, DarkShift provides a clean, comfortable, and highly customizable dark browsing experience.

---

## ✨ Features

### Smart Dark Mode

* Automatic dark mode for websites without native support
* Preserves images, videos, and media content
* Intelligent color inversion engine

### Native Dark Theme Detection

* Detects websites already using dark themes
* Prevents double-darkening
* Works with dynamic theme switching

### Website Controls

* Global enable/disable
* Per-site enable/disable
* Force-enable specific websites
* Whitelist management

### Display Controls

* Brightness adjustment
* Contrast adjustment
* Color temperature control
* Live updates

### Scheduling

* Automatic dark mode schedule
* Night mode automation
* User-configurable time ranges

### Settings

* Export settings
* Import settings
* Device sync support
* Backup and restore

### Privacy First

* No tracking
* No analytics
* No telemetry
* No user data collection

---

## 🚀 Optimized For Salesforce

DarkShift has been designed and tested primarily for Salesforce Lightning Experience.

Supported areas include:

* Home
* Accounts
* Contacts
* Leads
* Opportunities
* Cases
* Reports
* Dashboards
* Related Lists
* Setup Pages

DarkShift works on all websites while providing an enhanced experience for Salesforce users.

---

## 📸 Screenshots

### Main Controls
<img width="400" height="690" alt="Screenshot 2026-06-15 022020" src="https://github.com/user-attachments/assets/0175677f-ef61-47b1-bb2e-0d8855526c1f" />

Manage dark mode globally or for the current website.

### Whitelist Management
<img width="404" height="353" alt="Screenshot 2026-06-15 022042" src="https://github.com/user-attachments/assets/b4d82495-3ed4-43bb-9405-238980fb27e5" />

Control websites that should remain unchanged.

### Settings
<img width="404" height="442" alt="Screenshot 2026-06-15 022109" src="https://github.com/user-attachments/assets/172485e3-8a23-4847-844f-949ce9564af2" />

Configure native dark detection, import/export settings, and scheduling.

---
## Architecture

DarkShift uses a three-phase detection engine:

1. Native Dark Detection
2. Luminance Verification
3. SPA Theme Monitoring

<img width="1150" height="1368" alt="workflow -darkshift" src="https://github.com/user-attachments/assets/fd307232-f771-4476-ab63-d0cd5855ae02" />
The engine intelligently detects existing dark themes, applies DarkShift only when necessary, and continuously adapts to theme changes in modern single-page applications.

---
## Browser Support

| Browser | Status |
|----------|----------|
| Chrome | ✅ Supported |
| Edge | ✅ Supported |
| Firefox | ⚠ Experimental |
---

## 🔧 Installation

### Chrome

1. Download the latest release.
2. Open Chrome.
3. Navigate to:

chrome://extensions

4. Enable Developer Mode.
5. Click Load Unpacked.
6. Select the DarkShift folder.

### Firefox

1. Download the XPI release.
2. Open:

about:debugging

3. Click This Firefox.
4. Select Load Temporary Add-on.
5. Choose the XPI file.

---

## 🛡 Privacy Policy

DarkShift does not collect, transmit, store, or analyze any user data.

Everything runs locally inside your browser.

No accounts.
No cloud processing.
No tracking.

---

## 📄 License

MIT License

---

## ⭐ Support

If DarkShift improves your workflow, consider starring the repository and sharing it with other Salesforce professionals.
