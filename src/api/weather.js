const API_BASE = 'https://api.weather.com';
const API_KEY = import.meta.env.VITE_WU_API_KEY;
const STATION_ID = import.meta.env.VITE_WU_STATION_ID;

// Helpers
const withParams = (path, params) => {
  const url = new URL(path, API_BASE);
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
  const url = withParams(`/v2/pws/observations/hourly`, {
    stationId: STATION_ID,
    format: 'json',
    apiKey: API_KEY,
    units,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur API hourly');
  const data = await res.json();
  const hours = data?.observations || [];
  return hours.map(h => ({
    ts: new Date(h.obsTimeUtc),
    temp: h.metric?.tempAvg ?? h.imperial?.tempAvg ?? h.tempAvg ?? h.metric?.temp ?? h.temp,
    humidity: h.humidityAvg ?? h.humidity,
  })).slice(-24);
}

// Sunrise/Sunset via met.no API (no key required) if lat/lon known; fallback to null
export async function fetchSunTimes(lat, lon, date = new Date()) {
  try {
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const url = `https://api.met.no/weatherapi/sunrise/3.0/sun?lat=${lat}&lon=${lon}&date=${yyyy}-${mm}-${dd}&offset=+00:00`;
    const res = await fetch(url, { headers: { 'User-Agent': 'LeBarobiou/1.0' } });
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
