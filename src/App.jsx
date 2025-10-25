import React, { useEffect, useMemo, useState } from 'react'
import WeatherCard from './components/WeatherCard.jsx'
import WeatherChart from './components/WeatherChart.jsx'
import { fetchCurrentObservation, fetchHourly, fetchSunTimes } from './api/weather.js'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const { canInstall, promptInstall } = useInstallPrompt()

  const refresh = async () => {
    try {
      setLoading(true)
      setError(null)
      const [curr, hours] = await Promise.all([
        fetchCurrentObservation({ units: 'm' }),
        fetchHourly({ units: 'm' }),
      ])
      setCurrent(curr)
      setHourly(hours)
      if (!sun && curr?.lat && curr?.lon) {
        const s = await fetchSunTimes(curr.lat, curr.lon)
        setSun(s)
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
    const gust = current.windGust ? `raf. ${Math.round(current.windGust)} km/h` : null
    return [dir, gust].filter(Boolean).join(' • ')
  }, [current])

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
          <WeatherCard type="temperature" title="Température" value={current ? Math.round(current.temp) : null} unit="°C" />
          <WeatherCard type="humidity" title="Humidité" value={current?.humidity} unit="%" />
          <WeatherCard type="pressure" title="Pression" value={current ? Math.round(current.pressure) : null} unit="hPa" />
          <WeatherCard type="wind" title="Vent" value={current ? Math.round(current.windSpeed) : null} unit="km/h" extra={windExtra} />
          <WeatherCard type="rain" title="Pluie" value={current ? (current.precip1h ?? 0).toFixed(1) : null} unit="mm/h" extra={current ? `24h: ${(current.precip24h ?? 0).toFixed(1)} mm` : null} />
          <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-5">
            <div className="text-sm text-slate-500">Soleil</div>
            <div className="mt-2 text-lg">
              {sun ? (
                <div className="flex gap-6">
                  <div>Lever: {new Date(sun.sunrise).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div>Coucher: {new Date(sun.sunset).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ) : (
                <div className="text-slate-400">—</div>
              )}
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
