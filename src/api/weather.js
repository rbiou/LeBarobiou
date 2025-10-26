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

const pad = (n) => String(n).padStart(2, '0');
const toYMD = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

const precipHistoryCache = new Map();
const sunCache = new Map();
const moonCache = new Map();
const hourly7dCache = new Map();

const toNumber = (val) => {
  if (val === undefined || val === null) return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

const pickNumeric = (...candidates) => {
  for (const candidate of candidates) {
    const num = toNumber(candidate);
    if (num !== null) return num;
  }
  return null;
};

const getTimezoneDateParts = (date, timeZone = 'Europe/Paris') => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [{ value: year }, , { value: month }, , { value: day }] = formatter.formatToParts(date);
  return { year, month, day, iso: `${year}-${month}-${day}` };
};

const getTimezoneOffsetString = (date, timeZone = 'Europe/Paris') => {
  // compute offset minutes by comparing UTC vs timezone date
  const utcDate = new Date(date);
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  const offsetMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = pad(Math.floor(abs / 60));
  const minutes = pad(abs % 60);
  return `${sign}${hours}:${minutes}`;
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
  const prelim = allObs.map((h) => {
    const metric = h.metric || {}
    const imperial = h.imperial || {}

    const pressureMin = pickNumeric(metric.pressureMin, metric.pressureMinAvg, h.pressureMin, h.pressureMinAvg)
    const pressureMax = pickNumeric(metric.pressureMax, metric.pressureMaxAvg, h.pressureMax, h.pressureMaxAvg)
    const pressureAvgBase = pickNumeric(
      metric.pressure,
      metric.pressureAvg,
      imperial.pressure,
      imperial.pressureAvg,
      h.pressure,
      h.pressureAvg
    )
    const pressureValue = (pressureMin !== null && pressureMax !== null)
      ? (pressureMin + pressureMax) / 2
      : pressureAvgBase

    return {
      ts: h.obsTimeUtc ? new Date(h.obsTimeUtc) : (h.epoch ? new Date(h.epoch * 1000) : null),
      temp: pickNumeric(
        metric.temp,
        metric.tempAvg,
        h.temp,
        h.tempAvg,
        imperial.temp,
        imperial.tempAvg
      ),
      humidity: pickNumeric(
        h.humidity,
        h.humidityAvg,
        metric.humidity,
        metric.humidityAvg
      ),
      pressure: pressureValue,
      pressureMin,
      pressureMax,
      precipRate: pickNumeric(
        metric.precipRate,
        metric.precipRateAvg,
        h.precipRate,
        h.precipRateAvg,
        imperial.precipRate,
        imperial.precipRateAvg,
        metric.precip,
        h.precip,
        imperial.precip
      ),
      precipTotal: pickNumeric(
        metric.precipTotal,
        h.precipTotal,
        imperial.precipTotal
      ),
    }
  })
  .filter((d) => d.ts instanceof Date && !isNaN(d.ts))
  .sort((a, b) => a.ts - b.ts);

  // Compute per-interval precipitation from cumulative totals; fallback to rate*time
  let prevCum = null;
  let prevDateKey = null;
  let prevTs = null;
  const mapped = prelim.map((d) => {
    let precip = 0;
    const dateKey = d.ts instanceof Date ? d.ts.toISOString().slice(0, 10) : prevDateKey;
    const cum = d.precipTotal != null ? Number(d.precipTotal) : null;
    if (cum != null) {
      if (prevCum == null || cum < prevCum || dateKey !== prevDateKey) {
        precip = cum;
      } else {
        precip = cum - prevCum;
      }
      prevCum = cum;
      prevDateKey = dateKey;
    } else {
      const dtMin = prevTs ? (d.ts - prevTs) / 60000 : 5; // assume 5 minutes if unknown
      const rate = d.precipRate != null ? Number(d.precipRate) : 0;
      precip = rate * (dtMin / 60);
    }
    prevTs = d.ts;
    const intervalPrecip = Math.max(Number.isFinite(precip) ? precip : 0, 0);
    return {
      ts: d.ts,
      temp: d.temp,
      humidity: d.humidity,
      pressure: d.pressure,
      pressureMin: d.pressureMin,
      pressureMax: d.pressureMax,
      precip: intervalPrecip,
      precipAmount: intervalPrecip,
    };
  });

  // Return current-day series
  return mapped;
}

