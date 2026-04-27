const fs = require('fs');
const os = require('os');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const backendEnvPath = path.resolve(__dirname, '../../../.env');

function readEnvValue(filePath, key) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = content.match(new RegExp(`^${escaped}\\s*=\\s*(.+)\\s*$`, 'm'));
    if (!match) return null;
    return String(match[1]).replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
  } catch {
    return null;
  }
}

function readBackendUploadMaxMb() {
  try {
    if (!fs.existsSync(backendEnvPath)) return '5';

    const content = fs.readFileSync(backendEnvPath, 'utf8');
    const match = content.match(/^IMAGE_UPLOAD_MAX_MB\s*=\s*(.+)\s*$/m);
    if (!match) return '5';

    const raw = String(match[1]).replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return '5';
    return String(parsed);
  } catch {
    return '5';
  }
}

function getLocalIp() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(nets)) {
    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;

      // Ignore common VM / host-only adapter subnets that are rarely the true network.
      if (
        addr.address.startsWith('192.168.56.') ||
        addr.address.startsWith('192.168.137.') ||
        addr.address.startsWith('169.254.')
      ) {
        continue;
      }

      candidates.push({ name, address: addr.address });
    }
  }

  // If only one non-internal address is found, use it.
  if (candidates.length === 1) return candidates[0].address;

  // Prefer typical local Wi-Fi/Ethernet ranges (and include 172.16-31 private range).
  const preferred = candidates.find((c) => {
    const a = c.address;
    const in172Private = a.startsWith('172.') && Number(a.split('.')[1]) >= 16 && Number(a.split('.')[1]) <= 31;
    return (
      a.startsWith('192.168.') ||
      a.startsWith('10.') ||
      in172Private
    );
  });

  if (preferred) return preferred.address;

  // If we still have multiple, prefer common adapter names.
  const byName = candidates.find((c) => /wi[-_ ]?fi|ethernet/i.test(c.name));
  if (byName) return byName.address;

  // Fallback to first candidate, else localhost.
  return candidates[0]?.address || 'localhost';
}

function writeEnv(ip) {
  const url = `http://${ip}:5000`;
  const uploadMaxMb = readBackendUploadMaxMb();
  const removeBgApiKey =
    readEnvValue(envPath, 'EXPO_PUBLIC_REMOVE_BG_API_KEY')
    || readEnvValue(backendEnvPath, 'REMOVE_BG_API_KEY');

  const lines = [
    `EXPO_PUBLIC_API_BASE_URL=${url}`,
    `EXPO_PUBLIC_IMAGE_UPLOAD_MAX_MB=${uploadMaxMb}`,
  ];

  if (removeBgApiKey) {
    lines.push(`EXPO_PUBLIC_REMOVE_BG_API_KEY=${removeBgApiKey}`);
  }

  lines.push('');
  const content = lines.join('\n');
  fs.writeFileSync(envPath, content, { encoding: 'utf8' });
  console.log(`Updated ${path.relative(process.cwd(), envPath)} to ${url} (upload max ${uploadMaxMb}MB)`);
}

const ip = getLocalIp();
writeEnv(ip);
