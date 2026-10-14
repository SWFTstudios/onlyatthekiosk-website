// js/kiosk-content.js is a browser script that sets window.KIOSK_CONTENT.
// Give it a `window` so the Worker can read the same stores and products the
// site renders (one source of truth). Imported before kiosk-content.js.
globalThis.window = globalThis.window || globalThis;
