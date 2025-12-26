import React, { useMemo, useState, useRef, useEffect } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Bar } from 'recharts'
import { useTheme } from '../context/ThemeContext'
import SwipeableTabs from './ui/SwipeableTabs'
import { FiMaximize, FiMinimize, FiX } from 'react-icons/fi'

function floorToHour(date) {
  const d = new Date(date)
  d.setMinutes(0, 0, 0)
  return d
}

function makeHourlyTicks(minTs, maxTs) {
  const ticks = []
  let t = floorToHour(minTs).getTime()
  const end = floorToHour(maxTs).getTime()
  while (t <= end) {
    ticks.push(t)
    t += 60 * 60 * 1000
  }
  return ticks
}

function makeDailyTicks(minTs, maxTs, stepDays = 1) {
  const ticks = []
  const start = new Date(minTs)
  start.setHours(0, 0, 0, 0)
  const end = new Date(maxTs)
  const endT = end.getTime()
  let t = start.getTime()
  const stepMs = stepDays * 24 * 60 * 60 * 1000
  while (t <= endT) {
    ticks.push(t)
    t += stepMs
  }
  return ticks
}

const RANGE_OPTIONS = [
  { value: 'day', label: "Aujourd'hui" },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
]

const RANGE_LABELS = {
  day: "Aujourd'hui (depuis 00:00)",
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
}

const tickFormatterFactory = (range) => {
  return (value) => {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    if (range === '30d') {
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    }
    if (range === '7d') {
      return d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        timeZone: 'Europe/Paris',
      })
    }
    const h = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const isMidnight = d.getHours() === 0
    const day = d.toLocaleDateString('fr-FR', { weekday: 'short' })
    return isMidnight && range !== 'day' ? `${day} ${h}` : h
  }
}

