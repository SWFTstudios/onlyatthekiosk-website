const fs = require('fs');
const path = require('path');

const DEV_VARS_PATH = path.join(__dirname, '..', '.dev.vars');

function loadDevVars() {
  if (!fs.existsSync(DEV_VARS_PATH)) return;

  const lines = fs.readFileSync(DEV_VARS_PATH, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

module.exports = { loadDevVars };
