const API_BASE = 'https://api.weather.com';
const API_KEY = import.meta.env.VITE_WU_API_KEY;
const STATION_ID = import.meta.env.VITE_WU_STATION_ID;

// Helpers
const withParams = (path, params = {}) => {
  const url = new URL(path, API_BASE);
  // Ensure all WU requests return decimal precision
  if (!('numericPrecision' in params)) {
    params.numericPrecision = 'decimal';
  }
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  return url.toString();
};

export async function fetchCurrentObservation({ units = 'm' } = {}) {
  if (!API_KEY || !STATION_ID) throw new Error('VITE_WU_API_KEY et VITE_WU_STATION_ID doivent être définies');
  const url = withParams(`/v2/pws/observations/current`, {
    stationId: STATION_ID,
    format: 'json',
    apiKey: API_KEY,
    units,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur API current');
  const data = await res.json();
  const obs = data?.observations?.[0] || {};
  return {
    ts: obs.obsTimeUtc ? new Date(obs.obsTimeUtc) : new Date(),
    temp: obs.metric?.temp ?? obs.imperial?.temp ?? obs.temp,
    humidity: obs.humidity,
    pressure: obs.metric?.pressure ?? obs.imperial?.pressure ?? obs.pressure,
    windSpeed: obs.metric?.windSpeed ?? obs.imperial?.windSpeed ?? obs.windSpeed,
    windGust: obs.metric?.windGust ?? obs.imperial?.windGust ?? obs.windGust,
    windDir: obs.winddir,
    precip1h: obs.metric?.precipRate ?? obs.imperial?.precipRate ?? 0,
    precip24h: obs.metric?.precipTotal ?? obs.imperial?.precipTotal ?? 0,
    solarRadiation: obs.solarRadiation,
    uv: obs.uv,
    lat: obs.lat,
    lon: obs.lon,
    raw: obs,
  };
}

export async function fetchHourly({ units = 'm' } = {}) {
  if (!API_KEY || !STATION_ID) throw new Error('VITE_WU_API_KEY et VITE_WU_STATION_ID doivent être définies');

  // Use observations/all/1day: 5-min granularity from midnight (current day)
  const url = withParams(`/v2/pws/observations/all/1day`, {
    stationId: STATION_ID,
    format: 'json',
    apiKey: API_KEY,
    units,
  });

  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur API observations/all/1day');
  const json = await res.json();
  const allObs = (json?.observations || []);

  // Map and keep cumulative precipitation when available
  const prelim = allObs.map((h) => ({
    ts: h.obsTimeUtc ? new Date(h.obsTimeUtc) : (h.epoch ? new Date(h.epoch * 1000) : null),
    temp:
      h.metric?.temp ?? h.imperial?.temp ?? h.temp ??
      h.metric?.tempAvg ?? h.imperial?.tempAvg ?? h.tempAvg ?? null,
    humidity: h.humidity ?? h.humidityAvg ?? h.metric?.humidityAvg ?? null,
    pressure: h.metric?.pressure ?? h.imperial?.pressure ?? h.pressure ?? h.metric?.pressureAvg ?? h.imperial?.pressureAvg ?? h.pressureAvg ?? null,
    precipRate: h.metric?.precipRate ?? h.imperial?.precipRate ?? h.precipRate ?? h.metric?.precipRateAvg ?? h.imperial?.precipRateAvg ?? h.precipRateAvg ?? 0,
    precipCum: h.metric?.precipTotal ?? h.imperial?.precipTotal ?? h.precipTotal ?? null,
  }))
  .filter((d) => d.ts instanceof Date && !isNaN(d.ts))
  .sort((a, b) => a.ts - b.ts);

  // Compute per-interval precipitation from cumulative totals; fallback to rate*time
  let prevCum = null;
  let prevTs = null;
  const mapped = prelim.map((d) => {
    let precip = 0;
    if (d.precipCum != null && !isNaN(d.precipCum)) {
      if (prevCum == null || Number(d.precipCum) < Number(prevCum)) {
        // reset at midnight or counter reset
        precip = Number(d.precipCum);
      } else {
        precip = Number(d.precipCum) - Number(prevCum);
      }
    } else {
      // Approximate from rate times time delta (mm/h * hours)
      const dtMin = prevTs ? (d.ts - prevTs) / 60000 : 5; // assume 5 minutes if unknown
      precip = (Number(d.precipRate) || 0) * (dtMin / 60);
    }
    prevCum = d.precipCum != null ? Number(d.precipCum) : prevCum;
    prevTs = d.ts;
    return { ts: d.ts, temp: d.temp, humidity: d.humidity, pressure: d.pressure, precip };
  });

  // Return current-day series
  return mapped;
}

// Sum precipitation over the last `days` days using history/daily endpoint
export async function fetchPrecipSumDays(days = 7, { units = 'm' } = {}) {
  if (!API_KEY || !STATION_ID) throw new Error('VITE_WU_API_KEY et VITE_WU_STATION_ID doivent être définies');
  const pad = (n) => String(n).padStart(2, '0');
  const toYMD = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  const url = withParams(`/v2/pws/history/daily`, {
    stationId: STATION_ID,
    format: 'json',
    apiKey: API_KEY,
    units,
    startDate: toYMD(start),
    endDate: toYMD(end),
  });

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erreur API history/daily');
    const json = await res.json();
    const obs = Array.isArray(json?.observations) ? json.observations : [];
    let sum = 0;
    for (const d of obs) {
      // Prefer explicit daily precip; fallback to precipTotal if provided
      const day = d.metric?.precipTotal ?? d.metric?.precip ?? d.imperial?.precipTotal ?? d.imperial?.precip ?? d.precipTotal ?? d.precip ?? 0;
      if (day != null && !isNaN(day)) sum += Number(day);
    }
    return sum;
  } catch (_) {
    return 0;
  }
}

// Gust highs from history/daily. Returns { value, when } where when is a Date or null.
export async function fetchGustHigh(days = 1, { units = 'm' } = {}) {
  if (!API_KEY || !STATION_ID) throw new Error('VITE_WU_API_KEY et VITE_WU_STATION_ID doivent être définies');
  const pad = (n) => String(n).padStart(2, '0');
  const toYMD = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  const url = withParams(`/v2/pws/history/daily`, {
    stationId: STATION_ID,
    format: 'json',
    apiKey: API_KEY,
    units,
    startDate: toYMD(start),
    endDate: toYMD(end),
  });

  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur API history/daily (gustHigh)');
  const json = await res.json();
  const obs = Array.isArray(json?.observations) ? json.observations : [];
  let max = null;
  let when = null;
  for (const d of obs) {
    const val = d.metric?.windgustHigh ?? d.imperial?.windgustHigh ?? d.windgustHigh;
    if (val != null && !isNaN(val)) {
      const n = Number(val);
      if (max == null || n > max) {
        max = n;
        // Try to capture time if provided. WU may include .windgustHighTime or .obsTimeUtc at daily peak level
        const t = d.windgustHighTime || d.obsTimeUtc || d.valid_time_gmt || d.epoch;
        when = t ? new Date(typeof t === 'number' ? t * 1000 : t) : null;
      }
    }
  }
  return { value: max, when };
}

export const fetchGustHighToday = (opts) => fetchGustHigh(1, opts);
export const fetchGustHigh7d = (opts) => fetchGustHigh(7, opts);
export const fetchGustHigh30d = (opts) => fetchGustHigh(30, opts);

// Sunrise/Sunset via met.no API (no key required) if lat/lon known; fallback to null
export async function fetchSunTimes(lat, lon, date = new Date()) {
  try {
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const url = `https://api.met.no/weatherapi/sunrise/3.0/sun?lat=${lat}&lon=${lon}&date=${yyyy}-${mm}-${dd}&offset=+01:00`;
    const res = await fetch(url, { headers: { 'User-Agent': 'LeBarobiou/1.0 (https://example.com)' } });
    if (!res.ok) return null;
    const json = await res.json();
    const first = json?.properties?.sunrise?.[0] || json?.properties;
    const sunrise = first?.sunrise?.time || first?.rise?.time;
    const sunset = first?.sunset?.time || first?.set?.time;
    return sunrise && sunset ? { sunrise: new Date(sunrise), sunset: new Date(sunset) } : null;
  } catch (_) {
    return null;
  }
}

// Moon info (phase, rise/set) via met.no sunrise API
export async function fetchMoonInfo(lat, lon, date = new Date()) {
    try {
        if (typeof lat !== 'number' || typeof lon !== 'number') return null;
        const yyyy = date.getUTCFullYear();
        const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(date.getUTCDate()).padStart(2, '0');
        const url = `https://api.met.no/weatherapi/sunrise/3.0/moon?lat=${lat}&lon=${lon}&date=${yyyy}-${mm}-${dd}&offset=+01:00`;
        const res = await fetch(url, { headers: { 'User-Agent': 'LeBarobiou/1.0 (https://example.com)' } });
        if (!res.ok) return null;
        const json = await res.json();
        const props = json?.properties || {};
        // Some responses embed arrays, handle both
        const src = props.moonrise?.[0] || props.moonset?.[0] || props.moonphase?.[0] || props;
        const rise = src?.moonrise?.time || src?.rise?.time || null;
        const set = src?.moonset?.time || src?.set?.time || null;
        const phaseFracRaw = src?.moonphase ?? NaN;
        const phaseFrac = Number(phaseFracRaw);
        const phaseName = isNaN(phaseFrac) ? null : (() => {
            const angle = phaseFrac % 360;
            if (angle === 0) return 'Nouvelle lune';
            if (angle > 0 && angle < 90) return 'Croissant';
            if (angle === 90) return 'Premier quartier';
            if (angle > 90 && angle < 180) return 'Presque pleine';
            if (angle === 180) return 'Pleine lune';
            if (angle > 180 && angle < 270) return 'Presque nouvelle';
            if (angle >= 270 && angle < 360) return 'Dernier croissant';
            return null;
        })();
        const phaseEmoji = (() => {
            switch (phaseName) {
                case "Nouvelle lune": return "🌑";
                case "Croissant": return "🌒";
                case "Premier quartier": return "🌓";
                case "Presque pleine": return "🌔";
                case "Pleine lune": return "🌕";
                case "Presque nouvelle": return "🌖";
                case "Dernier croissant": return "🌘";
                default: return "";
            }
        })();
        const illuminated = isNaN(phaseFrac) ? null : Math.round(phaseFrac * 1000) / 10; // percent with 1 decimal
        return {
            moonrise: rise ? new Date(rise) : null,
            moonset: set ? new Date(set) : null,
            phaseName,
            phaseEmoji,
            phaseValue: isNaN(phaseFrac) ? null : phaseFrac,
            illuminated,
        };
    } catch (_) {
        return null;
    }
}

// Lunar phase helpers: compute coarse phase and next new/full moon dates (approx.)
const SYNODIC_MONTH_DAYS = 29.530588853;
const MS_PER_DAY = 86400000;
// Known new moon reference: 2000-01-06 18:14 UTC
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14, 0, 0);

