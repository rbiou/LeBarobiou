import React, { useMemo, useState, useRef, useEffect } from 'react'
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Bar, ReferenceArea } from 'recharts'
import { useTheme } from '../context/ThemeContext'
import SwipeableTabs from './ui/SwipeableTabs'
import { FiMaximize, FiMinimize, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

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

  // Legend Scroll Logic
  const legendRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    if (legendRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = legendRef.current
      setCanScrollLeft(scrollLeft > 0)
      // Use a small epsilon to handle float rounding issues if scaling occurs
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  // Depends on data/windowSize/visible to re-check if scroll is needed
  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [data, visible, windowSize])

  const scrollLegend = (direction) => {
    if (legendRef.current) {
      const scrollAmount = 150
      legendRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const toggleFullScreen = () => {
    setIsFullScreen(prev => !prev)
  }

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
    let arr = (data || [])
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

    // Aggregation Logic
    if (range === '30d') {
      // Daily Aggregation for 30d
      const dailySums = {}
      arr.forEach((entry, index) => {
        const date = new Date(entry.timeMs)
        const key = date.toLocaleDateString('en-CA') // YYYY-MM-DD

        if (!dailySums[key]) {
          dailySums[key] = { sum: 0, indices: [] }
        }
        dailySums[key].sum += entry.precipAmount || 0
        dailySums[key].indices.push(index)
      })

      Object.keys(dailySums).forEach(key => {
        const { sum, indices } = dailySums[key]
        if (indices.length > 0) {
          const middleIndex = indices[Math.floor(indices.length / 2)]
          arr[middleIndex].dailyPrecip = sum
        }
      })
    } else if (range === '7d') {
      // 6-Hour Aggregation for 7d (4 bars per day)
      const sixHourSums = {}

      arr.forEach((entry, index) => {
        const date = new Date(entry.timeMs)
        const hour = date.getHours()
        const period = Math.floor(hour / 6) // 0=00-06, 1=06-12, 2=12-18, 3=18-24
        const key = `${date.toLocaleDateString('en-CA')} ${period}` // YYYY-MM-DD P

        if (!sixHourSums[key]) {
          sixHourSums[key] = { sum: 0, indices: [], date: date.toLocaleDateString('en-CA'), period }
        }
        sixHourSums[key].sum += entry.precipAmount || 0
        sixHourSums[key].indices.push(index)
      })

      Object.keys(sixHourSums).forEach(key => {
        const { sum, indices, period } = sixHourSums[key]
        if (indices.length > 0) {
          // Assign to middle point only for single bar per interval
          const middleIndex = indices[Math.floor(indices.length / 2)]
          arr[middleIndex].sixHourPrecip = sum
          // Store time range for tooltip
          const startHour = period * 6
          const endHour = startHour + 6
          arr[middleIndex].precipTimeRange = `${String(startHour).padStart(2, '0')}:00-${String(endHour).padStart(2, '0')}:00`
        }
      })
    } else if (range === 'day') {
      // Hourly Aggregation for day
      const hourlySums = {}

      arr.forEach((entry, index) => {
        const date = new Date(entry.timeMs)
        const key = `${date.toLocaleDateString('en-CA')} ${date.getHours()}` // YYYY-MM-DD H

        if (!hourlySums[key]) {
          hourlySums[key] = { sum: 0, indices: [] }
        }
        hourlySums[key].sum += entry.precipAmount || 0
        hourlySums[key].indices.push(index)
      })

      Object.keys(hourlySums).forEach(key => {
        const { sum, indices } = hourlySums[key]
        if (indices.length > 0) {
          // Assign to middle point only for single bar per interval
          const middleIndex = indices[Math.floor(indices.length / 2)]
          arr[middleIndex].hourlyPrecip = sum
        }
      })
    }

    return arr
  }, [data, range])

  // Create separate dataset for precipitation bars with explicit time ranges
  const precipBars = useMemo(() => {
    if (!prepared.length) return []

    const bars = []

    if (range === '30d') {
      // Daily bars
      const dailySums = {}
      prepared.forEach(entry => {
        const date = new Date(entry.timeMs)
        date.setHours(0, 0, 0, 0)
        const startMs = date.getTime()
        const endMs = startMs + 24 * 60 * 60 * 1000
        const key = startMs

        if (!dailySums[key]) {
          dailySums[key] = { startMs, endMs, sum: 0 }
        }
        dailySums[key].sum += entry.precipAmount || 0
      })

      Object.values(dailySums).forEach(({ startMs, endMs, sum }) => {
        if (sum > 0) {
          bars.push({ startMs, endMs, value: sum, label: 'Pluie (24h)' })
        }
      })
    } else if (range === '7d') {
      // 6-hour bars
      const sixHourSums = {}
      prepared.forEach(entry => {
        const date = new Date(entry.timeMs)
        const hour = date.getHours()
        const period = Math.floor(hour / 6)

        const startDate = new Date(date)
        startDate.setHours(period * 6, 0, 0, 0)
        const startMs = startDate.getTime()
        const endMs = startMs + 6 * 60 * 60 * 1000
        const key = startMs

        if (!sixHourSums[key]) {
          const startHour = period * 6
          const endHour = startHour + 6
          sixHourSums[key] = {
            startMs,
            endMs,
            sum: 0,
            label: `${String(startHour).padStart(2, '0')}:00-${String(endHour).padStart(2, '0')}:00`
          }
        }
        sixHourSums[key].sum += entry.precipAmount || 0
      })

      Object.values(sixHourSums).forEach(({ startMs, endMs, sum, label }) => {
        if (sum > 0) {
          bars.push({ startMs, endMs, value: sum, label: `Pluie ${label}` })
        }
      })
    } else if (range === 'day') {
      // Hourly bars
      const hourlySums = {}
      prepared.forEach(entry => {
        const date = new Date(entry.timeMs)
        const startDate = new Date(date)
        startDate.setMinutes(0, 0, 0)
        const startMs = startDate.getTime()
        const endMs = startMs + 60 * 60 * 1000
        const key = startMs

        if (!hourlySums[key]) {
          hourlySums[key] = { startMs, endMs, sum: 0 }
        }
        hourlySums[key].sum += entry.precipAmount || 0
      })

      Object.values(hourlySums).forEach(({ startMs, endMs, sum }) => {
        if (sum > 0) {
          bars.push({ startMs, endMs, value: sum, label: 'Pluie (1h)' })
        }
      })
    }

    return bars
  }, [prepared, range])

  const rainScale = useMemo(() => {
    if (!prepared.length) {
      return { domain: [0, 1], ticks: [0, 1] }
    }

    // Adapt scale max calculation to consider dailyPrecip if active
    const isDailyRange = range === '30d' || range === '7d'

    // Find absolute max between cumulative and bars (daily or normal)
    const maxVal = prepared.reduce((acc, entry) => {
      let val = Number(entry?.precipCum)
      if (Number.isFinite(val) && val > acc) acc = val

      const barVal = range === '30d'
        ? Number(entry?.dailyPrecip || 0)
        : (range === '7d' ? Number(entry?.sixHourPrecip || 0) : Number(entry?.hourlyPrecip || 0))

      if (Number.isFinite(barVal) && barVal > acc) acc = barVal

      return acc
    }, 0)

    const safeMax = Number.isFinite(maxVal) && maxVal > 0 ? maxVal : 0

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
  }, [prepared, range])

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

  const isDailyRange = range === '30d' || range === '7d'

  // Define Legend Items definition
  const legendItems = [
    { key: 'temperature', label: 'Température (°C)', color: colors.temp, type: 'line' },
    { key: 'precipCum', label: 'Cumul pluie (mm)', color: colors.precipCum, type: 'line' },
    { key: 'precipAmount', label: range === '30d' ? 'Pluie par jour (mm)' : (range === '7d' ? 'Pluie (6h) (mm)' : 'Pluie par heure (mm)'), color: colors.precipAmount, type: 'bar' },
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

  // Responsive Bar Sizing Logic - Proportional to time interval / total period
  const chartWidth = shouldRotate ? windowSize.height : windowSize.width
  // Estimate the actual plot area width
  // Container width - left Y-axis (~40px) - right Y-axes (varies) - container padding
  const estimatedPlotWidth = Math.max(150, chartWidth * 0.75) // ~75% of container is plot area

  // Calculate bar width based on time proportion
  // Each bar should span its time interval visually on the X-axis
  // 30d: 1 day / 30 days = 1/30 of plot width
  // 7d: 6 hours / 168 hours = 1/28 of plot width  
  // day: 1 hour / 24 hours = 1/24 of plot width
  const width30d = Math.max(8, Math.floor(estimatedPlotWidth / 30))
  const width7d = Math.max(8, Math.floor(estimatedPlotWidth / 28))
  const widthDay = Math.max(8, Math.floor(estimatedPlotWidth / 24))


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
          {/* Custom HTML Legend - Scrollable Row */}
          <div className="relative shrink-0 border-b border-border/50 mb-0 group">

            {/* Left Scroll Arrow */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-card via-card to-transparent pl-0 pr-4">
                <button
                  onClick={() => scrollLegend('left')}
                  className="p-1 rounded-full bg-card-alt border border-border shadow-sm hover:bg-card-alt/80 text-text-muted hover:text-text transition-colors"
                >
                  <FiChevronLeft size={14} />
                </button>
              </div>
            )}

            <div
              ref={legendRef}
              onScroll={checkScroll}
              className="flex items-center gap-2 overflow-x-auto px-1 pb-3 pt-2 no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {legendItems.map((entry) => {
                const active = visible[entry.key] !== false
                return (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => handleLegendClick(entry.key)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full transition-all touch-manipulation whitespace-nowrap border shrink-0 ${active ? 'opacity-100 bg-card-alt/50 shadow-sm border-border/50' : 'opacity-50 grayscale hover:opacity-70 border-transparent'
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
              {/* Spacer */}
              <div className="w-1 shrink-0" />
            </div>

            {/* Right Scroll Arrow */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-l from-card via-card to-transparent pr-0 pl-4">
                <button
                  onClick={() => scrollLegend('right')}
                  className="p-1 rounded-full bg-card-alt border border-border shadow-sm hover:bg-card-alt/80 text-text-muted hover:text-text transition-colors"
                >
                  <FiChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          <div className={`${isFullScreen ? 'flex-1 w-full min-h-0' : 'w-full h-80 sm:h-96'} select-none -ml-2`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={prepared} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
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
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null

                    const toFixed = (val) => {
                      const parsed = Number(val)
                      return Number.isFinite(parsed) ? parsed.toFixed(1) : '—'
                    }

                    const d = new Date(label)
                    const dateLabel = range === '30d'
                      ? d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                      : d.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', weekday: 'short' })

                    // Find precipitation bar for this timestamp
                    const precipBar = precipBars.find(bar => label >= bar.startMs && label < bar.endMs)

                    return (
                      <div style={{
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        borderRadius: '12px',
                        padding: '8px 12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}>
                        <p style={{ margin: 0, fontWeight: 600, marginBottom: '4px' }}>{dateLabel}</p>
                        {payload.filter(entry => entry.value != null && entry.value !== undefined).map((entry, index) => (
                          <p key={index} style={{ margin: '2px 0', color: entry.color }}>
                            {entry.name}: {toFixed(entry.value)}
                          </p>
                        ))}
                        {precipBar && visible.precipAmount && (
                          <p style={{ margin: '2px 0', color: colors.precipAmount }}>
                            {precipBar.label}: {toFixed(precipBar.value)} mm
                          </p>
                        )}
                      </div>
                    )
                  }}
                />
                {/* No embedded Legend anymore */}

                {/* Render precipitation bars as ReferenceAreas for true proportional width */}
                {visible.precipAmount && precipBars.map((bar, idx) => (
                  <ReferenceArea
                    key={`precip-${idx}`}
                    yAxisId="rain"
                    x1={bar.startMs}
                    x2={bar.endMs}
                    y1={0}
                    y2={bar.value}
                    fill={colors.precipAmount}
                    fillOpacity={0.8}
                    stroke={colors.precipAmount}
                    strokeOpacity={0.3}
                  />
                ))}

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
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
