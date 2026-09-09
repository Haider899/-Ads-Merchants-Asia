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

// Map of common timezones to ISO 3166-1 alpha-2 codes
const TIMEZONE_TO_COUNTRY = {
  'Asia/Karachi': 'PK',
  'Asia/Islamabad': 'PK',
  'Asia/Lahore': 'PK',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Dhaka': 'BD',
  'Asia/Dubai': 'AE',
  'Asia/Muscat': 'OM',
  'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Bahrain': 'BH',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Singapore': 'SG',
  'Asia/Bangkok': 'TH',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW',
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Europe/Amsterdam': 'NL',
  'Europe/Istanbul': 'TR',
  'Europe/Moscow': 'RU',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG',
  'Africa/Cairo': 'EG',
  'America/Sao_Paulo': 'BR'
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

function lookupIp(ip, timezone) {
  const cleanIp = (ip || '127.0.0.1').replace(/^::ffff:/, '').trim();
  const isLocal = !cleanIp || cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.16.');

  let geo = null;
  if (!isLocal && geoip && typeof geoip.lookup === 'function') {
    try {
      geo = geoip.lookup(cleanIp);
    } catch (_) {}
  }

  // 1. If public IP lookup succeeded, use that country
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

  // 2. Fallback to client browser timezone if local or unresolved
  if (timezone && typeof timezone === 'string') {
    const tzTrimmed = timezone.trim();
    let matchedCode = TIMEZONE_TO_COUNTRY[tzTrimmed];
    if (!matchedCode) {
      if (tzTrimmed.includes('Karachi') || tzTrimmed.includes('Islamabad') || tzTrimmed.includes('Lahore')) matchedCode = 'PK';
      else if (tzTrimmed.includes('Kolkata') || tzTrimmed.includes('Calcutta')) matchedCode = 'IN';
      else if (tzTrimmed.includes('Dubai')) matchedCode = 'AE';
      else if (tzTrimmed.includes('London')) matchedCode = 'GB';
      else if (tzTrimmed.includes('New_York') || tzTrimmed.includes('Los_Angeles') || tzTrimmed.includes('Chicago')) matchedCode = 'US';
    }

    if (matchedCode) {
      return {
        ip: cleanIp,
        countryCode: matchedCode,
        countryName: getCountryName(matchedCode),
        city: tzTrimmed.split('/').pop().replace(/_/g, ' '),
        flagEmoji: getFlagEmoji(matchedCode)
      };
    }
  }

  // 3. Fallback for unresolvable IPs
  if (isLocal) {
    return {
      ip: cleanIp,
      countryCode: 'PK',
      countryName: 'Pakistan',
      city: 'Local Session',
      flagEmoji: '🇵🇰'
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
  lookupIp,
  TIMEZONE_TO_COUNTRY
};
