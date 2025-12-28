import React, { useEffect, useMemo, useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { SettingsProvider, useSettings } from './context/SettingsContext'
import { detectBrowserLanguage } from './utils/i18n'
import ThemeToggle from './components/ThemeToggle'
import WeatherCard from './components/WeatherCard'
import WeatherChart from './components/WeatherChart'
import PrecipitationCard from './components/PrecipitationCard'
import WindCard from './components/WindCard'
import SunMoonCard from './components/SunMoonCard'
import SettingsPage from './components/SettingsPage'

import { fetchCurrentObservation, fetchHourly, fetchHourly7Day, fetchSunTimes, fetchPrecipHistoryDays, fetchMoonInfo, getNextMoonPhases } from './api/weather.js'
import { formatDateTime, formatDecimal, formatDuration } from './utils/formatters'
import heroCover from '/header.jpeg'
import PullToRefresh from './components/ui/PullToRefresh'
import { HiCheck } from 'react-icons/hi2'
import { FiSettings } from 'react-icons/fi'

function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const installed = () => setIsInstalled(true)
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return outcome === 'accepted'
  }

  return { canInstall: !!deferredPrompt && !isInstalled, promptInstall }
}

function formatWindDirection(deg) {
  if (deg == null) return '—'
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']
  return dirs[Math.round(deg / 22.5) % 16]
}

