import React, { useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Bar } from 'recharts'

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
  end.setHours(0, 0, 0, 0)
  let t = start.getTime()
  const stepMs = stepDays * 24 * 60 * 60 * 1000
  while (t <= end) {
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
      if (d.getHours() === 0) {
        return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' })
      }
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit' })
    }
    const h = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const isMidnight = d.getHours() === 0
    const day = d.toLocaleDateString('fr-FR', { weekday: 'short' })
    return isMidnight ? `${day} ${h}` : h
  }
}

export default function WeatherChart({ data, range = 'day', onRangeChange, loading = false, error = null }) {
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

  const ticks = useMemo(() => {
    if (!prepared.length) return []
    const min = prepared[0].timeMs
    const max = prepared[prepared.length - 1].timeMs
    if (range === '30d') return makeDailyTicks(min, max, 2)
    if (range === '7d') return makeDailyTicks(min, max, 1)
    return makeHourlyTicks(min, max)
  }, [prepared, range])

  const handleLegendClick = (entry) => {
    const key = entry.dataKey
    setVisible(v => ({ ...v, [key]: !v[key] }))
  }

  const oneDecimal = (v) => (v == null ? '' : Number(v).toFixed(1))

  const handleRangeClick = (value) => {
    if (typeof onRangeChange === 'function' && value !== range) {
      onRangeChange(value)
    }
  }

  const tickFormatter = useMemo(() => tickFormatterFactory(range), [range])

  const domain = prepared.length
    ? [prepared[0].timeMs, prepared[prepared.length - 1].timeMs]
    : ['auto', 'auto']

  const showEmptyState = !loading && !prepared.length

  return (
    <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="text-sm text-slate-500">{RANGE_LABELS[range] || RANGE_LABELS.day}</div>
        <div className="flex rounded-xl border border-slate-200 bg-white/80 p-1 text-xs font-medium text-slate-600">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleRangeClick(opt.value)}
              className={`px-3 py-1.5 rounded-lg transition ${
                range === opt.value
                  ? 'bg-primary text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="w-full rounded-xl border border-dashed border-slate-200 bg-white/60 py-10 text-center text-sm text-slate-500">
          Chargement des données…
        </div>
      )}

      {!loading && error && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      {showEmptyState && !error && (
        <div className="w-full rounded-xl border border-dashed border-slate-200 bg-white/60 py-10 text-center text-sm text-slate-500">
          Aucune donnée disponible pour cette période.
        </div>
      )}

      {!loading && !showEmptyState && (
      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={prepared} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="timeMs"
              type="number"
              domain={domain}
              ticks={ticks}
              tickFormatter={tickFormatter}
              tick={{ fontSize: 12 }}
              minTickGap={10}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={['auto', 'auto']} tickFormatter={oneDecimal} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={oneDecimal} />
            <YAxis yAxisId="pressure" orientation="right" tick={{ fontSize: 12 }} domain={['auto', 'auto']} tickFormatter={oneDecimal} hide={!visible.pressure} width={visible.pressure ? 48 : 0} />
            <YAxis yAxisId="rain" orientation="right" hide domain={[0, 'auto']} tickFormatter={oneDecimal} />
            <Tooltip
              labelFormatter={(v) => new Date(v).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', weekday: 'short' })}
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
            <Legend
              content={({ payload }) => {
                if (!payload || !payload.length) return null
                const filtered = payload.filter((entry) => (
                  range === '30d' || (entry.dataKey !== 'temperatureMin' && entry.dataKey !== 'temperatureMax')
                ))
                return (
                  <div className="flex flex-wrap gap-3 px-2 text-xs sm:text-sm">
                    {filtered.map((entry) => {
                      const active = visible[entry.dataKey] !== false
                      return (
                        <button
                          key={entry.dataKey}
                          type="button"
                          onClick={() => handleLegendClick(entry)}
                          className={`flex items-center gap-2 transition ${active ? 'text-slate-700' : 'text-slate-400'}`}
                        >
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: entry.color,
                              border: entry.type === 'line' ? `1px solid ${entry.color}` : 'none',
                              opacity: entry.type === 'line' && entry.payload?.strokeDasharray ? 0.7 : 1,
                            }}
                          />
                          <span className={active ? '' : 'line-through opacity-60'}>{entry.value}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              }}
            />
            <Bar yAxisId="rain" dataKey="precipAmount" name="Total intervalle (mm)" fill="#1d4ed8" opacity={0.45} hide={!visible.precipAmount} />
            <Bar yAxisId="rain" dataKey="precipRate" name="Intensité (mm)" fill="#60a5fa" opacity={0.6} hide={!visible.precipRate} />
            <Line yAxisId="rain" type="monotone" dataKey="precipCum" name="Cumul pluie (mm)" stroke="#2563eb" strokeWidth={2} dot={false} hide={!visible.precipCum} />
            <Line yAxisId="left" type="monotone" dataKey="temperature" name="Température (°C)" stroke="#0ea5e9" strokeWidth={2} dot={false} hide={!visible.temperature} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="temperatureMin"
              name="Température min (°C)"
              stroke="#38bdf8"
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
              stroke="#ea580c"
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
              stroke="#6366f1"
              strokeWidth={1.8}
              dot={false}
              hide={!visible.pressure}
            />
            <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidité (%)" stroke="#94a3b8" strokeWidth={2} dot={false} hide={!visible.humidity} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  )
}
