let geoip = null;
try {
  geoip = require('geoip-lite');
} catch (err) {
  console.warn('[GeoIP] geoip-lite not available, using fallback IP detection.');
}

// Map of common ISO 3166-1 alpha-2 codes to Full English Country Names
const COUNTRY_NAMES = {
  US: 'United States',
  GB: 'United Kingdom',
  PK: 'Pakistan',
  MY: 'Malaysia',
  SG: 'Singapore',
  IN: 'India',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  TR: 'Turkey',
  BD: 'Bangladesh',
  ID: 'Indonesia',
  PH: 'Philippines',
  VN: 'Vietnam',
  TH: 'Thailand',
  JP: 'Japan',
  KR: 'South Korea',
  CN: 'China',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  BR: 'Brazil',
  MX: 'Mexico',
  ZA: 'South Africa',
  NG: 'Nigeria',
  EG: 'Egypt',
  RU: 'Russia'
};

function getFlagEmoji(countryCode) {
  if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) {
    return '🌐';
  }
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getCountryName(countryCode) {
  if (!countryCode) return 'Global / Unknown';
  return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode.toUpperCase();
}

function extractClientIp(req) {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',').map(s => s.trim());
    if (ips.length > 0 && ips[0]) return ips[0];
  }
  return req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
}

function lookupIp(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) {
    return {
      ip: ip || '127.0.0.1',
      countryCode: 'US',
      countryName: 'United States',
      city: 'Local Session',
      flagEmoji: '🇺🇸'
    };
  }

  // Remove IPv6 prefix if mapped IPv4 (e.g. ::ffff:1.2.3.4)
  const cleanIp = ip.replace(/^::ffff:/, '');
  let geo = null;
  if (geoip && typeof geoip.lookup === 'function') {
    try {
      geo = geoip.lookup(cleanIp);
    } catch (_) {}
  }

  if (geo && geo.country) {
    const code = geo.country.toUpperCase();
    return {
      ip: cleanIp,
      countryCode: code,
      countryName: getCountryName(code),
      city: geo.city || '',
      flagEmoji: getFlagEmoji(code)
    };
  }

  return {
    ip: cleanIp,
    countryCode: 'UN',
    countryName: 'Global Location',
    city: '',
    flagEmoji: '🌐'
  };
}

module.exports = {
  getFlagEmoji,
  getCountryName,
  extractClientIp,
  lookupIp
};