function getParisStartOfDay(date) {
  const reference = date instanceof Date ? date : new Date(date)
  if (!(reference instanceof Date) || Number.isNaN(reference.getTime())) return null
  const parisInstant = new Date(reference.toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  if (Number.isNaN(parisInstant.getTime())) return null
  parisInstant.setHours(0, 0, 0, 0)
  return parisInstant
}

function SuccessToast({ visible }) {
  const { t } = useSettings()
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[70] transition-all duration-300 pointer-events-none ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg bg-green-500 text-white font-medium text-sm backdrop-blur-md">
        <HiCheck className="text-lg" />
        <span>{t('app.updated')}</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </ThemeProvider>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home') // 'home' | 'settings'
  const { settings, t } = useSettings()
  const locale = settings.language === 'auto' ? detectBrowserLanguage() : (settings.language === 'en' ? 'en-US' : 'fr-FR')
  const [current, setCurrent] = useState(null)
  const [hourly, setHourly] = useState([])
  const [sun, setSun] = useState(null)
  const [sunTomorrow, setSunTomorrow] = useState(null)
  const [moon, setMoon] = useState(null)
  const [hourly7d, setHourly7d] = useState([])
  const [dailyHistory, setDailyHistory] = useState([])
  const [dailyHistoryError, setDailyHistoryError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [rain7d, setRain7d] = useState(null)
  const [rain30d, setRain30d] = useState(null)
  const [rainLoading, setRainLoading] = useState(false)
  const [gustToday, setGustToday] = useState({ value: null, when: null })
  const [gust7d, setGust7d] = useState({ value: null, when: null })
  const [gust30d, setGust30d] = useState({ value: null, when: null })
  const [chartRange, setChartRange] = useState('day')
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  const { canInstall, promptInstall } = useInstallPrompt()

  const refresh = async () => {
    try {
      setLoading(true)
      setRainLoading(true)
      setError(null)
      setDailyHistoryError(null)

      const historyPromise = fetchPrecipHistoryDays(30, { units: 'm' }).catch((err) => {
        console.error(err)
        setDailyHistoryError("Impossible de charger l'historique des précipitations sur 30 jours.")
        return null
      })

      const [curr, hours, hours7days, history] = await Promise.all([
        fetchCurrentObservation({ units: 'm' }),
        fetchHourly({ units: 'm' }),
        fetchHourly7Day({ units: 'm' }),
        historyPromise,
      ])
      setCurrent(curr)
      setHourly(hours)
      const series7d = Array.isArray(hours7days) ? hours7days : []
      setHourly7d(series7d)

      if (Array.isArray(history) && history.length) {
        const mappedHistory = history
          .map((entry) => {
            const ts = entry.date instanceof Date ? entry.date : new Date(entry.date)
            if (!(ts instanceof Date) || Number.isNaN(ts.getTime())) return null
            const baseTemp = entry.tempAvg ?? entry.tempMean ?? null
            const temp = baseTemp != null
              ? Number(baseTemp)
              : entry.tempHigh != null && entry.tempLow != null
                ? (Number(entry.tempHigh) + Number(entry.tempLow)) / 2
                : null
            const precipTotal = entry.precipTotal != null ? Number(entry.precipTotal) : 0
            const gustHigh = entry.gustHigh != null ? Number(entry.gustHigh) : null
            const gustHighTime = entry.gustHighTime instanceof Date
              ? entry.gustHighTime
              : (entry.date instanceof Date ? entry.date : null)
            return {
              ts,
              temp,
              tempMin: entry.tempLow != null ? Number(entry.tempLow) : null,
              tempMax: entry.tempHigh != null ? Number(entry.tempHigh) : null,
              humidity: entry.humidityAvg != null ? Number(entry.humidityAvg) : null,
              pressure: entry.pressureAvg != null ? Number(entry.pressureAvg) : null,
              precipTotal,
              precipAmount: precipTotal,
              gustHigh: Number.isFinite(gustHigh) ? gustHigh : null,
              gustHighTime: gustHighTime instanceof Date && !Number.isNaN(gustHighTime.getTime()) ? gustHighTime : null,
            }
          })
          .filter(Boolean)
          .sort((a, b) => a.ts - b.ts)

        setDailyHistory(mappedHistory)

        const sum30 = mappedHistory.reduce((sum, entry) => sum + (Number(entry.precipTotal) || 0), 0)
        setRain30d(Number.isFinite(sum30) ? sum30 : null)

        const parisToday = getParisStartOfDay(new Date())
        const start7 = parisToday ? new Date(parisToday) : null
        if (start7) start7.setDate(start7.getDate() - 6)

        let rain7Sum = null
        if (start7) {
          rain7Sum = mappedHistory.reduce((sum, entry) => {
            const dayStart = getParisStartOfDay(entry.ts)
            if (!dayStart || dayStart < start7) return sum
            return sum + (Number(entry.precipTotal) || 0)
          }, 0)
        }
        setRain7d(rain7Sum != null && Number.isFinite(rain7Sum) ? rain7Sum : null)

        const gustFromHistory = (days) => {
          if (!parisToday) return { value: null, when: null }
          const start = new Date(parisToday)
          start.setDate(start.getDate() - (days - 1))
          let max = null
          let when = null
          mappedHistory.forEach((entry) => {
            const day = getParisStartOfDay(entry.ts)
            if (!day) return
            if (day < start) return
            const gust = Number(entry.gustHigh)
            if (!Number.isFinite(gust)) return
            if (max == null || gust > max) {
              max = gust
              when = entry.gustHighTime instanceof Date ? entry.gustHighTime : entry.ts
            }
          })
          return { value: max, when }
        }

        setGustToday(gustFromHistory(1))
        setGust7d(gustFromHistory(7))
        setGust30d(gustFromHistory(30))
      } else {
        setDailyHistory([])
        setRain30d(null)
        setRain7d(null)
        setGustToday({ value: null, when: null })
        setGust7d({ value: null, when: null })
        setGust30d({ value: null, when: null })
      }

      if (curr?.lat && curr?.lon) {
        try {
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          const [s, sTomorrow, m] = await Promise.all([
            fetchSunTimes(curr.lat, curr.lon),
            fetchSunTimes(curr.lat, curr.lon, tomorrow),
            fetchMoonInfo(curr.lat, curr.lon),
          ])
          setSun(s)
          setSunTomorrow(sTomorrow)
          setMoon(m)
        } catch (_) { /* ignore */ }
      }

      setLastUpdate(new Date())
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 2000)

    } catch (e) {
      console.error(e)
      setError(e.message || t('app.unknownError'))
    } finally {
      setLoading(false)
      setRainLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const windExtra = useMemo(() => {
    if (!current) return null
    const dir = formatWindDirection(current.windDir)
    const gust = current?.windGust != null ? `raf. ${Number(current.windGust).toFixed(1)} km/h` : null
    return [dir, gust].filter(Boolean).join(' • ')
  }, [current])

  const metricTrends = useMemo(() => {
    const empty = {
      temp: { diff: null },
      humidity: { diff: null },
      pressure: { diff: null },
    }
    if (!hourly || hourly.length < 2) return empty
    const last = hourly[hourly.length - 1]
    let prev = hourly[hourly.length - 2]
    for (let i = hourly.length - 2; i >= 0; i--) {
      const dt = (last.ts - hourly[i].ts) / (1000 * 60 * 60)
      if (dt >= 0.9 && dt <= 1.1) { prev = hourly[i]; break }
    }
    const compute = (key) => {
      const lastVal = last?.[key]
      const prevVal = prev?.[key]
      if (lastVal == null || prevVal == null) return { diff: null }
      const nLast = Number(lastVal)
      const nPrev = Number(prevVal)
      if (!Number.isFinite(nLast) || !Number.isFinite(nPrev)) return { diff: null }
      return { diff: nLast - nPrev, last: nLast, prev: nPrev }
    }
    return {
      temp: compute('temp'),
      humidity: compute('humidity'),
      pressure: compute('pressure'),
    }
  }, [hourly])

  const metricExtremes = useMemo(() => {
    const init = () => ({ minValue: null, minTime: null, maxValue: null, maxTime: null })
    const stats = {
      temp: init(),
      humidity: init(),
      pressure: init(),
    }
    if (!hourly || hourly.length === 0) return stats

    const toNumber = (val) => {
      if (val === undefined || val === null) return null
      const num = Number(val)
      return Number.isFinite(num) ? num : null
    }
    const updateMin = (bucket, val, time) => {
      if (val == null) return
      if (bucket.minValue == null || val < bucket.minValue) {
        bucket.minValue = val
        bucket.minTime = time
      }
    }
    const updateMax = (bucket, val, time) => {
      if (val == null) return
      if (bucket.maxValue == null || val > bucket.maxValue) {
        bucket.maxValue = val
        bucket.maxTime = time
      }
    }

    for (const entry of hourly) {
      const ts = entry.ts instanceof Date ? entry.ts : new Date(entry.ts)
      const tempVal = toNumber(entry?.temp)
      updateMin(stats.temp, tempVal, ts)
      updateMax(stats.temp, tempVal, ts)

      const humidityVal = toNumber(entry?.humidity)
      updateMin(stats.humidity, humidityVal, ts)
      updateMax(stats.humidity, humidityVal, ts)

      const pressureVal = toNumber(entry?.pressure)
      updateMin(stats.pressure, pressureVal, ts)
      updateMax(stats.pressure, pressureVal, ts)

      const pressureMin = toNumber(entry?.pressureMin)
      updateMin(stats.pressure, pressureMin, ts)
      const pressureMax = toNumber(entry?.pressureMax)
      updateMax(stats.pressure, pressureMax, ts)
    }

    return stats
  }, [hourly])

  const sunSummary = useMemo(() => {
    if (!sun?.sunrise || !sun?.sunset) {
      return {
        progressPct: 0,
        label: t('sun.night'),
        tone: 'bg-card-alt text-text-secondary border border-border',
        lengthLabel: '—',
      }
    }

    const sunrise = new Date(sun.sunrise)
    const sunset = new Date(sun.sunset)
    const now = new Date()
    const totalMs = Math.max(0, sunset.getTime() - sunrise.getTime())
    const elapsedMs = Math.min(Math.max(now.getTime() - sunrise.getTime(), 0), totalMs)
    const progressPct = totalMs === 0 ? 0 : (elapsedMs / totalMs) * 100

    const totalHours = totalMs / (60 * 60 * 1000)
    const hours = Math.floor(totalHours)
    const minutes = Math.round((totalHours - hours) * 60)
    const lengthLabel = isFinite(totalHours) ? `${hours}h${String(minutes).padStart(2, '0')}` : '—'

    // Get current hour in Paris timezone for proper label
    const parisHour = parseInt(now.toLocaleTimeString(locale, { hour: '2-digit', hour12: false, timeZone: 'Europe/Paris' }), 10)

    let label = t('sun.night')
    let tone = 'bg-card-alt text-text-secondary border border-border'

    if (now < sunrise) {
      // Before sunrise
      label = t('sun.beforeSunrise')
      tone = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
    } else if (now >= sunset) {
      // After sunset
      label = t('sun.night')
      tone = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
    } else if (parisHour < 12) {
      // Morning (before noon)
      label = t('sun.morning')
      tone = 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
    } else if (parisHour < 17) {
      // Afternoon (12h - 17h)
      label = t('sun.afternoon')
      tone = 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
    } else {
      // Evening (17h until sunset)
      label = t('sun.evening')
      tone = 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
    }

    return { progressPct: Math.min(Math.max(progressPct, 0), 100), label, tone, lengthLabel }
  }, [sun, t])

  const moonNextPhases = useMemo(() => getNextMoonPhases(new Date()), [moon])
  const moonCycle = useMemo(() => {
    const raw = typeof moon?.phaseValue === 'number' ? moon.phaseValue : null
    if (raw == null || Number.isNaN(raw)) return { progressPct: null, label: null }
    const normalized = raw <= 1 ? (raw * 360) : ((raw % 360) + 360) % 360
    const progressPct = (normalized / 360) * 100
    const label = normalized < 180 ? t('moon.waxing') : t('moon.waning')
    return { progressPct, label }
  }, [moon, t])

  // Precipitation aggregates
  const precipAgg = useMemo(() => {
    const arr = Array.isArray(hourly) ? hourly : []
    if (arr.length === 0) return { sinceMidnight: 0, last24: 0, eventHours: 0, eventSum: 0 }

    let sinceMidnight = 0
    arr.forEach((entry) => {
      const total = Number(entry?.precipTotal)
      if (Number.isFinite(total) && total > sinceMidnight) {
        sinceMidnight = total
      }
    })

    let startIdx = null
    let endIdx = arr.length - 1
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = Number(arr[i]?.precip) || 0
      if (p > 0) { startIdx = i } else if (startIdx !== null) { break }
    }

    let eventSum = 0
    let eventHours = 0
    if (startIdx !== null) {
      for (let i = startIdx; i <= endIdx; i++) {
        eventSum += Number(arr[i]?.precip) || 0
      }
      let durationMs = Math.max(0, new Date(arr[endIdx].ts) - new Date(arr[startIdx].ts))
      let bucketMs = 5 * 60 * 1000
      if (startIdx > 0) {
        bucketMs = Math.max(1, new Date(arr[startIdx].ts) - new Date(arr[startIdx - 1].ts))
      } else if (endIdx + 1 < arr.length) {
        bucketMs = Math.max(1, new Date(arr[endIdx + 1].ts) - new Date(arr[endIdx].ts))
      }
      durationMs += bucketMs
      eventHours = durationMs / (60 * 60 * 1000)
    }

    return { sinceMidnight, last24: sinceMidnight, eventHours, eventSum }
  }, [hourly])

  const hasHourlyData = Boolean(hourly && hourly.length)
  const lastHourlyPoint = hasHourlyData ? hourly[hourly.length - 1] : null
  const measuredRate = Number.isFinite(Number(current?.precip1h)) ? Number(current.precip1h) : null
  const fallbackRateRaw = lastHourlyPoint != null ? Number(lastHourlyPoint.precip) : null
  const fallbackRate = Number.isFinite(fallbackRateRaw) ? fallbackRateRaw : null
  const displayPrecipRate = measuredRate != null ? measuredRate : fallbackRate
  const isRaining = ((Number(current?.precip1h) || 0) > 0) || ((Number(lastHourlyPoint?.precip) || 0) > 0)
  const eventDurationHours = precipAgg.eventHours || 0
  const statusDescription = !hasHourlyData
    ? t('chart.loading')
    : isRaining
      ? (eventDurationHours > 0.1
        ? `${t('precip.activeEvent')} ${formatDuration(eventDurationHours)}.`
        : t('precip.status.detected'))
      : t('precip.status.noRainDesc')
  const lastRadarLabel = lastHourlyPoint?.ts
    ? new Date(lastHourlyPoint.ts).toLocaleString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
    : null
  const precipStatusCard = useMemo(() => {
    const base = {
      variant: isRaining ? 'wet' : 'dry',
      title: isRaining ? t('precip.ongoing') : t('precip.title'),
      headline: isRaining ? t('precip.status.wet') + ' 🌧️' : t('precip.status.dry'),
      description: statusDescription,
      lastRadar: lastRadarLabel,
      rateValue: displayPrecipRate != null ? formatDecimal(displayPrecipRate, locale) : null,
      rateUnit: displayPrecipRate != null ? 'mm/h' : null,
      metrics: [],
    }

    if (!isRaining) return base

    const durationLabel = formatDuration(eventDurationHours)
    const eventTotal = formatDecimal(precipAgg.eventSum, locale) ?? (locale === 'en-US' ? '0.0' : '0,0')

    return {
      ...base,
      metrics: [
        {
          id: 'duration',
          label: t('precip.eventDuration'),
          value: durationLabel,
          helper: t('precip.eventDurationHelper') || 'Depuis la détection des premières gouttes',
        },
        {
          id: 'total',
          label: t('precip.eventTotal'),
          value: eventTotal,
          unit: 'mm',
          helper: t('precip.eventTotalHelper') || 'Accumulation sur cet épisode',
        },
      ],
    }
  }, [isRaining, statusDescription, lastRadarLabel, displayPrecipRate, eventDurationHours, precipAgg.eventSum, t])

  const rainSummaryCards = useMemo(() => {
    const todayValue = hasHourlyData ? formatDecimal(precipAgg.last24, locale) : null
    return [
      {
        key: 'today',
        badge: t('precip.cumToday'),
        value: todayValue,
        helper: t('precip.sinceMidnight'),
      },
      {
        key: '7d',
        badge: t('precip.cum7d'),
        value: rain7d != null ? formatDecimal(rain7d) : null,
        helper: t('precip.last7days'),
      },
      {
        key: '30d',
        badge: t('precip.cum30d'),
        value: rain30d != null ? formatDecimal(rain30d) : null,
        helper: t('precip.last30days'),
      },
    ]
  }, [precipAgg, hasHourlyData, rain7d, rain30d, t])

  const chartData = useMemo(() => {
    if (chartRange === 'day') return hourly
    if (chartRange === '7d') return hourly7d
    if (chartRange === '30d') return dailyHistory
    return hourly
  }, [chartRange, hourly, hourly7d, dailyHistory])

  const chartIsLoading = useMemo(() => {
    if (chartRange === '30d') return rainLoading && dailyHistory.length === 0
    if (chartRange === '7d') return loading && hourly7d.length === 0
    return loading && hourly.length === 0
  }, [chartRange, rainLoading, dailyHistory, loading, hourly7d, hourly])

  const chartErrorMessage = chartRange === '30d' ? dailyHistoryError : null

  // Render settings page if on settings
  if (currentPage === 'settings') {
    return <SettingsPage onBack={() => setCurrentPage('home')} />
  }

  return (
    <div className="min-h-screen bg-bg text-text transition-colors duration-300">
      <header className="relative z-10 pt-4 sm:pt-6">
        <div className="mx-auto container-max px-4">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-soft">
            <img
              src={heroCover}
              alt="Couverture Le Barobiou"
              className="absolute inset-0 h-full w-full object-cover opacity-90"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/50 via-slate-900/10 to-transparent" />

            <div className="relative px-6 py-8 sm:px-10 sm:py-12 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">Le Barobiou</h1>
                <div className="mt-1 flex items-center gap-2 text-xs font-medium text-white/60">
                  <span>{t('app.lastUpdate')} : {formatDateTime(lastUpdate, locale)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {canInstall && (
                  <button
                    onClick={promptInstall}
                    className="hidden sm:block rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/30"
                  >
                    {t('app.install')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={refresh} isRefreshing={loading}>
        <main className="mx-auto container-max px-4 pb-6 sm:pb-8">


          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 text-sm">
              {error}
            </div>
          )}

          {settings.blocs.weatherCards && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <WeatherCard
                type="temperature"
                title={t('weather.temperature')}
                value={current?.temp ?? null}
                unit="°C"
                trendDiff={metricTrends.temp?.diff ?? null}
                trendUnit="°C"
                trendLabel={t('weather.trend')}
                minValue={metricExtremes.temp?.minValue}
                minTime={metricExtremes.temp?.minTime}
                maxValue={metricExtremes.temp?.maxValue}
                maxTime={metricExtremes.temp?.maxTime}
              />
              <WeatherCard
                type="humidity"
                title={t('weather.humidity')}
                value={current?.humidity}
                unit="%"
                trendDiff={metricTrends.humidity?.diff ?? null}
                trendUnit="%"
                trendLabel={t('weather.trend')}
                minValue={metricExtremes.humidity?.minValue}
                minTime={metricExtremes.humidity?.minTime}
                maxValue={metricExtremes.humidity?.maxValue}
                maxTime={metricExtremes.humidity?.maxTime}
              />
              <WeatherCard
                type="pressure"
                title={t('weather.pressure')}
                value={current?.pressure ?? null}
                unit="hPa"
                trendDiff={metricTrends.pressure?.diff ?? null}
                trendUnit="hPa"
                trendLabel={t('weather.trend')}
                minValue={metricExtremes.pressure?.minValue}
                minTime={metricExtremes.pressure?.minTime}
                maxValue={metricExtremes.pressure?.maxValue}
                maxTime={metricExtremes.pressure?.maxTime}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {settings.blocs.precipitation && (
              <PrecipitationCard
                loading={rainLoading}
                statusCard={precipStatusCard}
                summaryCards={rainSummaryCards}
              />
            )}

            {settings.blocs.wind && (
              <WindCard
                current={current}
                windExtra={windExtra}
                gustToday={gustToday}
                gust7d={gust7d}
                gust30d={gust30d}
              />
            )}

            {settings.blocs.sunMoon && (
              <SunMoonCard
                sun={sun}
                sunSummary={sunSummary}
                sunTomorrow={sunTomorrow}
                moon={moon}
                moonCycle={moonCycle}
                moonNextPhases={moonNextPhases}
              />
            )}
          </div>



          {settings.blocs.chart && (
            <div className="mt-6">
              <WeatherChart
                data={chartData}
                range={chartRange}
                onRangeChange={setChartRange}
                loading={chartIsLoading}
                error={chartErrorMessage}
                chartSettings={settings.chart}
              />
            </div>
          )}

          {loading && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-900/80 dark:bg-white/10 text-white text-sm backdrop-blur-md shadow-lg border border-white/10 z-50">
              {t('app.loading')}
            </div>
          )}
        </main>
      </PullToRefresh>

      <footer className="mx-auto container-max px-4 py-8 flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => setCurrentPage('settings')}
            className="h-10 flex items-center gap-2 px-5 rounded-full bg-card hover:bg-card-alt text-text transition-all shadow-sm border border-border active:scale-95"
            aria-label={t('settings.title')}
          >
            <FiSettings size={18} className="text-text-secondary" />
            <span className="text-xs font-medium">{t('settings.title')}</span>
          </button>
        </div>
        <p className="text-center text-xs text-text-muted">{t('app.footer')} — © {new Date().getFullYear()}</p>
      </footer>
      <SuccessToast visible={showSuccessToast} />
    </div>
  )
}
