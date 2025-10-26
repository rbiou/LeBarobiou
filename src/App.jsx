import React, { useEffect, useMemo, useState } from 'react'
import WeatherCard from './components/WeatherCard.jsx'
import WeatherChart from './components/WeatherChart.jsx'
import { fetchCurrentObservation, fetchHourly, fetchHourly7Day, fetchSunTimes, fetchPrecipHistoryDays, fetchGustHighToday, fetchGustHigh7d, fetchGustHigh30d, fetchMoonInfo, getNextMoonPhases } from './api/weather.js'
import { WiSunrise, WiSunset, WiMoonAltFull } from 'react-icons/wi'
import RadarMap from "./components/RadarMap.jsx";
import heroCover from '/header.jpeg'

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
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO']
  return dirs[Math.round(deg / 22.5) % 16]
}

function formatTime(date) {
  return date ? new Date(date).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'
}

export default function App() {
  const [current, setCurrent] = useState(null)
  const [hourly, setHourly] = useState([])
  const [sun, setSun] = useState(null)
  const [sunTomorrow, setSunTomorrow] = useState(null)
  const [moon, setMoon] = useState(null)
  const [hourly7d, setHourly7d] = useState([])
  const [hourly7dFetched, setHourly7dFetched] = useState(false)
  const [dailyHistory, setDailyHistory] = useState([])
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
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState(null)

  const { canInstall, promptInstall } = useInstallPrompt()

  const refresh = async () => {
    try {
      setLoading(true)
      setError(null)
      const [curr, hours, gToday, g7, g30] = await Promise.all([
        fetchCurrentObservation({ units: 'm' }),
        fetchHourly({ units: 'm' }),
        fetchGustHighToday({ units: 'm' }),
        fetchGustHigh7d({ units: 'm' }),
        fetchGustHigh30d({ units: 'm' }),
      ])
      setCurrent(curr)
      setHourly(hours)
      setGustToday(gToday || { value: null, when: null })
      setGust7d(g7 || { value: null, when: null })
      setGust30d(g30 || { value: null, when: null })

      // Fetch sun (today + tomorrow) and moon info when coords available
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
    } catch (e) {
      console.error(e)
      setError(e.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10 * 60 * 1000) // every 10 minutes
    return () => clearInterval(id)
  }, [])

  const windExtra = useMemo(() => {
    if (!current) return null
    const dir = formatWindDirection(current.windDir)
    const gust = current?.windGust != null ? `raf. ${Number(current.windGust).toFixed(1)} km/h` : null
    return [dir, gust].filter(Boolean).join(' • ')
  }, [current])

  const format1 = (n) => (n == null ? null : Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))

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

  const formatClock = (value) => {
    if (!value) return '—'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    })
  }

  const formatDateLabel = (value) => {
    if (!value) return '—'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Europe/Paris',
    })
  }

  const formatDaysUntil = (value) => {
    if (!value) return '—'
    const target = value instanceof Date ? new Date(value) : new Date(value)
    if (Number.isNaN(target.getTime())) return '—'
    const targetMidnight = new Date(target)
    targetMidnight.setHours(0, 0, 0, 0)
    const nowMidnight = new Date()
    nowMidnight.setHours(0, 0, 0, 0)
    const diffDays = Math.round((targetMidnight.getTime() - nowMidnight.getTime()) / (24 * 60 * 60 * 1000))
    if (diffDays <= 0) return "Aujourd'hui"
    if (diffDays === 1) return 'Dans 1 jour'
    return `Dans ${diffDays} jours`
  }

  const sunSummary = useMemo(() => {
    if (!sun?.sunrise || !sun?.sunset) {
      return {
        progressPct: 0,
        label: 'Nuit',
        tone: 'bg-slate-100 text-slate-600 border border-slate-200',
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

    const twoHoursMs = 2 * 60 * 60 * 1000
    let label = 'Nuit'
    let tone = 'bg-slate-100 text-slate-600 border border-slate-200'

    if (now < sunrise) {
      label = 'Avant lever'
      tone = 'bg-slate-100 text-slate-600 border border-slate-200'
    } else if (now >= sunset) {
      label = 'Nuit'
      tone = 'bg-slate-100 text-slate-600 border border-slate-200'
    } else if (now.getTime() - sunrise.getTime() <= twoHoursMs) {
      label = 'Matinée'
      tone = 'bg-sky-100 text-sky-700 border border-sky-200'
    } else if (sunset.getTime() - now.getTime() <= twoHoursMs) {
      label = 'Crépuscule'
      tone = 'bg-rose-100 text-rose-700 border border-rose-200'
    } else {
      label = 'Après-midi'
      tone = 'bg-amber-100 text-amber-700 border border-amber-200'
    }

    return { progressPct: Math.min(Math.max(progressPct, 0), 100), label, tone, lengthLabel }
  }, [sun])

  const moonNextPhases = useMemo(() => getNextMoonPhases(new Date()), [moon])
  const moonCycle = useMemo(() => {
    const raw = typeof moon?.phaseValue === 'number' ? moon.phaseValue : null
    if (raw == null || Number.isNaN(raw)) return { progressPct: null, label: null }
    const normalized = raw <= 1 ? (raw * 360) : ((raw % 360) + 360) % 360
    const progressPct = (normalized / 360) * 100
    const label = normalized < 180 ? 'Croissante' : 'Décroissante'
    return { progressPct, label }
  }, [moon])

  // Precipitation aggregates and event detection
  const precipAgg = useMemo(() => {
    const arr = hourly || []
    if (arr.length === 0) return { last24: 0, eventHours: 0, eventSum: 0 }
    const last24 = arr.reduce((s, d) => s + (Number(d.precip) || 0), 0)

    // Detect current rain event by scanning backwards until a dry bucket
    let startIdx = null
    let endIdx = arr.length - 1
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = Number(arr[i].precip) || 0
      if (p > 0) { startIdx = i } else if (startIdx !== null) { break }
    }

    let eventSum = 0
    let eventHours = 0
    if (startIdx !== null) {
      // Sum precip over the event window
      for (let i = startIdx; i <= endIdx; i++) eventSum += (Number(arr[i].precip) || 0)
      // Compute duration using timestamps; include one bucket duration
      let durationMs = Math.max(0, new Date(arr[endIdx].ts) - new Date(arr[startIdx].ts))
      let bucketMs = 5 * 60 * 1000
      if (startIdx > 0) bucketMs = Math.max(1, new Date(arr[startIdx].ts) - new Date(arr[startIdx - 1].ts))
      else if (endIdx + 1 < arr.length) bucketMs = Math.max(1, new Date(arr[endIdx + 1].ts) - new Date(arr[endIdx].ts))
      durationMs += bucketMs
      eventHours = durationMs / (60 * 60 * 1000)
    }

    return { last24, eventHours, eventSum }
  }, [hourly])

  useEffect(() => {
    // fetch 7d/30d sums lazily after we have some data
    const load = async () => {
      try {
        setRainLoading(true)
        const history = await fetchPrecipHistoryDays(30, { units: 'm' })
        if (!Array.isArray(history) || history.length === 0) {
          setRain7d(null)
          setRain30d(null)
          setDailyHistory([])
        } else {
          const mappedHistory = history.map((entry) => {
            const ts = entry.date instanceof Date ? entry.date : new Date(entry.date)
            const baseTemp = entry.tempAvg ?? entry.tempMean ?? null
            const temp = baseTemp != null
              ? Number(baseTemp)
              : entry.tempHigh != null && entry.tempLow != null
                ? (Number(entry.tempHigh) + Number(entry.tempLow)) / 2
                : null
            return {
              ts,
              temp,
              tempMin: entry.tempLow != null ? Number(entry.tempLow) : null,
              tempMax: entry.tempHigh != null ? Number(entry.tempHigh) : null,
              humidity: entry.humidityAvg != null ? Number(entry.humidityAvg) : null,
              pressure: entry.pressureAvg != null ? Number(entry.pressureAvg) : null,
              precip: entry.precipTotal ?? 0,
            }
          }).filter((item) => item.ts instanceof Date && !Number.isNaN(item.ts.getTime()))
          setDailyHistory(mappedHistory)
          const totals = mappedHistory.map((entry) => Number(entry.precip) || 0)
          const last7 = totals.slice(-7).reduce((sum, val) => sum + val, 0)
          const last30 = totals.slice(-30).reduce((sum, val) => sum + val, 0)
          setRain7d(last7)
          setRain30d(last30)
        }
      } catch (_) {
        // ignore
      } finally {
        setRainLoading(false)
      }
    }
    if (hourly && hourly.length) load()
  }, [hourly])

  useEffect(() => {
    if (chartRange !== '7d' || hourly7dFetched) return
    let cancelled = false
    setChartLoading(true)
    setChartError(null)
    fetchHourly7Day({ units: 'm' })
      .then((series) => {
        if (cancelled) return
        setHourly7d(Array.isArray(series) ? series : [])
        setHourly7dFetched(true)
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setChartError("Impossible de charger les 7 derniers jours.")
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false)
      })

    return () => { cancelled = true }
  }, [chartRange, hourly7dFetched])

  useEffect(() => {
    if (chartRange !== '7d') {
      setChartError(null)
    }
  }, [chartRange])

  const hasHourlyData = Boolean(hourly && hourly.length)
  const lastHourlyPoint = hasHourlyData ? hourly[hourly.length - 1] : null
  const measuredRate = Number.isFinite(Number(current?.precip1h)) ? Number(current.precip1h) : null
  const fallbackRateRaw = lastHourlyPoint != null ? Number(lastHourlyPoint.precip) : null
  const fallbackRate = Number.isFinite(fallbackRateRaw) ? fallbackRateRaw : null
  const displayPrecipRate = measuredRate != null ? measuredRate : fallbackRate
  const isRaining = ((Number(current?.precip1h) || 0) > 0) || ((Number(lastHourlyPoint?.precip) || 0) > 0)
  const eventDurationHours = precipAgg.eventHours || 0
  const statusHeadline = isRaining ? 'Précipitations en cours' : 'Temps sec'
  const statusDescription = !hasHourlyData
    ? 'Données radar en cours de chargement.'
    : isRaining
      ? (eventDurationHours > 0.1
        ? `Événement actif depuis ${format1(eventDurationHours)} h.`
        : 'Pluie détectée sur les dernières observations.')
      : 'Aucune pluie observée récemment.'
  const lastRadarLabel = lastHourlyPoint?.ts
    ? new Date(lastHourlyPoint.ts).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null
  const eventInsightCards = isRaining ? [
    {
      key: 'duration',
      label: "Durée de l'événement",
      value: format1(eventDurationHours),
      unit: 'h',
      helper: 'Depuis la détection des premières gouttes',
    },
    {
      key: 'event-total',
      label: "Cumul de l'événement",
      value: format1(precipAgg.eventSum),
      unit: 'mm',
      helper: 'Somme mesurée sur l’épisode',
    },
  ] : []
  const rainTotals = [
    {
      key: 'today',
      label: "Cumul aujourd'hui",
      value: hasHourlyData ? format1(precipAgg.last24) : null,
      unit: 'mm',
      helper: 'Depuis 00h locale',
    },
    {
      key: '7d',
      label: 'Cumul 7 jours',
      value: rain7d == null ? null : format1(rain7d),
      unit: 'mm',
      helper: 'Somme mobile sur 7 jours',
    },
    {
      key: '30d',
      label: 'Cumul 30 jours',
      value: rain30d == null ? null : format1(rain30d),
      unit: 'mm',
      helper: 'Somme mobile sur 30 jours',
    },
  ]

  const chartData = useMemo(() => {
    if (chartRange === 'day') return hourly
    if (chartRange === '7d') return hourly7d
    if (chartRange === '30d') return dailyHistory
    return hourly
  }, [chartRange, hourly, hourly7d, dailyHistory])

  const chartIsLoading = useMemo(() => {
    if (chartRange === 'day') return false
    if (chartRange === '7d') return chartLoading && (!hourly7dFetched || !hourly7d.length)
    return rainLoading && dailyHistory.length === 0
  }, [chartRange, chartLoading, hourly7dFetched, hourly7d, rainLoading, dailyHistory])

  const chartErrorMessage = chartRange === '7d' ? chartError : null

  return (
    <div className="min-h-screen">
      <header className="relative z-10">
        <div className="mx-auto container-max px-4 pt-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-soft">
            <img
              src={heroCover}
              alt="Couverture Le Barobiou"
              className="absolute inset-0 h-full w-full object-cover opacity-90"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-950/30 to-slate-900/10" />
            <div className="relative px-6 py-12 text-white sm:px-10">
              <h1 className="text-2xl font-semibold sm:text-3xl">Le Barobiou</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto container-max px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="text-slate-500 text-sm">Dernière mise à jour: {formatTime(lastUpdate)}</div>
          <button onClick={refresh} className="text-primary text-sm font-medium">Actualiser</button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <WeatherCard
            type="temperature"
            title="Température"
            value={current?.temp ?? null}
            unit="°C"
            trendDiff={metricTrends.temp?.diff ?? null}
            trendUnit="°C"
            trendLabel="sur 1h"
            minValue={metricExtremes.temp?.minValue}
            minTime={metricExtremes.temp?.minTime}
            maxValue={metricExtremes.temp?.maxValue}
            maxTime={metricExtremes.temp?.maxTime}
          />
          <WeatherCard
            type="humidity"
            title="Humidité"
            value={current?.humidity}
            unit="%"
            trendDiff={metricTrends.humidity?.diff ?? null}
            trendUnit="%"
            trendLabel="sur 1h"
            minValue={metricExtremes.humidity?.minValue}
            minTime={metricExtremes.humidity?.minTime}
            maxValue={metricExtremes.humidity?.maxValue}
            maxTime={metricExtremes.humidity?.maxTime}
          />
          <WeatherCard
            type="pressure"
            title="Pression"
            value={current?.pressure ?? null}
            unit="hPa"
            trendDiff={metricTrends.pressure?.diff ?? null}
            trendUnit="hPa"
            trendLabel="sur 1h"
            minValue={metricExtremes.pressure?.minValue}
            minTime={metricExtremes.pressure?.minTime}
            maxValue={metricExtremes.pressure?.maxValue}
            maxTime={metricExtremes.pressure?.maxTime}
          />

          {/* Précipitations détaillées */}
          <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-5 sm:col-span-2 lg:col-span-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-slate-600">Précipitations</div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {rainLoading && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                    Mise à jour…
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-5">
              <section className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm sm:px-5 sm:py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs uppercase tracking-wide text-slate-500">{statusHeadline}</span>
                    <span className="text-sm leading-relaxed text-slate-600">{statusDescription}</span>
                    {lastRadarLabel && (
                      <span className="text-xs text-slate-400">Dernière mesure radar à {lastRadarLabel}</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold text-slate-900">{displayPrecipRate != null ? format1(displayPrecipRate) : '—'}</span>
                    {displayPrecipRate != null && <span className="text-sm text-slate-500">mm/h</span>}
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80">
                <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 text-xs text-slate-500">
                  <span className="uppercase tracking-wide">Radar de précipitations</span>
                  <span className="text-slate-400">Source RainViewer</span>
                </div>
                <RadarMap embedded />
              </section>

              {isRaining && eventInsightCards.length > 0 && (
                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {eventInsightCards.map(({ key, label, value, unit, helper }) => (
                    <div key={key} className="rounded-xl border border-sky-200 bg-sky-50/90 p-3">
                      <div className="text-xs uppercase tracking-wide text-sky-600">{label}</div>
                      <div className="mt-1 flex items-baseline gap-1 text-xl font-semibold text-sky-900">
                        <span>{value}</span>
                        <span className="text-sm font-medium text-sky-600">{unit}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-sky-600/80">{helper}</div>
                    </div>
                  ))}
                </section>
              )}

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rainTotals.map(({ key, label, value, unit, helper }) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
                    <div className="mt-1 flex items-baseline gap-1 text-xl font-semibold text-slate-900">
                      <span>{value ?? '—'}</span>
                      <span className="text-sm font-medium text-slate-500">{value == null ? '' : unit}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500/80">
                      {helper}
                      {key !== 'today' && rainLoading && <span className="ml-1 text-slate-400">(maj…)</span>}
                    </div>
                  </div>
                ))}
              </section>
            </div>
          </div>

        {/* Vent élargi avec rafales max jour/semaine/mois */}
        <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-5 sm:col-span-2 lg:col-span-3">
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-500">Vent</div>
                <div className="text-xs text-slate-400">Live + Rafales max</div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <div className="text-5xl font-semibold tracking-tight">{current?.windSpeed != null ? Number(current.windSpeed).toFixed(1) : '—'}<span className="text-base text-slate-500 ml-2">km/h</span></div>
                    <div className="text-sm text-slate-600 mt-1">{windExtra || '—'}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:min-w-[320px]">
                    {(() => {
                        const fmtVal = (v) => v == null ? '—' : Number(v).toFixed(1)
                        const fmtTime = (d) => d ? new Date(d).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''
                        const Item = ({ label, data, showTime = false, showDateOnly = false }) => (
                            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="text-xs text-slate-500">{label}</div>
                                <div className="text-base font-semibold">{fmtVal(data.value)} <span className="text-slate-500 text-sm">km/h</span></div>
                                {showTime && data.when ? <div className="text-[11px] text-slate-500">{fmtTime(data.when)}</div> : null}
                                {showDateOnly && data.when ? <div className="text-[11px] text-slate-500">{new Date(data.when).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div> : null}
                            </div>
                        )
                        return (
                            <>
                                <Item label="Rafale max du jour" data={gustToday} showTime={true} />
                                <Item label="Rafale max 7 jours" data={gust7d} showTime={false} showDateOnly={true} />
                                <Item label="Rafale max 1 mois" data={gust30d} showTime={false} showDateOnly={true} />
                            </>
                        )
                    })()}
                </div>
            </div>
        </div>

          {/* Soleil & Lune pleine largeur */}
          <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-6 sm:col-span-2 lg:col-span-3">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium text-slate-600">Soleil & Lune</div>
                {sun?.sunrise && sun?.sunset ? (
                  <div className="text-xs text-slate-400">
                    {`Aujourd’hui : ${formatClock(sun.sunrise)} → ${formatClock(sun.sunset)}`}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-500">Soleil</span>
                    {sun?.sunrise && sun?.sunset ? (
                      <span className="text-xs text-slate-400">Durée {sunSummary.lengthLabel}</span>
                    ) : null}
                  </div>

                  {sun?.sunrise && sun?.sunset ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:items-stretch">
                        <div className="flex h-full min-h-[140px] items-center gap-4 rounded-2xl bg-amber-50 px-4 py-6">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-amber-500 shadow-soft">
                            <WiSunrise className="text-2xl" />
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-amber-600">Lever</div>
                            <div className="text-base font-semibold text-slate-900">{formatClock(sun.sunrise)}</div>
                          </div>
                        </div>
                        <div className="flex h-full min-h-[140px] items-center gap-4 rounded-2xl bg-rose-50 px-4 py-6">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-rose-500 shadow-soft">
                            <WiSunset className="text-2xl" />
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-rose-600">Coucher</div>
                            <div className="text-base font-semibold text-slate-900">{formatClock(sun.sunset)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="relative h-3 w-full overflow-hidden rounded-full border border-slate-200 bg-gradient-to-r from-slate-100 via-sky-100 to-amber-100">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400/70 via-amber-300/70 to-rose-400/70 transition-all duration-500 ease-out"
                            style={{ width: `${sunSummary.progressPct}%` }}
                          />
                          <div
                            className="absolute -top-2 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white bg-amber-400 shadow transition-all duration-500 ease-out"
                            style={{ left: `${sunSummary.progressPct}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <span>Progression</span>
                            <span className={`rounded-full px-2 py-0.5 ${sunSummary.tone} text-[11px]`}>{sunSummary.label}</span>
                          </div>
                          {sunTomorrow?.sunrise ? (
                            <div className="text-xs text-slate-500">
                              Lever demain&nbsp;: {formatClock(sunTomorrow.sunrise)}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-sm text-slate-600">
                        {`Le soleil s’est levé aujourd’hui à ${formatClock(sun.sunrise)}, se couchera à ${formatClock(sun.sunset)}, et se lèvera demain à ${formatClock(sunTomorrow?.sunrise)}.`}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-400">Informations solaires indisponibles.</div>
                  )}
                </section>

                <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-500">Lune</span>
                    <span className="text-xs text-slate-400">{formatDateLabel(new Date())}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:items-stretch">
                    <div className="flex h-full min-h-[140px] items-center gap-4 rounded-2xl bg-indigo-50 px-4 py-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-semibold text-indigo-600 shadow-soft">🌕</div>
                      <div className="text-left">
                        <div className="text-[11px] uppercase tracking-wide text-indigo-600">Prochaine pleine lune</div>
                        <div className="text-base font-semibold text-slate-900">{formatDateLabel(moonNextPhases.nextFull)}</div>
                        <div className="text-[11px] text-indigo-500">{formatDaysUntil(moonNextPhases.nextFull)}</div>
                      </div>
                    </div>
                    <div className="flex h-full min-h-[140px] items-center gap-4 rounded-2xl bg-slate-100 px-4 py-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-semibold text-slate-700 shadow-soft">🌑</div>
                      <div className="text-left">
                        <div className="text-[11px] uppercase tracking-wide text-slate-600">Prochaine nouvelle lune</div>
                        <div className="text-base font-semibold text-slate-900">{formatDateLabel(moonNextPhases.nextNew)}</div>
                        <div className="text-[11px] text-slate-500">{formatDaysUntil(moonNextPhases.nextNew)}</div>
                      </div>
                    </div>
                  </div>

                  {moonCycle.progressPct != null ? (
                    <div className="flex flex-col gap-2">
                      <div className="relative h-3 w-full overflow-hidden rounded-full border border-slate-200 bg-gradient-to-r from-slate-900/20 via-indigo-300/30 to-slate-200">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-slate-800 via-indigo-500 to-slate-200/90 transition-all duration-500 ease-out"
                          style={{ width: `${moonCycle.progressPct}%` }}
                        />
                        <div
                          className="absolute -top-2 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white bg-slate-900 shadow transition-all duration-500 ease-out"
                          style={{ left: `${moonCycle.progressPct}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span>Cycle lunaire</span>
                        {moonCycle.label ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            {moonCycle.label}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-3xl text-white shadow-inner">
                      {moon?.phaseEmoji ?? <WiMoonAltFull />}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{moon?.phaseName || 'Phase inconnue'}</div>
                    <div className="text-xs text-slate-500">
                      Pleine lune : {formatDateLabel(moonNextPhases.nextFull)} · Nouvelle lune : {formatDateLabel(moonNextPhases.nextNew)}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <WeatherChart
            data={chartData}
            range={chartRange}
            onRangeChange={setChartRange}
            loading={chartIsLoading}
            error={chartErrorMessage}
          />
        </div>

        {loading && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/80 text-white text-sm">
            Chargement...
          </div>
        )}
      </main>

      <footer className="mx-auto container-max px-4 py-8 text-center text-xs text-slate-500">
        Données via Weather Underground — © {new Date().getFullYear()}
      </footer>
    </div>
  )
}