export async function fetchHourly7Day({ units = 'm' } = {}) {
  if (!API_KEY || !STATION_ID) throw new Error('VITE_WU_API_KEY et VITE_WU_STATION_ID doivent être définies');
  const cacheKey = `7day:${units}`;
  if (hourly7dCache.has(cacheKey)) return hourly7dCache.get(cacheKey);

  const url = withParams(`/v2/pws/observations/hourly/7day`, {
    stationId: STATION_ID,
    format: 'json',
    apiKey: API_KEY,
    units,
  });

  const request = (async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erreur API observations/hourly/7day');
    const json = await res.json();
    const obs = Array.isArray(json?.observations) ? json.observations : [];

    const prelim = obs
      .map((h) => {
        const metric = h.metric || {};
        const imperial = h.imperial || {};
        const pressureMin = pickNumeric(
          metric.pressureMin,
          metric.pressureMinAvg,
          h.pressureMin,
          h.pressureMinAvg
        );
        const pressureMax = pickNumeric(
          metric.pressureMax,
          metric.pressureMaxAvg,
          h.pressureMax,
          h.pressureMaxAvg
        );
        const pressureValue = (pressureMin != null && pressureMax != null)
          ? (pressureMin + pressureMax) / 2
          : pickNumeric(metric.pressure, metric.pressureAvg, imperial.pressure, imperial.pressureAvg, h.pressure, h.pressureAvg);
        return {
          ts: h.obsTimeUtc ? new Date(h.obsTimeUtc) : (h.epoch ? new Date(h.epoch * 1000) : null),
          temp: pickNumeric(metric.temp, metric.tempAvg, h.temp, h.tempAvg, imperial.temp, imperial.tempAvg),
          humidity: pickNumeric(h.humidity, h.humidityAvg, metric.humidity, metric.humidityAvg),
          pressure: pressureValue,
          precipTotal: pickNumeric(
            metric.precipTotal,
            h.precipTotal,
            imperial.precipTotal
          ),
          precipRate: pickNumeric(
            metric.precipRate,
            metric.precip,
            h.precipRate,
            h.precip,
            imperial.precipRate,
            imperial.precip
          ),
        };
      })
      .filter((d) => d.ts instanceof Date && !Number.isNaN(d.ts.getTime()))
      .sort((a, b) => a.ts - b.ts);

    let prevCum = null;
    let prevDateKey = null;
    const mapped = prelim.map((d) => {
      let precip = 0;
      const dateKey = d.ts instanceof Date ? d.ts.toISOString().slice(0, 10) : prevDateKey;
      const cum = d.precipTotal != null ? Number(d.precipTotal) : null;
      if (cum != null) {
        if (prevCum == null || cum < prevCum || dateKey !== prevDateKey) {
          precip = cum;
        } else {
          precip = cum - prevCum;
        }
        prevCum = cum;
        prevDateKey = dateKey;
      } else {
        const rate = d.precipRate != null ? Number(d.precipRate) : 0;
        precip = rate;
      }
      const intervalPrecip = Math.max(Number.isFinite(precip) ? precip : 0, 0);
      return {
        ts: d.ts,
        temp: d.temp,
        humidity: d.humidity,
        pressure: d.pressure,
        precip: intervalPrecip,
        precipAmount: intervalPrecip,
      };
    });

    return mapped;
  })();

  hourly7dCache.set(cacheKey, request);
  return request;
}

