const dns = require('dns').promises;
const net = require('net');

const parseAllowList = (value) => String(value || '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

const resolveAllowedHosts = (options = {}) => {
  if (Array.isArray(options.allowedHosts)) {
    return options.allowedHosts;
  }

  const configured = parseAllowList(process.env.REMOVE_BG_ALLOWED_IMAGE_HOSTS);
  if (configured.length > 0) {
    return configured;
  }

  // Fail closed in production until an explicit host allowlist is configured.
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    return null;
  }

  // In non-production, allow public hosts to keep local dev workflows simple.
  return [];
};

const isHostnameAllowed = (hostname, allowedHosts) => {
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) {
    return true;
  }

  return allowedHosts.some((allowedHost) => (
    hostname === allowedHost || hostname.endsWith(`.${allowedHost}`)
  ));
};

const isPrivateIpv4 = (ip) => {
  const parts = ip.split('.').map((segment) => Number(segment));
  if (parts.length !== 4 || parts.some((segment) => !Number.isInteger(segment))) {
    return true;
  }

  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] >= 224) return true;

  return false;
};

const isPrivateIpv6 = (ip) => {
  const normalized = String(ip || '').toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('ff')) return true;

  return false;
};

const isPrivateAddress = (address) => {
  const ipVersion = net.isIP(address);
  if (ipVersion === 4) return isPrivateIpv4(address);
  if (ipVersion === 6) return isPrivateIpv6(address);
  return true;
};

const resolveHostAddresses = async (hostname) => {
  try {
    const resolved = await dns.lookup(hostname, { all: true, verbatim: true });
    return Array.isArray(resolved)
      ? resolved.map((entry) => entry.address).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

const validateOutboundImageUrl = async (rawUrl, options = {}) => {
  const allowedHosts = resolveAllowedHosts(options);
  if (allowedHosts === null) {
    return {
      ok: false,
      reason: 'REMOVE_BG_ALLOWED_IMAGE_HOSTS must be configured in production.',
    };
  }

  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    return { ok: false, reason: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only https URLs are allowed.' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URLs with embedded credentials are not allowed.' };
  }

  const hostname = String(parsed.hostname || '').toLowerCase();
  if (!hostname) {
    return { ok: false, reason: 'URL host is required.' };
  }

  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    return { ok: false, reason: 'Local hosts are not allowed.' };
  }

  if (!isHostnameAllowed(hostname, allowedHosts)) {
    return { ok: false, reason: 'Host is not in the allowed image host list.' };
  }

  if (net.isIP(hostname) && isPrivateAddress(hostname)) {
    return { ok: false, reason: 'Private or loopback IPs are not allowed.' };
  }

  const resolvedAddresses = await resolveHostAddresses(hostname);
  if (resolvedAddresses.length === 0) {
    return { ok: false, reason: 'Unable to resolve image host.' };
  }

  const hasPrivateAddress = resolvedAddresses.some((address) => isPrivateAddress(address));
  if (hasPrivateAddress) {
    return { ok: false, reason: 'Resolved host points to a private or loopback IP.' };
  }

  return { ok: true, normalizedUrl: parsed.toString() };
};

module.exports = {
  validateOutboundImageUrl,
};