export default function WeatherChart({ data, range = 'day', onRangeChange, loading = false, error = null }) {
  const { isDark } = useTheme()
  const containerRef = useRef(null)
  const [isFullScreen, setIsFullScreen] = useState(false)

  const [visible, setVisible] = useState({
    temperature: true,
    temperatureMin: true,
    temperatureMax: true,
    humidity: false,
    pressure: false,
    precipRate: true,
    precipAmount: true,
    precipCum: true,
  })

  // Theme-aware colors
  const colors = useMemo(() => isDark ? {
    grid: '#334155', // slate-700
    text: '#94a3b8', // slate-400
    temp: '#38bdf8', // sky-400
    tempMin: '#7dd3fc', // sky-300
    tempMax: '#fb923c', // orange-400
    pressure: '#818cf8', // indigo-400
    humidity: '#cbd5e1', // slate-300
    precipRate: '#60a5fa', // blue-400
    precipAmount: '#2563eb', // blue-600
    precipCum: '#3b82f6', // blue-500
  } : {
    grid: '#e2e8f0', // slate-200
    text: '#64748b', // slate-500
    temp: '#0ea5e9', // sky-500
    tempMin: '#38bdf8', // sky-400
    tempMax: '#ea580c', // orange-600
    pressure: '#6366f1', // indigo-500
    humidity: '#94a3b8', // slate-400
    precipRate: '#60a5fa',
    precipAmount: '#1d4ed8',
    precipCum: '#2563eb',
  }, [isDark])

  const prepared = useMemo(() => {
    const arr = (data || [])
      .map(d => {
        const ts = d?.ts instanceof Date ? d.ts : new Date(d?.ts)
        if (!(ts instanceof Date) || Number.isNaN(ts.getTime())) return null
        const precipAmount = d?.precipAmount != null
          ? Number(d.precipAmount)
          : (d?.precip != null ? Number(d.precip) : 0)
        const precipRate = d?.precip != null ? Number(d.precip) : precipAmount
        return {
          timeMs: ts.getTime(),
          temperature: d?.temp != null ? Number(d.temp) : null,
          temperatureMin: d?.tempMin != null ? Number(d.tempMin) : null,
          temperatureMax: d?.tempMax != null ? Number(d.tempMax) : null,
          humidity: d?.humidity != null ? Number(d.humidity) : null,
          pressure: d?.pressure != null ? Number(d.pressure) : null,
          precipRate,
          precipAmount,
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.timeMs - b.timeMs)

    let cum = 0
    for (const it of arr) {
      cum += Number(it.precipAmount) || 0
      it.precipCum = cum
    }
    return arr
  }, [data])

  const rainScale = useMemo(() => {
    if (!prepared.length) {
      return { domain: [0, 1], ticks: [0, 1] }
    }

    const maxCum = prepared.reduce((acc, entry) => {
      const value = Number(entry?.precipCum)
      return Number.isFinite(value) && value > acc ? value : acc
    }, 0)

    const safeMax = Number.isFinite(maxCum) && maxCum > 0 ? maxCum : 0

    const computeStep = (maxValue) => {
      if (!Number.isFinite(maxValue) || maxValue <= 0) return 1
      const targetTicks = 5
      const rawStep = maxValue / targetTicks
      const magnitude = 10 ** Math.floor(Math.log10(rawStep))
      const residual = rawStep / magnitude
      if (residual <= 1) return magnitude
      if (residual <= 2) return 2 * magnitude
      if (residual <= 5) return 5 * magnitude
      return 10 * magnitude
    }

    const step = computeStep(safeMax)
    const upperTick = safeMax > 0 ? Math.ceil(safeMax / step) * step : step
    const finalUpper = safeMax > 0 && upperTick === safeMax ? upperTick + step : upperTick
    const upperBound = Math.max(finalUpper, step)

    const ticks = []
    for (let t = 0; t <= upperBound + step / 2; t += step) {
      const roundedTick = Number((Math.round(t / step) * step).toFixed(6))
      if (!ticks.includes(roundedTick)) ticks.push(roundedTick)
    }

    return { domain: [0, upperBound], ticks }
  }, [prepared])

  const ticks = useMemo(() => {
    if (!prepared.length) return []
    const min = prepared[0].timeMs
    const max = prepared[prepared.length - 1].timeMs
    if (range === '30d') return makeDailyTicks(min, max, 2)
    if (range === '7d') return makeDailyTicks(min, max, 1)
    return makeHourlyTicks(min, max)
  }, [prepared, range])

  const handleLegendClick = (key) => {
    setVisible(v => ({ ...v, [key]: !v[key] }))
  }

  const oneDecimal = (v) => (v == null ? '' : Number(v).toFixed(1))
  const rainTickFormatter = (value) => {
    if (value == null) return ''
    const num = Number(value)
    if (!Number.isFinite(num)) return ''
    return Number.isInteger(num) ? num.toString() : num.toFixed(1)
  }

  const handleRangeChange = (value) => {
    if (typeof onRangeChange === 'function' && value !== range) {
      onRangeChange(value)
    }
  }

  const tickFormatter = useMemo(() => tickFormatterFactory(range), [range])
  const xAxisLabel = range === '30d' ? 'Date' : 'Temps (heure locale)'
  const axisLabelStyle = useMemo(() => ({
    fill: colors.text,
    fontSize: 12,
    fontWeight: 600,
  }), [colors.text])

  const showLeftAxis = (
    visible.temperature ||
    (range === '30d' && (visible.temperatureMin || visible.temperatureMax))
  )
  const domain = prepared.length
    ? [prepared[0].timeMs, prepared[prepared.length - 1].timeMs]
    : ['auto', 'auto']

  const showEmptyState = !loading && !prepared.length
  const showHumidityAxis = visible.humidity
  const showPressureAxis = visible.pressure
  const showRainAxis = visible.precipAmount || visible.precipRate || visible.precipCum

  // Define Legend Items definition
  const legendItems = [
    { key: 'temperature', label: 'Température (°C)', color: colors.temp, type: 'line' },
    { key: 'precipCum', label: 'Cumul pluie (mm)', color: colors.precipCum, type: 'line' },
    { key: 'humidity', label: 'Humidité (%)', color: colors.humidity, type: 'line' },
    { key: 'pressure', label: 'Pression (hPa)', color: colors.pressure, type: 'line' },
    { key: 'temperatureMin', label: 'Temp min (°C)', color: colors.tempMin, type: 'line', dash: '4 4' },
    { key: 'temperatureMax', label: 'Temp max (°C)', color: colors.tempMax, type: 'line', dash: '4 4' },
  ].filter(item => {
    // Filter out min/max temps if not 30d range
    if (range !== '30d' && (item.key === 'temperatureMin' || item.key === 'temperatureMax')) {
      return false
    }
    return true
  })

  // Full Screen & Orientation Logic
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleFullScreen = () => {
    setIsFullScreen(prev => !prev)
  }

  // Determine if we need to force rotation
  // Only if in full screen AND in portrait mode (height > width)
  const isPortrait = windowSize.height > windowSize.width
  const shouldRotate = isFullScreen && isPortrait

  // Styles for full screen container
  const fullScreenStyles = isFullScreen ? {
    position: 'fixed',
    top: shouldRotate ? '50%' : 0,
    left: shouldRotate ? '50%' : 0,
    width: shouldRotate ? '100vh' : '100vw',
    height: shouldRotate ? '100vw' : '100vh',
    transform: shouldRotate ? 'translate(-50%, -50%) rotate(90deg)' : 'none',
    zIndex: 50,
    borderRadius: 0,
    margin: 0,
  } : {}

  const containerClasses = `bg-card rounded-2xl shadow-soft p-4 sm:p-6 transition-all ${isFullScreen ? 'overflow-hidden bg-card/95 backdrop-blur-sm flex flex-col' : ''
    }`

  // Adjust padding when rotated/fullscreen to maximize space
  const contentPadding = isFullScreen ? (shouldRotate ? 'p-6 pb-2' : 'p-4 sm:p-8') : ''

  return (
    <div
      className={`${containerClasses} ${contentPadding}`}
      style={fullScreenStyles}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullScreen}
            className="p-1.5 rounded-full hover:bg-card-alt text-text-muted hover:text-text transition-colors"
            title={isFullScreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullScreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
          </button>
          <div className="text-sm text-text-muted">{RANGE_LABELS[range] || RANGE_LABELS.day}</div>
        </div>

        <SwipeableTabs
          options={RANGE_OPTIONS}
          value={range}
          onChange={handleRangeChange}
          className={`h-10 w-full ${shouldRotate ? 'w-64' : 'sm:w-64'} rounded-full border border-border bg-card shadow-sm p-1 transition-all`}
          itemClassName="rounded-full text-xs font-medium"
          activeItemClassName="text-primary font-bold dark:text-white"
          inactiveItemClassName="text-text-muted hover:text-text-secondary"
          indicatorClassName="rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/50 scale-x-100"
        />

        {/* Close button visible in fullscreen for ease of exit */}
        {isFullScreen && (
          <button
            onClick={toggleFullScreen}
            className="absolute top-4 right-4 p-2 rounded-full bg-card-alt/50 hover:bg-card-alt text-text-muted hover:text-text transition-colors sm:hidden"
            style={{ zIndex: 60 }} // Above content
          >
            <FiX size={20} />
          </button>
        )}
      </div>

      {loading && (
        <div className="w-full rounded-xl border border-dashed border-border bg-card-alt py-10 text-center text-sm text-text-muted">
          Chargement des données…
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          {error}
        </div>
      )}

      {showEmptyState && !error && (
        <div className="w-full rounded-xl border border-dashed border-border bg-card-alt py-10 text-center text-sm text-text-muted">
          Aucune donnée disponible pour cette période.
        </div>
      )}

      {!loading && !showEmptyState && (
        <div className={`flex flex-col ${isFullScreen ? 'flex-1 h-full min-h-0' : ''}`}>
          {/* Custom HTML Legend - Outside of SVG */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 px-1 pb-4 pt-2 border-b border-border/50 mb-0 shrink-0">
            {legendItems.map((entry) => {
              const active = visible[entry.key] !== false
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => handleLegendClick(entry.key)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all touch-manipulation ${active ? 'opacity-100 bg-card-alt/50 shadow-sm border border-border/50' : 'opacity-50 grayscale hover:opacity-70'
                    }`}
                  aria-pressed={active}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: entry.color,
                      border: entry.type === 'line' ? `1px solid ${entry.color}` : 'none',
                      opacity: entry.type === 'line' && entry.dash ? 0.7 : 1,
                    }}
                  />
                  <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-text' : 'text-text-muted line-through decoration-text-muted/50'}`}>
                    {entry.label}
                  </span>
                </button>
              )
            })}
          </div>

          <div className={`${isFullScreen ? 'flex-1 w-full min-h-0' : 'w-full h-80 sm:h-96'} select-none -ml-2`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prepared} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis
                  dataKey="timeMs"
                  type="number"
                  domain={domain}
                  ticks={ticks}
                  tickFormatter={tickFormatter}
                  tick={{ fontSize: 11, fill: colors.text }}
                  minTickGap={20}
                  height={30}
                  padding={{ left: 10, right: 10 }}
                  label={{ value: xAxisLabel, position: 'insideBottom', offset: -5, style: axisLabelStyle }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: colors.text }}
                  domain={['auto', 'auto']}
                  tickFormatter={oneDecimal}
                  hide={!showLeftAxis}
                  width={35} // Explicit width to prevent clipping if negative margin used, or just control spacing
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: colors.text }}
                  domain={[0, 100]}
                  tickFormatter={oneDecimal}
                  hide={!showHumidityAxis}
                  width={showHumidityAxis ? 35 : 0}
                />
                <YAxis
                  yAxisId="pressure"
                  orientation="right"
                  tick={{ fontSize: 11, fill: colors.text }}
                  domain={['auto', 'auto']}
                  tickFormatter={oneDecimal}
                  hide={!showPressureAxis}
                  width={showPressureAxis ? 40 : 0}
                />
                <YAxis
                  yAxisId="rain"
                  orientation="right"
                  tick={{ fontSize: 11, fill: colors.text }}
                  domain={rainScale.domain}
                  ticks={rainScale.ticks}
                  tickFormatter={rainTickFormatter}
                  hide={!showRainAxis}
                  width={showRainAxis ? 35 : 0}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelFormatter={(v) => {
                    const d = new Date(v)
                    if (range === '30d') {
                      return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                    }
                    return d.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', weekday: 'short' })
                  }}
                  formatter={(value, name, props) => {
                    const { dataKey } = props || {}
                    const toFixed = (val) => {
                      const parsed = Number(val)
                      return Number.isFinite(parsed) ? parsed.toFixed(1) : '—'
                    }
                    switch (dataKey) {
                      case 'precipCum':
                        return [toFixed(value), 'Cumul pluie (mm)']
                      case 'temperature':
                        return [toFixed(value), 'Température (°C)']
                      case 'temperatureMin':
                        return [toFixed(value), 'Température min (°C)']
                      case 'temperatureMax':
                        return [toFixed(value), 'Température max (°C)']
                      case 'humidity':
                        return [toFixed(value), 'Humidité (%)']
                      case 'pressure':
                        return [toFixed(value), 'Pression (hPa)']
                      case 'precipRate':
                        return [toFixed(value), 'Intensité (mm)']
                      case 'precipAmount':
                        return [toFixed(value), 'Total intervalle (mm)']
                      default:
                        return [value, name]
                    }
                  }}
                />
                {/* No embedded Legend anymore */}

                <Bar yAxisId="rain" dataKey="precipAmount" name="Total intervalle (mm)" fill={colors.precipAmount} opacity={0.45} hide={!visible.precipAmount} />
                <Bar yAxisId="rain" dataKey="precipRate" name="Intensité (mm)" fill={colors.precipRate} opacity={0.6} hide={!visible.precipRate} />
                <Line yAxisId="rain" type="monotone" dataKey="precipCum" name="Cumul pluie (mm)" stroke={colors.precipCum} strokeWidth={2} dot={false} hide={!visible.precipCum} />
                <Line yAxisId="left" type="monotone" dataKey="temperature" name="Température (°C)" stroke={colors.temp} strokeWidth={2} dot={false} hide={!visible.temperature} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperatureMin"
                  name="Température min (°C)"
                  stroke={colors.tempMin}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  hide={range !== '30d' || !visible.temperatureMin}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperatureMax"
                  name="Température max (°C)"
                  stroke={colors.tempMax}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  hide={range !== '30d' || !visible.temperatureMax}
                />
                <Line
                  yAxisId="pressure"
                  type="monotone"
                  dataKey="pressure"
                  name="Pression (hPa)"
                  stroke={colors.pressure}
                  strokeWidth={1.8}
                  dot={false}
                  hide={!visible.pressure}
                />
                <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidité (%)" stroke={colors.humidity} strokeWidth={2} dot={false} hide={!visible.humidity} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
