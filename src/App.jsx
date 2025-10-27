import React, { useEffect, useMemo, useState } from 'react'
import WeatherCard from './components/WeatherCard.jsx'
import WeatherChart from './components/WeatherChart.jsx'
import { fetchCurrentObservation, fetchHourly, fetchHourly7Day, fetchSunTimes, fetchPrecipHistoryDays, fetchMoonInfo, getNextMoonPhases } from './api/weather.js'
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

function getParisStartOfDay(date) {
  const reference = date instanceof Date ? date : new Date(date)
  if (!(reference instanceof Date) || Number.isNaN(reference.getTime())) return null
  const parisInstant = new Date(reference.toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  if (Number.isNaN(parisInstant.getTime())) return null
  parisInstant.setHours(0, 0, 0, 0)
  return parisInstant
}

export default function App() {
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
      setRainLoading(false)
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

  const formatDuration = (hours) => {
    if (!Number.isFinite(hours) || hours <= 0) return '0 min'
    const totalMinutes = Math.max(0, Math.round(hours * 60))
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    if (h === 0) return `${totalMinutes} min`
    if (m === 0) return `${h} h`
    return `${h} h ${String(m).padStart(2, '0')} min`
  }

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
    const arr = Array.isArray(hourly) ? hourly : []
    if (arr.length === 0) return { sinceMidnight: 0, last24: 0, eventHours: 0, eventSum: 0 }

    let sinceMidnight = 0
    arr.forEach((entry) => {
      const total = Number(entry?.precipTotal)
      if (Number.isFinite(total) && total > sinceMidnight) {
        sinceMidnight = total
      }
    })

    // Detect current rain event by scanning backwards until a dry bucket
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
    ? 'Données radar en cours de chargement.'
    : isRaining
      ? (eventDurationHours > 0.1
        ? `Événement actif depuis ${formatDuration(eventDurationHours)}.`
        : 'Pluie détectée sur les dernières observations.')
      : 'Aucune pluie observée récemment.'
  const lastRadarLabel = lastHourlyPoint?.ts
    ? new Date(lastHourlyPoint.ts).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null
  const precipStatusCard = useMemo(() => {
    const base = {
      variant: isRaining ? 'wet' : 'dry',
      title: isRaining ? 'PRÉCIPITATIONS EN COURS' : 'PRÉCIPITATIONS',
      headline: isRaining ? 'Pluie en cours 🌧️' : 'Pas de pluie en cours',
      description: statusDescription,
      lastRadar: lastRadarLabel,
      rateValue: displayPrecipRate != null ? format1(displayPrecipRate) : null,
      rateUnit: displayPrecipRate != null ? 'mm/h' : null,
      metrics: [],
    }

    if (!isRaining) return base

    const durationLabel = formatDuration(eventDurationHours)
    const eventTotal = format1(precipAgg.eventSum) ?? '0,0'

    return {
      ...base,
      metrics: [
        {
          id: 'duration',
          label: "Durée de l'événement",
          value: durationLabel,
          helper: 'Depuis la détection des premières gouttes',
        },
        {
          id: 'total',
          label: 'Cumul depuis le début',
          value: eventTotal,
          unit: 'mm',
          helper: 'Accumulation sur cet épisode',
        },
      ],
    }
  }, [isRaining, statusDescription, lastRadarLabel, displayPrecipRate, eventDurationHours, precipAgg.eventSum])
  const rainSummaryCards = useMemo(() => {
    const todayValue = hasHourlyData ? format1(precipAgg.last24) : null
    return [
      {
        key: 'today',
        badge: "CUMUL AUJOURD'HUI",
        value: todayValue,
        helper: 'Somme observée depuis 00h locale.',
      },
      {
        key: '7d',
        badge: 'CUMUL 7 JOURS',
        value: rain7d == null ? null : format1(rain7d),
        helper: 'Accumulation totale sur les 7 derniers jours.',
      },
      {
        key: '30d',
        badge: 'CUMUL 30 JOURS',
        value: rain30d == null ? null : format1(rain30d),
        helper: 'Somme constatée sur les 30 derniers jours.',
      },
    ]
  }, [hasHourlyData, precipAgg.last24, rain7d, rain30d])

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
              <section className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div
                  className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${
                    precipStatusCard.variant === 'wet'
                      ? 'border-sky-500/60 bg-gradient-to-br from-sky-600 via-blue-600 to-blue-700 text-white shadow-lg shadow-sky-500/30'
                      : 'border-slate-200 bg-slate-100 text-slate-700 shadow-inner'
                  }`}
                >
                  {precipStatusCard.variant === 'wet' && (
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent)] opacity-70" />
                  )}
                  <div className="relative z-10 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span
                          className={`text-[11px] uppercase tracking-wide ${
                            precipStatusCard.variant === 'wet' ? 'text-white/70' : 'text-slate-500'
                          }`}
                        >
                          {precipStatusCard.title}
                        </span>
                        <div className="mt-1 text-lg font-semibold leading-tight">
                          {precipStatusCard.headline}
                        </div>
                      </div>
                      {precipStatusCard.rateValue && (
                        <div className="flex items-baseline gap-1 text-2xl font-semibold">
                          <span>{precipStatusCard.rateValue}</span>
                          {precipStatusCard.rateUnit && (
                            <span className="text-xs font-medium opacity-80">{precipStatusCard.rateUnit}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {precipStatusCard.description && (
                      <p
                        className={`text-sm leading-relaxed ${
                          precipStatusCard.variant === 'wet' ? 'text-white/80' : 'text-slate-600'
                        }`}
                      >
                        {precipStatusCard.description}
                      </p>
                    )}
                    {precipStatusCard.metrics.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {precipStatusCard.metrics.map((metric) => (
                          <div
                            key={metric.id}
                            className={`rounded-xl border px-3 py-3 transition ${
                              precipStatusCard.variant === 'wet'
                                ? 'border-white/20 bg-white/10 text-white/90'
                                : 'border-slate-200 bg-white/80 text-slate-700'
                            }`}
                          >
                            <div
                              className={`text-[11px] uppercase tracking-wide ${
                                precipStatusCard.variant === 'wet' ? 'text-white/70' : 'text-slate-500'
                              }`}
                            >
                              {metric.label}
                            </div>
                            <div className="mt-1 flex items-baseline gap-1 text-base font-semibold">
                              <span>{metric.value}</span>
                              {metric.unit && (
                                <span
                                  className={`text-xs font-medium ${
                                    precipStatusCard.variant === 'wet' ? 'text-white/70' : 'text-slate-500'
                                  }`}
                                >
                                  {metric.unit}
                                </span>
                              )}
                            </div>
                            {metric.helper && (
                              <div
                                className={`mt-1 text-[11px] ${
                                  precipStatusCard.variant === 'wet' ? 'text-white/60' : 'text-slate-500'
                                }`}
                              >
                                {metric.helper}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {precipStatusCard.lastRadar && (
                      <div
                        className={`text-xs ${
                          precipStatusCard.variant === 'wet' ? 'text-white/70' : 'text-slate-500'
                        }`}
                      >
                        Dernière mesure radar à {precipStatusCard.lastRadar}
                      </div>
                    )}
                  </div>
                </div>
                {rainSummaryCards.map(({ key, badge, value, helper }) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm min-h-[160px]"
                  >
                    <div className="flex h-full flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                          {badge}
                        </span>
                        {key !== 'today' && rainLoading && (
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">Mise à jour…</span>
                        )}
                      </div>

                      <div className="flex flex-col items-start gap-1 pt-2">
                        <div className="flex items-baseline gap-1 text-3xl font-semibold text-slate-900">
                          <span>{value ?? '—'}</span>
                          {value != null && <span className="text-base font-medium text-slate-500">mm</span>}
                        </div>
                      </div>

                      {helper && (
                        <div className="mt-auto text-xs leading-snug text-slate-500">
                          {helper}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80">
                <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 text-xs text-slate-500">
                  <span className="uppercase tracking-wide">Radar de précipitations</span>
                  <span className="text-slate-400">Source RainViewer</span>
                </div>
                <RadarMap embedded />
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
