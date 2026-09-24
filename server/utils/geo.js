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
  if (req.headers) {
    if (req.headers['cf-connecting-ip']) return req.headers['cf-connecting-ip'].trim();
    if (req.headers['true-client-ip']) return req.headers['true-client-ip'].trim();
    if (req.headers['x-client-ip']) return req.headers['x-client-ip'].trim();
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = forwarded.split(',').map(s => s.trim()).filter(Boolean);
      if (ips.length > 0) return ips[0];
    }
    if (req.headers['x-real-ip']) return req.headers['x-real-ip'].trim();
  }
  return (req.socket && req.socket.remoteAddress) || req.ip || '127.0.0.1';
}

function lookupIp(ip, timezone, cfCountry) {
  const cleanIp = (ip || '127.0.0.1').replace(/^::ffff:/, '').trim();
  const isLocal = !cleanIp || cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.16.');

  // 1. Direct Edge Country from CDN/Cloudflare header
  if (cfCountry && typeof cfCountry === 'string' && cfCountry.length === 2 && cfCountry !== 'XX' && cfCountry !== 'T1') {
    const code = cfCountry.toUpperCase();
    return {
      ip: cleanIp,
      countryCode: code,
      countryName: getCountryName(code),
      city: '',
      flagEmoji: getFlagEmoji(code)
    };
  }

  // 2. Resolve country from user browser timezone
  let tzCountry = null;
  if (timezone && typeof timezone === 'string') {
    const tzTrimmed = timezone.trim();
    let matchedCode = TIMEZONE_TO_COUNTRY[tzTrimmed];
    if (!matchedCode) {
      if (tzTrimmed.includes('Karachi') || tzTrimmed.includes('Islamabad') || tzTrimmed.includes('Lahore')) matchedCode = 'PK';
      else if (tzTrimmed.includes('Kolkata') || tzTrimmed.includes('Calcutta')) matchedCode = 'IN';
      else if (tzTrimmed.includes('Dhaka')) matchedCode = 'BD';
      else if (tzTrimmed.includes('Dubai') || tzTrimmed.includes('Muscat')) matchedCode = 'AE';
      else if (tzTrimmed.includes('London')) matchedCode = 'GB';
      else if (tzTrimmed.includes('Kuala_Lumpur')) matchedCode = 'MY';
      else if (tzTrimmed.includes('Singapore')) matchedCode = 'SG';
    }
    if (matchedCode) {
      tzCountry = {
        ip: cleanIp,
        countryCode: matchedCode,
        countryName: getCountryName(matchedCode),
        city: tzTrimmed.split('/').pop().replace(/_/g, ' '),
        flagEmoji: getFlagEmoji(matchedCode)
      };
    }
  }

  // 3. Lookup IP in MaxMind GeoIP database
  let geo = null;
  if (!isLocal && geoip && typeof geoip.lookup === 'function') {
    try {
      geo = geoip.lookup(cleanIp);
    } catch (_) {}
  }

  if (geo && geo.country) {
    const code = geo.country.toUpperCase();
    // If IP resolves to US but user's browser timezone is Pakistani/Asian,
    // the US IP is a hosting server proxy or VPN exit node -> prioritize actual user timezone
    if ((code === 'US' || code === 'GB') && tzCountry && (tzCountry.countryCode === 'PK' || tzCountry.countryCode === 'IN' || tzCountry.countryCode === 'BD' || tzCountry.countryCode === 'MY')) {
      return tzCountry;
    }
    return {
      ip: cleanIp,
      countryCode: code,
      countryName: getCountryName(code),
      city: geo.city || '',
      flagEmoji: getFlagEmoji(code)
    };
  }

  // 4. Fallback to client browser timezone
  if (tzCountry) {
    return tzCountry;
  }

  // 5. Fallback for local development or unresolvable
  return {
    ip: cleanIp,
    countryCode: 'PK',
    countryName: 'Pakistan',
    city: 'Local Session',
    flagEmoji: '🇵🇰'
  };
}

module.exports = {
  getFlagEmoji,
  getCountryName,
  extractClientIp,
  lookupIp,
  TIMEZONE_TO_COUNTRY
};