export function getMoonAgeDays(date = new Date()) {
  const t = date.getTime();
  const daysSinceRef = (t - NEW_MOON_REF) / MS_PER_DAY;
  let age = daysSinceRef % SYNODIC_MONTH_DAYS;
  if (age < 0) age += SYNODIC_MONTH_DAYS;
  return age;
}

export function getMoonPhaseInfo(date = new Date()) {
  const age = getMoonAgeDays(date);
  // Coarse categories requested
  const thresholds = {
    new: 0,
    firstQuarter: SYNODIC_MONTH_DAYS * 0.25,
    full: SYNODIC_MONTH_DAYS * 0.5,
    lastQuarter: SYNODIC_MONTH_DAYS * 0.75,
  };
  let phaseKey = 'new';
  if (age >= thresholds.lastQuarter - 1 && age < SYNODIC_MONTH_DAYS - 1) phaseKey = 'lastQuarter';
  else if (age >= thresholds.full - 1 && age < thresholds.lastQuarter - 1) phaseKey = 'full';
  else if (age >= thresholds.firstQuarter - 1 && age < thresholds.full - 1) phaseKey = 'firstQuarter';
  else phaseKey = 'new';

  const phaseName = ({
    new: 'Nouvelle lune',
    firstQuarter: 'Premier quartier',
    full: 'Pleine lune',
    lastQuarter: 'Dernier quartier',
  })[phaseKey];

  return { ageDays: age, phaseKey, phaseName };
}

