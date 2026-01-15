
const API_BASE = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch forecast from Open-Meteo
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} [model='auto'] - Weather model to use
 * @returns {Promise<Object>} Forecast data
 */
export async function fetchForecast(lat, lon, model = 'auto') {
    if (!lat || !lon) return null;

    const url = new URL(API_BASE);
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('hourly', 'temperature_2m,weather_code,precipitation_probability');
    url.searchParams.set('timezone', 'auto');

    // Set model if not auto
    if (model && model !== 'auto') {
        url.searchParams.set('models', model);
    }
    // If auto, we don't set 'models', Open-Meteo uses best_match by default, 
    // OR native default which is usually what we want. 
    // HOWEVER, the user previous code had 'meteofrance_seamless' hardcoded.
    // If the user wants 'auto' to mean 'best possible for location', omitting 'models' is correct.

    try {
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Open-Meteo API error');
        const data = await res.json();
        return formatForecastData(data);
    } catch (error) {
        console.error('Error fetching forecast:', error);
        return null;
    }
}

function formatForecastData(data) {
    if (!data || !data.hourly) return null;

    const { time, weather_code, temperature_2m, precipitation_probability } = data.hourly;
    const dailyForecasts = [];
    const usedDates = new Set();

    // Helper to aggregate period data
    const getPeriodData = (indices, type) => {
        if (!indices.length) return null;

        // Temperature: Min for morning, Max for afternoon
        const temps = indices.map(i => temperature_2m[i]);
        const temp = type === 'morning' ? Math.min(...temps) : Math.max(...temps);

        // Precip Probability: Max over period
        const probs = indices.map(i => precipitation_probability[i]);
        const maxProb = Math.max(...probs);

        // Dominant Weather Code (Worst case priority)
        // Groups: Thunderstorm(9x) > Snow(7x,85,86) > Rain(5x,6x,80,81,82) > Fog(4x) > Cloud(1,2,3) > Sun(0)
        // We collect all codes in the period
        const codes = indices.map(i => weather_code[i]);

        // Priority check
        let dominantCode = 0; // Default sun
        // Check for severe weather first
        if (codes.some(c => c >= 95)) dominantCode = codes.find(c => c >= 95); // Thunderstorm
        else if (codes.some(c => c >= 71 && c <= 77 || c === 85 || c === 86)) dominantCode = codes.find(c => (c >= 71 && c <= 77) || c === 85 || c === 86); // Snow
        else if (codes.some(c => (c >= 51 && c <= 67) || (c >= 80 && c <= 82))) {
            // Variable Rain: Only if probability warrants it or if it's persistent
            // If we have rain codes but maxProb is low (<20%), maybe ignore? 
            // For safety outdoors, if code says rain, we show rain.
            dominantCode = codes.find(c => (c >= 51 && c <= 67) || (c >= 80 && c <= 82));
        }
        else if (codes.some(c => c === 45 || c === 48)) dominantCode = 45; // Fog
        else if (codes.some(c => c === 3)) dominantCode = 3; // Overcast
        else if (codes.some(c => c === 2)) dominantCode = 2; // Partly cloudy
        else if (codes.some(c => c === 1)) dominantCode = 1; // Mainly clear
        else dominantCode = 0; // Clear

        return {
            temp,
            weatherCode: dominantCode,
            precipProb: maxProb
        };
    };

    // Group indices by day and period
    const daysMap = new Map();

    time.forEach((t, index) => {
        const dateObj = new Date(t);
        const dateStr = dateObj.toDateString();
        const hour = dateObj.getHours();

        if (!daysMap.has(dateStr)) {
            daysMap.set(dateStr, { date: dateObj, morningIndices: [], afternoonIndices: [], allIndices: [] });
        }
        const day = daysMap.get(dateStr);

        day.allIndices.push(index); // Capture all hours for daily stats

        // Morning: 06:00 to 11:00 (inclusive)
        if (hour >= 6 && hour < 12) {
            day.morningIndices.push(index);
        }
        // Afternoon: 12:00 to 17:00 (inclusive)
        else if (hour >= 12 && hour < 18) {
            day.afternoonIndices.push(index);
        }
    });

    daysMap.forEach((value) => {
        const morning = getPeriodData(value.morningIndices, 'morning');
        const afternoon = getPeriodData(value.afternoonIndices, 'afternoon');

        // Calculate full day min/max from all available hours for this day
        // We need indices for the whole day (all hours present in the API response for this date)
        // Since we iterate 'time', we can just collect all indices for the day in the first loop.
        const allDayIndices = [...value.morningIndices, ...value.afternoonIndices];
        // Note: morning/afternoon indices only cover 6-18h. We should capture ALL hours for true min/max.
        // Let's rely on the fact that we can just re-scan or store them.
        // Better: let's treat the daily min/max correctly.

        // Improve: Collect all indices for the day in the initial loop
        const dayTemps = value.allIndices.map(i => temperature_2m[i]);
        const dayTempMin = Math.min(...dayTemps);
        const dayTempMax = Math.max(...dayTemps);

        // Collect hourly details for the day
        const hours = value.allIndices.map(i => ({
            time: time[i], // ISO string
            temp: temperature_2m[i],
            weatherCode: weather_code[i],
            precipProb: precipitation_probability[i]
        }));

        // Check if we have valid data for all hours (no nulls)
        const hasValidData = value.allIndices.every(i => temperature_2m[i] !== null && temperature_2m[i] !== undefined);

        // Only add if we have BOTH morning AND afternoon periods AND full day data (24h) AND valid values
        if (morning && afternoon && value.allIndices.length >= 24 && hasValidData) {
            dailyForecasts.push({
                date: value.date,
                dayTempMin,
                dayTempMax,
                morning,
                afternoon,
                hours // Attach full hourly data
            });
        }
    });

    return dailyForecasts.slice(0, 16);
}

