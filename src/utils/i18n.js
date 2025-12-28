// Internationalization utility for LeBarobiou

const translations = {
    fr: {
        // App
        'app.title': 'Le Barobiou',
        'app.lastUpdate': 'Dernière mise à jour',
        'app.loading': 'Chargement...',
        'app.install': 'Installer',
        'app.updated': 'Mis à jour !',
        'app.footer': 'Données via Weather Underground',
        'app.refreshing': 'Mise à jour...',
        'app.releaseToRefresh': 'Relâcher pour actualiser',
        'app.pullToRefresh': 'Tirer pour actualiser',
        'app.refresh': 'Actualiser',
        'app.unknownError': 'Erreur inconnue',

        // Settings
        'settings.title': 'Réglages',
        'settings.back': 'Retour',
        'settings.language': 'Langue',
        'settings.language.auto': 'Automatique',
        'settings.language.fr': 'Français',
        'settings.language.en': 'English',
        'settings.blocs': 'Blocs affichés',
        'settings.blocs.weatherCards': 'Mesures et tendances',
        'settings.blocs.precipitation': 'Précipitations',
        'settings.blocs.wind': 'Vent',
        'settings.blocs.sunMoon': 'Soleil & Lune',
        'settings.blocs.chart': 'Graphique',
        'settings.chart': 'Réglages du graphique',
        'settings.chart.defaults': 'Données par défaut',
        'settings.chart.defaultsDesc': 'Cochez les données à afficher au chargement.',
        'settings.chart.selectable': 'Données sélectionnables',
        'settings.chart.selectableDesc': 'Cochez les données à rendre disponibles dans la légende du graphique.',
        'settings.chart.legend': 'Données disponibles',
        'settings.chart.showTempExtremes': 'Labels min/max',
        'settings.chart.unavailable': 'Non disponible',

        // Date
        'date.today': "Aujourd'hui",
        'date.tomorrow': "Demain",
        'date.in_days': "Dans {days} jours",

        // Weather cards
        'weather.temperature': 'Température',
        'weather.humidity': 'Humidité',
        'weather.pressure': 'Pression',
        'weather.trend': 'sur 1h',
        'weather.min': 'Min jour',
        'weather.max': 'Max jour',
        'weather.at': 'à',

        // Precipitation
        'precip.title': 'Précipitations',
        'precip.radar_title': 'Radar de précipitations',
        'precip.source': 'Source RainViewer',
        'precip.last_update': 'Dernière mesure radar à',
        'precip.mm': 'mm',
        'precip.titles.now': 'En ce moment',
        'precip.titles.hour': 'Prochaine heure',
        'precip.titles.today': 'Aujourd’hui',
        'precip.status.wet': 'Pluie en cours',
        'precip.status.dry': 'Pas de pluie',
        'precip.status.noRainDesc': 'Aucune pluie observée récemment.',
        'precip.status.detected': 'Pluie détectée à :',
        'precip.status.detected': 'Pluie détectée à :',
        'precip.updating': 'Mise à jour…',
        'precip.cumToday': 'Cumul aujourd\'hui',
        'precip.sinceMidnight': 'Depuis minuit',
        'precip.cum7d': 'Cumul 7 jours',
        'precip.last7days': 'Derniers 7 jours',
        'precip.cum30d': 'Cumul 30 jours',
        'precip.last30days': 'Derniers 30 jours',

        // Radar
        'radar.loading': 'Chargement des observations radar…',
        'radar.speed.slow': 'Lent',
        'radar.speed.normal': 'Normal',
        'radar.speed.fast': 'Rapide',
        'radar.lightning': 'Éclairs',

        // Wind
        'wind.title': 'Vent',
        'wind.subtitle': 'Live + Rafales max',
        'wind.speed': 'Vitesse',
        'wind.unit': 'km/h',
        'wind.gust': 'raf.',
        'wind.gust_today': 'Rafale max du jour',
        'wind.gust_7d': 'Rafale max 7 jours',
        'wind.gust_30d': 'Rafale max 1 mois',

        // Sun/Moon
        'sun.title': 'Soleil & Lune',
        'sun.today_range': 'Aujourd’hui : {start} → {end}',
        'sun.sun_title': 'Soleil',
        'sun.duration': 'Durée',
        'sun.rise': 'Lever',
        'sun.set': 'Coucher',
        'sun.summary': 'Le soleil s’est levé aujourd’hui à {rise}, se couchera à {set}, et se lèvera demain à {tomorrow_rise}.',
        'sun.unavailable': 'Informations solaires indisponibles.',
        'sun.tomorrow': 'Demain',

        'moon.moon_title': 'Lune',
        'moon.next_full': 'Prochaine pleine lune',
        'moon.next_new': 'Prochaine nouvelle lune',
        'moon.phase_unknown': 'Phase inconnue',
        'moon.waxing': 'Lune croissante',
        'moon.waning': 'Lune décroissante',
        'moon.phase.new': 'Nouvelle lune',
        'moon.phase.waxingCrescent': 'Croissant',
        'moon.phase.firstQuarter': 'Premier quartier',
        'moon.phase.waxingGibbous': 'Presque pleine',
        'moon.phase.full': 'Pleine lune',
        'moon.phase.waningGibbous': 'Presque nouvelle',
        'moon.phase.waningCrescent': 'Dernier croissant',

        'sun.night': 'Nuit',
        'sun.beforeSunrise': 'Aube',
        'sun.morning': 'Matin',
        'sun.afternoon': 'Après-midi',
        'sun.evening': 'Soirée',

        // Theme
        'theme.title': 'Thème',
        'theme.light': 'Clair',
        'theme.dark': 'Sombre',
        'theme.system': 'Système',

        // Chart
        'chart.title': 'Aperçu',
        'chart.loading': 'Chargement du graphique...',
        'chart.error': 'Erreur de chargement',
        'chart.series.temperature': 'Température (°C)',
        'chart.series.humidity': 'Humidité (%)',
        'chart.series.pressure': 'Pression (hPa)',
        'chart.series.precipCheck': 'Précipitations (mm)',
        'chart.series.precipRate': 'Intensité (mm/h)',
        'chart.series.precipCum': 'Cumul pluie (mm)',
        'chart.range.day': '24h',
        'chart.range.week': '7j',
        'chart.range.week': '7j',
        'chart.range.month': '30j',
        'chart.date': 'Date',
        'chart.time': 'Heure',
        'chart.tempMin': 'Temp. Min',
        'chart.tempMax': 'Temp. Max',
        'chart.todayDesc': 'Prévisions sur 24h',
        'chart.7daysDesc': 'Historique 7 jours',
        'chart.30daysDesc': 'Historique 30 jours',
        'chart.fullscreen': 'Plein écran',
        'chart.exitFullscreen': 'Quitter plein écran',
        'chart.noData': 'Aucune donnée disponible pour cette période.',
    },
    en: {
        // App
        'app.title': 'Le Barobiou',
        'app.lastUpdate': 'Last update',
        'app.loading': 'Loading...',
        'app.install': 'Install',
        'app.updated': 'Updated!',
        'app.footer': 'Data via Weather Underground',
        'app.refreshing': 'Updating...',
        'app.releaseToRefresh': 'Release to refresh',
        'app.pullToRefresh': 'Pull to refresh',
        'app.refresh': 'Refresh',
        'app.unknownError': 'Unknown error',

        // Settings
        'settings.title': 'Settings',
        'settings.back': 'Back',
        'settings.language': 'Language',
        'settings.language.auto': 'Automatic',
        'settings.language.fr': 'Français',
        'settings.language.en': 'English',
        'settings.blocs': 'Displayed Sections',
        'settings.blocs.weatherCards': 'Metrics & Trends',
        'settings.blocs.precipitation': 'Precipitation',
        'settings.blocs.wind': 'Wind',
        'settings.blocs.sunMoon': 'Sun & Moon',
        'settings.blocs.chart': 'Chart',
        'settings.chart': 'Chart Settings',
        'settings.chart.defaults': 'Default Data',
        'settings.chart.defaultsDesc': 'Check data to show on load.',
        'settings.chart.selectable': 'Selectable Data',
        'settings.chart.selectableDesc': 'Check the data to make available in the chart legend.',
        'settings.chart.legend': 'Available Data',
        'settings.chart.showTempExtremes': 'Min/Max labels',
        'settings.chart.unavailable': 'Unavailable',

        // Date
        'date.today': "Today",
        'date.tomorrow': "Tomorrow",
        'date.in_days': "In {days} days",

        // Weather cards
        'weather.temperature': 'Temperature',
        'weather.humidity': 'Humidity',
        'weather.pressure': 'Pressure',
        'weather.trend': '1h trend',
        'weather.min': 'Daily Low',
        'weather.max': 'Daily High',
        'weather.at': 'at',

        // Precipitation
        'precip.title': 'Precipitation',
        'precip.radar_title': 'Rain Radar',
        'precip.source': 'Source RainViewer',
        'precip.last_update': 'Last radar update at',
        'precip.mm': 'mm',
        'precip.titles.now': 'Right Now',
        'precip.titles.hour': 'Next Hour',
        'precip.titles.today': 'Today',
        'precip.status.wet': 'Raining',
        'precip.status.dry': 'No Rain',
        'precip.status.noRainDesc': 'No rain observed recently.',
        'precip.status.detected': 'Rain detected at:',
        'precip.updating': 'Updating…',
        'precip.cumToday': 'Accumulation Today',
        'precip.sinceMidnight': 'Since midnight',
        'precip.cum7d': '7-Day Accumulation',
        'precip.last7days': 'Last 7 days',
        'precip.cum30d': '30-Day Accumulation',
        'precip.last30days': 'Last 30 days',

        // Radar
        'radar.loading': 'Loading radar data…',
        'radar.speed.slow': 'Slow',
        'radar.speed.normal': 'Normal',
        'radar.speed.fast': 'Fast',
        'radar.lightning': 'Lightning',

        // Wind
        'wind.title': 'Wind',
        'wind.subtitle': 'Live + Max Gusts',
        'wind.speed': 'Speed',
        'wind.unit': 'km/h',
        'wind.gust': 'gust',
        'wind.gust_today': 'Max gust today',
        'wind.gust_7d': 'Max gust 7 days',
        'wind.gust_30d': 'Max gust 1 month',

        // Sun/Moon
        'sun.title': 'Sun & Moon',
        'sun.today_range': 'Today: {start} → {end}',
        'sun.sun_title': 'Sun',
        'sun.duration': 'Duration',
        'sun.rise': 'Sunrise',
        'sun.set': 'Sunset',
        'sun.summary': 'The sun rose today at {rise}, will set at {set}, and will rise tomorrow at {tomorrow_rise}.',
        'sun.unavailable': 'Solar info unavailable.',
        'sun.tomorrow': 'Tomorrow',

        'moon.moon_title': 'Moon',
        'moon.next_full': 'Next Full Moon',
        'moon.next_new': 'Next New Moon',
        'moon.phase_unknown': 'Unknown Phase',
        'moon.waxing': 'Waxing',
        'moon.waning': 'Waning',
        'moon.phase.new': 'New Moon',
        'moon.phase.waxingCrescent': 'Waxing Crescent',
        'moon.phase.firstQuarter': 'First Quarter',
        'moon.phase.waxingGibbous': 'Waxing Gibbous',
        'moon.phase.full': 'Full Moon',
        'moon.phase.waningGibbous': 'Waning Gibbous',
        'moon.phase.waningCrescent': 'Waning Crescent',

        'sun.night': 'Night',
        'sun.beforeSunrise': 'Dawn',
        'sun.morning': 'Morning',
        'sun.afternoon': 'Afternoon',
        'sun.evening': 'Evening',

        // Theme
        'theme.title': 'Theme',
        'theme.light': 'Light',
        'theme.dark': 'Dark',
        'theme.system': 'System',

        // Chart
        'chart.title': 'Overview',
        'chart.loading': 'Loading chart...',
        'chart.error': 'Error loading chart',
        'chart.series.temperature': 'Temperature (°C)',
        'chart.series.humidity': 'Humidity (%)',
        'chart.series.pressure': 'Pressure (hPa)',
        'chart.series.precipCheck': 'Precipitation (mm)',
        'chart.series.precipRate': 'Intensity (mm/h)',
        'chart.series.precipCum': 'Rain Accumulation (mm)',
        'chart.range.day': '24h',
        'chart.range.week': '7d',
        'chart.range.week': '7d',
        'chart.range.month': '30d',
        'chart.date': 'Date',
        'chart.time': 'Time',
        'chart.tempMin': 'Min Temp',
        'chart.tempMax': 'Max Temp',
        'chart.todayDesc': '24h Forecast',
        'chart.7daysDesc': '7-Day History',
        'chart.30daysDesc': '30-Day History',
        'chart.fullscreen': 'Fullscreen',
        'chart.exitFullscreen': 'Exit Fullscreen',
        'chart.noData': 'No data available for this period.',
    }
}

/**
 * Get the browser's preferred language
 * @returns {'fr' | 'en'} The detected language code
 */
export function detectBrowserLanguage() {
    const lang = navigator.language || navigator.userLanguage || 'fr'
    return lang.startsWith('en') ? 'en' : 'fr'
}

/**
 * Get translation function for a given language
 * @param {string} language - 'auto', 'fr', or 'en'
 * @returns {function} Translation function t(key)
 */
export function getTranslator(language) {
    const effectiveLang = language === 'auto' ? detectBrowserLanguage() : language
    const dict = translations[effectiveLang] || translations.fr

    return (key, fallback) => {
        return dict[key] ?? fallback ?? key
    }
}

export { translations }