// Precipitation history with caching to avoid duplicate network requests
async function fetchPrecipHistoryRange({ startDate, endDate, units = 'm' } = {}) {
  if (!API_KEY || !STATION_ID) throw new Error('VITE_WU_API_KEY et VITE_WU_STATION_ID doivent être définies');
  if (!startDate || !endDate) throw new Error('startDate et endDate sont requis');

  const cacheKey = `${startDate}:${endDate}:${units}`;
  if (precipHistoryCache.has(cacheKey)) return precipHistoryCache.get(cacheKey);

  const url = withParams(`/v2/pws/history/daily`, {
    stationId: STATION_ID,
    format: 'json',
    apiKey: API_KEY,
    units,
    startDate,
    endDate,
  });

  const request = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erreur API history/daily');
      const json = await res.json();
      const obs = Array.isArray(json?.observations) ? json.observations : [];
      return obs
        .map((d) => {
          const precipTotal =
            d.metric?.precipTotal ??
            d.metric?.precip ??
            d.imperial?.precipTotal ??
            d.imperial?.precip ??
            d.precipTotal ??
            d.precip ??
            0;
          const tempAvg = pickNumeric(
            d.metric?.tempAvg,
            d.metric?.temperatureAvg,
            d.metric?.tempMean,
            d.metric?.tempHigh,
            d.metric?.tempLow,
            d.tempAvg,
            d.temperatureAvg,
            d.tempMean,
            d.tempHigh,
            d.tempLow
          );
          const tempHigh = pickNumeric(
            d.metric?.tempHigh,
            d.metric?.temperatureHigh,
            d.tempHigh,
            d.temperatureHigh
          );
        const tempLow = pickNumeric(
          d.metric?.tempLow,
          d.metric?.temperatureLow,
          d.tempLow,
          d.temperatureLow
        );
        const pressureMin = pickNumeric(
          d.metric?.pressureMin,
          d.metric?.pressureMinAvg,
          d.pressureMin
        );
        const pressureMax = pickNumeric(
          d.metric?.pressureMax,
          d.metric?.pressureMaxAvg,
          d.pressureMax
        );
        const humidityAvg = pickNumeric(
          d.metric?.humidityAvg,
          d.humidityAvg,
          d.humidity
        );
        const pressureAvg = (pressureMin != null && pressureMax != null)
          ? (pressureMin + pressureMax) / 2
          : pickNumeric(
            d.metric?.pressureAvg,
            d.metric?.pressureMean,
            d.metric?.pressure,
            d.pressureAvg,
            d.pressure
          );
        const ts =
          (typeof d.obsTimeUtc === 'string' && d.obsTimeUtc) ? new Date(d.obsTimeUtc) :
          (typeof d.valid_time_gmt === 'number') ? new Date(d.valid_time_gmt * 1000) :
          (typeof d.epoch === 'number') ? new Date(d.epoch * 1000) :
            null;
          const date = ts && !Number.isNaN(ts.getTime()) ? ts : null;
          return {
            date,
            precipTotal: Number.isFinite(Number(precipTotal)) ? Number(precipTotal) : 0,
            tempAvg: tempAvg,
            tempHigh: tempHigh,
            tempLow: tempLow,
            humidityAvg: humidityAvg,
            pressureAvg: pressureAvg,
          };
        })
        .filter((entry) => entry.date instanceof Date && !Number.isNaN(entry.date.getTime()))
        .sort((a, b) => a.date - b.date);
    } catch (err) {
      throw err;
    }
  })();

  precipHistoryCache.set(cacheKey, request);
  return request;
}

export async function fetchPrecipHistoryDays(days = 30, { units = 'm' } = {}) {
  if (days <= 0) return [];
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  return fetchPrecipHistoryRange({
    startDate: toYMD(start),
    endDate: toYMD(end),
    units,
  });
}

// Sum precipitation over the last `days` days using cached history
export async function fetchPrecipSumDays(days = 7, { units = 'm' } = {}) {
  try {
    const history = await fetchPrecipHistoryDays(days, { units });
    return history.reduce((sum, entry) => sum + (entry.precipTotal ?? 0), 0);
  } catch {
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
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) return null;
    const { iso } = getTimezoneDateParts(dateObj, 'Europe/Paris');
    const cacheKey = `${lat}:${lon}:${iso}:sun`;
    if (sunCache.has(cacheKey)) return sunCache.get(cacheKey);

    const offset = getTimezoneOffsetString(dateObj, 'Europe/Paris');
    const url = `https://api.met.no/weatherapi/sunrise/3.0/sun?lat=${lat}&lon=${lon}&date=${iso}&offset=${offset}`;

    const request = (async () => {
      const res = await fetch(url, { headers: { 'User-Agent': 'LeBarobiou/1.0 (https://example.com)' } });
      if (!res.ok) return null;
      const json = await res.json();
      const first = json?.properties?.sunrise?.[0] || json?.properties;
      const sunrise = first?.sunrise?.time || first?.rise?.time;
      const sunset = first?.sunset?.time || first?.set?.time;
      return sunrise && sunset ? { sunrise: new Date(sunrise), sunset: new Date(sunset) } : null;
    })();

    sunCache.set(cacheKey, request);
    return request;
  } catch (_) {
    return null;
  }
}

// Moon info (phase, rise/set) via met.no sunrise API
export async function fetchMoonInfo(lat, lon, date = new Date()) {
  try {
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) return null;
    const { iso } = getTimezoneDateParts(dateObj, 'Europe/Paris');
    const cacheKey = `${lat}:${lon}:${iso}:moon`;
    if (moonCache.has(cacheKey)) return moonCache.get(cacheKey);

    const offset = getTimezoneOffsetString(dateObj, 'Europe/Paris');
    const url = `https://api.met.no/weatherapi/sunrise/3.0/moon?lat=${lat}&lon=${lon}&date=${iso}&offset=${offset}`;

    const request = (async () => {
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
          case 'Nouvelle lune': return '🌑';
          case 'Croissant': return '🌒';
          case 'Premier quartier': return '🌓';
          case 'Presque pleine': return '🌔';
          case 'Pleine lune': return '🌕';
          case 'Presque nouvelle': return '🌖';
          case 'Dernier croissant': return '🌘';
          default: return '';
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
    })();

    moonCache.set(cacheKey, request);
    return request;
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