export function getNextMoonPhases(fromDate = new Date()) {
  const age = getMoonAgeDays(fromDate);
  const cycle = SYNODIC_MONTH_DAYS;
  const half = cycle / 2;
  const daysToNextNew = (age === 0 ? 0 : cycle - age);
  const daysToNextFull = age <= half ? (half - age) : (cycle - age + half);
  const nextNew = new Date(fromDate.getTime() + daysToNextNew * MS_PER_DAY);
  const nextFull = new Date(fromDate.getTime() + daysToNextFull * MS_PER_DAY);
  return { nextNew, nextFull };
}

// Top gusts over the last 24 hours by combining yesterday and today (observations/all/1day)
export async function fetchTopGusts24h({ units = 'm' } = {}) {
  if (!API_KEY || !STATION_ID) throw new Error('VITE_WU_API_KEY et VITE_WU_STATION_ID doivent être définies');
  const buildUrl = () => withParams(`/v2/pws/observations/all/1day`, {
    stationId: STATION_ID,
    format: 'json',
    apiKey: API_KEY,
    units,
  });

  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Fetch today and yesterday in parallel
  const [resToday, resYday] = await Promise.all([
    fetch(buildUrl()),
    // For yesterday, Weather.com doesn't provide a direct param here; fallback to history/hourly if needed.
    // We will try using history/hourly to complement last night hours.
    fetch(withParams(`/v2/pws/history/hourly`, {
      stationId: STATION_ID,
      format: 'json',
      apiKey: API_KEY,
      units,
      // history/hourly requires a date param YYYYMMDD
      date: `${cutoff.getFullYear()}${String(cutoff.getMonth() + 1).padStart(2, '0')}${String(cutoff.getDate()).padStart(2, '0')}`,
    }))
  ]);

  if (!resToday.ok) throw new Error('Erreur API observations/all/1day (gusts)');
  const todayJson = await resToday.json();
  const todayObs = Array.isArray(todayJson?.observations) ? todayJson.observations : [];

  let ydayObs = [];
  if (resYday.ok) {
    try {
      const yj = await resYday.json();
      ydayObs = Array.isArray(yj?.observations) ? yj.observations : [];
    } catch {}
  }

  const mapGust = (h) => {
    const ts = h.obsTimeUtc ? new Date(h.obsTimeUtc) : (h.epoch ? new Date(h.epoch * 1000) : null);
    const gust = h.metric?.windGust ?? h.imperial?.windGust ?? h.windGust ?? h.metric?.windGustMax ?? h.imperial?.windGustMax ?? h.windGustMax ?? null;
    return { ts, gust: gust != null ? Number(gust) : null };
  };

  const series = [...ydayObs, ...todayObs]
    .map(mapGust)
    .filter(d => d.ts instanceof Date && !isNaN(d.ts) && d.gust != null && !isNaN(d.gust) && d.ts >= cutoff)
    .sort((a, b) => b.gust - a.gust);

  return series; // caller can slice top 3
}
