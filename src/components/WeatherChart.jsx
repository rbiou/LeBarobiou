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

function tickFormatter(value, index, all) {
  const d = new Date(value)
  const h = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const isMidnight = d.getHours() === 0
  const day = d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return isMidnight ? `${day} ${h}` : h
}

export default function WeatherChart({ data }) {
  const [visible, setVisible] = useState({ temperature: true, humidity: true, precip: true, precipCum: true })
  const prepared = useMemo(() => {
    const arr = (data || []).map(d => ({
      timeMs: new Date(d.ts).getTime(),
      temperature: d.temp,
      humidity: d.humidity,
      precip: d.precip ?? 0,
    }))
    // Compute cumulative precipitation over the day
    let cum = 0
    for (const it of arr) {
      cum += Number(it.precip) || 0
      it.precipCum = cum
    }
    return arr
  }, [data])

  const ticks = useMemo(() => {
    if (!prepared.length) return []
    const min = prepared[0].timeMs
    const max = prepared[prepared.length - 1].timeMs
    return makeHourlyTicks(min, max)
  }, [prepared])

  const handleLegendClick = (o) => {
    const key = o.dataKey
    setVisible(v => ({ ...v, [key]: !v[key] }))
  }

  const oneDecimal = (v) => (v == null ? '' : Number(v).toFixed(1))

  return (
    <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-6">
      <div className="text-sm text-slate-500 mb-2">Aujourd'hui (depuis 00:00)</div>
      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={prepared} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="timeMs"
              type="number"
              domain={[prepared[0]?.timeMs || 'dataMin', prepared[prepared.length - 1]?.timeMs || 'dataMax']}
              ticks={ticks}
              tickFormatter={tickFormatter}
              tick={{ fontSize: 12 }}
              minTickGap={10}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={['auto', 'auto']} tickFormatter={oneDecimal} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={oneDecimal} />
            <YAxis yAxisId="rain" orientation="right" hide domain={[0, 'auto']} tickFormatter={oneDecimal} />
            <Tooltip
              labelFormatter={(v) => new Date(v).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', weekday: 'short' })}
              formatter={(value, name) => {
                if (name === 'Température (°C)') return [Number(value).toFixed(1), name]
                if (name === 'Humidité (%)') return [Number(value).toFixed(1), name]
                if (name === 'Précipitations (mm)') return [Number(value).toFixed(1), name]
                if (name === 'Cumul pluie (mm)') return [Number(value).toFixed(1), name]
                return [value, name]
              }}
            />
            <Legend
              onClick={handleLegendClick}
              formatter={(value, entry) => (
                <span style={{ opacity: visible[entry.dataKey] ? 1 : 0.4 }}>{value}</span>
              )}
            />
            <Bar yAxisId="rain" dataKey="precip" name="Précipitations (mm)" fill="#60a5fa" opacity={0.6} hide={!visible.precip} />
            <Line yAxisId="rain" type="monotone" dataKey="precipCum" name="Cumul pluie (mm)" stroke="#2563eb" strokeWidth={2} dot={false} hide={!visible.precipCum} />
            <Line yAxisId="left" type="monotone" dataKey="temperature" name="Température (°C)" stroke="#0ea5e9" strokeWidth={2} dot={false} hide={!visible.temperature} />
            <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidité (%)" stroke="#94a3b8" strokeWidth={2} dot={false} hide={!visible.humidity} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
