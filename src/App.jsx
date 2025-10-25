import React, { useEffect, useMemo, useState } from 'react'
import WeatherCard from './components/WeatherCard.jsx'
import WeatherChart from './components/WeatherChart.jsx'
import { fetchCurrentObservation, fetchHourly, fetchSunTimes, fetchPrecipSumDays, fetchGustHighToday, fetchGustHigh7d, fetchGustHigh30d, fetchMoonInfo, getNextMoonPhases } from './api/weather.js'
import { WiSunrise, WiSunset, WiMoonAltFull } from 'react-icons/wi'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [rain7d, setRain7d] = useState(null)
  const [rain30d, setRain30d] = useState(null)
  const [rainLoading, setRainLoading] = useState(false)
  const [gustToday, setGustToday] = useState({ value: null, when: null })
  const [gust7d, setGust7d] = useState({ value: null, when: null })
  const [gust30d, setGust30d] = useState({ value: null, when: null })

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

  const trends = useMemo(() => {
    if (!hourly || hourly.length < 2) return { temp: null, pressure: null }
    const last = hourly[hourly.length - 1]
    // find previous point roughly 1 hour earlier; fallback to immediate previous
    let prev = hourly[hourly.length - 2]
    for (let i = hourly.length - 2; i >= 0; i--) {
      const dt = (last.ts - hourly[i].ts) / (1000 * 60 * 60)
      if (dt >= 0.9 && dt <= 1.1) { prev = hourly[i]; break }
    }
    const dTemp = (last?.temp != null && prev?.temp != null) ? (last.temp - prev.temp) : null
    const dPress = (last?.pressure != null && prev?.pressure != null) ? (last.pressure - prev.pressure) : null
    const fmt = (d, unit) => d == null ? null : `${d >= 0 ? '+' : ''}${format1(d)}${unit} depuis 1h`
    const color = (d) => d == null ? 'text-slate-500' : (d >= 0 ? 'text-green-600' : 'text-red-600')
    return {
      temp: dTemp == null ? null : <span className={color(dTemp)}>{fmt(dTemp, '°C')}</span>,
      pressure: dPress == null ? null : <span className={color(dPress)}>{fmt(dPress, ' hPa')}</span>,
    }
  }, [hourly])

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
        const [s7, s30] = await Promise.all([
          fetchPrecipSumDays(7, { units: 'm' }),
          fetchPrecipSumDays(30, { units: 'm' }),
        ])
        setRain7d(s7)
        setRain30d(s30)
      } catch (_) {
        // ignore
      } finally {
        setRainLoading(false)
      }
    }
    if (hourly && hourly.length) load()
  }, [hourly])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur bg-bg/80 border-b border-soft">
        <div className="mx-auto container-max px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Le Barobiou</h1>
          {canInstall && (
            <button onClick={promptInstall} className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium shadow-soft active:scale-[0.98]">
              Installer
            </button>
          )}
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
          <WeatherCard type="temperature" title="Température" value={current?.temp ?? null} unit="°C" extra={trends.temp} />
          <WeatherCard type="humidity" title="Humidité" value={current?.humidity} unit="%" />
          <WeatherCard type="pressure" title="Pression" value={current?.pressure ?? null} unit="hPa" extra={trends.pressure} />
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

          {/* Précipitations détaillées */}
          <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-5 sm:col-span-2 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">Précipitations</div>
              {rainLoading && <div className="text-xs text-slate-400">(chargement des cumuls...)</div>}
            </div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              {/* Si pluie en cours, afficher le taux live sinon un indicateur "pas d'événement" */}
              {(() => {
                const isRaining = (Number(current?.precip1h) || 0) > 0 || ((hourly?.[hourly.length-1]?.precip) || 0) > 0
                return (
                  <>
                    {isRaining ? (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-slate-500">Taux actuel</div>
                        <div className="text-lg font-semibold">{format1(current?.precip1h ?? 0)} <span className="text-slate-500 text-sm">mm/h</span></div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                        <div className="text-slate-600">Pas d'événement en cours</div>
                        <div className="text-xs text-slate-500 mt-0.5">Aucune pluie détectée</div>
                      </div>
                    )}

                    {/* Event-only blocks: show only if raining */}
                    {isRaining && (
                      <>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-slate-500">Durée de l'événement</div>
                          <div className="text-lg font-semibold">{format1(precipAgg.eventHours)} <span className="text-slate-500 text-sm">h</span></div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-slate-500">Cumul événement</div>
                          <div className="text-lg font-semibold">{format1(precipAgg.eventSum)} <span className="text-slate-500 text-sm">mm</span></div>
                        </div>
                      </>
                    )}
                  </>
                )
              })()}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Cumul aujourd'hui</div>
                <div className="text-lg font-semibold">{format1(precipAgg.last24)} <span className="text-slate-500 text-sm">mm</span></div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Cumul 7 jours</div>
                <div className="text-lg font-semibold">{rain7d == null ? '—' : `${format1(rain7d)} mm`}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Cumul 1 mois</div>
                <div className="text-lg font-semibold">{rain30d == null ? '—' : `${format1(rain30d)} mm`}</div>
              </div>
            </div>
          </div>

          {/* Soleil & Lune pleine largeur */}
          <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-6 sm:col-span-2 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">Soleil & Lune</div>
            </div>

            {/* Soleil timeline */}
            <div className="mt-3">
              {sun ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-base sm:text-lg">
                    <div className="flex items-center gap-2 min-w-[86px]"><WiSunrise className="text-amber-500 text-2xl" /> {new Date(sun.sunrise).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="relative flex-1 h-3 rounded-full bg-gradient-to-r from-sky-100 via-amber-100 to-rose-100 border border-slate-200">
                      {(() => {
                        const now = new Date()
                        const start = new Date(sun.sunrise)
                        const end = new Date(sun.sunset)
                        let pct = 0
                        if (now <= start) pct = 0
                        else if (now >= end) pct = 100
                        else pct = ((now.getTime() - start.getTime()) / Math.max(1, end.getTime() - start.getTime())) * 100
                        pct = Math.max(0, Math.min(100, pct))
                        // Determine current period and color
                        const twoHours = 2 * 60 * 60 * 1000
                        const mid = new Date((start.getTime() + end.getTime()) / 2)
                        let period = 'nuit'
                        let color = '#fbbf24' // amber-400 default
                        if (now < start || now > end) {
                          period = 'nuit'
                          color = '#0ea5e9' // sky-500 accent for night marker
                        } else if (now >= new Date(end.getTime() - twoHours) && now <= end) {
                          period = 'soir'
                          color = '#fb7185' // rose-400
                        } else if (now >= mid) {
                          period = 'après-midi'
                          color = '#f59e0b' // amber-500
                        } else {
                          period = 'matin'
                          color = '#38bdf8' // sky-400
                        }
                        return (
                          <>
                            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, transition: 'width 600ms ease', backgroundColor: color, opacity: 0.65 }} />
                            <div className="absolute -top-2 -translate-x-1/2" style={{ left: `${pct}%`, transition: 'left 600ms ease' }}>
                              <div className="w-5 h-5 rounded-full shadow" style={{ backgroundColor: color }} />
                            </div>
                          </>
                        )
                      })()}
                    </div>
                    <div className="flex items-center gap-2 min-w-[86px] justify-end"><WiSunset className="text-amber-600 text-2xl" /> {new Date(sun.sunset).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  {(() => {
                    const now = new Date()
                    const start = new Date(sun.sunrise)
                    const end = new Date(sun.sunset)
                    const twoHours = 2 * 60 * 60 * 1000
                    const mid = new Date((start.getTime() + end.getTime()) / 2)
                    let label = 'Nuit'
                    let cls = 'bg-slate-100 text-slate-700 border border-slate-200'
                    if (now < start || now > end) {
                      label = 'Nuit'
                      cls = 'bg-slate-100 text-slate-700 border border-slate-200'
                    } else if (now >= new Date(end.getTime() - twoHours) && now <= end) {
                      label = 'Soir'
                      cls = 'bg-rose-100 text-rose-700 border border-rose-200'
                    } else if (now >= mid) {
                      label = 'Après-midi'
                      cls = 'bg-amber-100 text-amber-700 border border-amber-200'
                    } else {
                      label = 'Matin'
                      cls = 'bg-sky-100 text-sky-700 border border-sky-200'
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-500">Progression de la journée</div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                      </div>
                    )
                  })()}
                  <div className="text-sm text-slate-600 mt-2">
                    {(() => {
                      const fmt = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                      const sr = sun?.sunrise ? fmt(sun.sunrise) : '—'
                      const ss = sun?.sunset ? fmt(sun.sunset) : '—'
                      const srt = sunTomorrow?.sunrise ? fmt(sunTomorrow.sunrise) : '—'
                      return (
                        <span>Le soleil s’est levé ce matin à {sr}, il se couche à {ss}, et se lèvera demain à {srt}</span>
                      )
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-lg">—</div>
              )}
            </div>

            {/* Lune — affichage simple: phase + prochaines dates */}
            <div className="mt-4">
              {(() => {
                const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '—'
                const { nextFull, nextNew } = getNextMoonPhases(new Date());
                console.log('moon', moon);
                const phase = moon?.phaseName || 'Phase inconnue'
                // Choose an icon based on coarse phase
                const Icon = (() => {
                  const p = (phase || '').toLowerCase()
                  if (p.includes('pleine')) return WiMoonAltFull
                  if (p.includes('premier') || p.includes('quartier')) return WiMoonAltFull // fallback icon if specific not imported
                  if (p.includes('dernier')) return WiMoonAltFull // fallback icon
                  if (p.includes('nouvelle')) return WiMoonAltFull // fallback icon
                  return WiMoonAltFull
                })()
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                      <div className="text-3xl">{moon?.phaseEmoji ?? '🌙'}</div>
                      <div>
                        <div className="text-xs text-slate-500">Phase actuelle</div>
                        <div className="text-base font-semibold">{phase}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-xs text-slate-500">Prochaine pleine lune</div>
                      <div className="text-base font-semibold">{formatDate(nextFull)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-xs text-slate-500">Prochaine nouvelle lune</div>
                      <div className="text-base font-semibold">{formatDate(nextNew)}</div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <WeatherChart data={hourly} />
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