/**
 * Map WMO weather codes to icon names (compatible with react-icons/wi)
 * or description keys.
 */
export const getWeatherInfo = (code) => {
    // Helper for common styles
    const styles = {
        sun: 'text-yellow-500 drop-shadow-glow-yellow animate-pulse-slow',
        cloud: 'text-gray-400 dark:text-gray-300 drop-shadow-sm',
        rain: 'text-blue-500 drop-shadow-glow-blue',
        snow: 'text-blue-200 drop-shadow-glow-white',
        storm: 'text-purple-500 animate-pulse',
        fog: 'text-gray-500 dark:text-gray-400 opacity-80',
    };

    switch (code) {
        case 0: return { icon: 'WiDaySunny', label: 'forecast.clear', style: styles.sun };
        case 1: return { icon: 'WiDaySunnyOvercast', label: 'forecast.mainly_clear', style: 'text-yellow-400 dark:text-yellow-300' };
        case 2: return { icon: 'WiDayCloudy', label: 'forecast.partly_cloudy', style: 'text-gray-400' };
        case 3: return { icon: 'WiCloudy', label: 'forecast.overcast', style: styles.cloud };
        case 45: case 48: return { icon: 'WiFog', label: 'forecast.fog', style: styles.fog };
        case 51: case 53: case 55: return { icon: 'WiSprinkle', label: 'forecast.drizzle', style: styles.rain };
        case 56: case 57: return { icon: 'WiRainMix', label: 'forecast.freezing_drizzle', style: styles.rain };
        case 61: return { icon: 'WiRain', label: 'forecast.rain_slight', style: styles.rain };
        case 63: return { icon: 'WiRain', label: 'forecast.rain_moderate', style: styles.rain };
        case 65: return { icon: 'WiRain', label: 'forecast.rain_heavy', style: styles.rain };
        case 66: case 67: return { icon: 'WiRainMix', label: 'forecast.freezing_rain', style: styles.rain };
        case 71: return { icon: 'WiSnow', label: 'forecast.snow_slight', style: styles.snow };
        case 73: return { icon: 'WiSnow', label: 'forecast.snow_moderate', style: styles.snow };
        case 75: return { icon: 'WiSnow', label: 'forecast.snow_heavy', style: styles.snow };
        case 77: return { icon: 'WiSnow', label: 'forecast.snow_grains', style: styles.snow };
        case 80: case 81: case 82: return { icon: 'WiShowers', label: 'forecast.rain_showers', style: styles.rain };
        case 85: case 86: return { icon: 'WiSnow', label: 'forecast.snow_showers', style: styles.snow };
        case 95: return { icon: 'WiThunderstorm', label: 'forecast.thunderstorm', style: styles.storm };
        case 96: case 99: return { icon: 'WiStormShowers', label: 'forecast.thunderstorm_hail', style: styles.storm };
        default: return { icon: 'WiNa', label: 'forecast.unknown', style: 'text-text-muted' };
    }
};
