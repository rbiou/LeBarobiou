import React from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

function formatHour(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function WeatherChart({ data }) {
  const clean = (data || []).map(d => ({
    time: formatHour(d.ts),
    temperature: d.temp,
    humidity: d.humidity,
  }))
  return (
    <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-6">
      <div className="text-sm text-slate-500 mb-2">Dernières 24h</div>
      <div className="w-full h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={clean} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} minTickGap={20} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} />
            <Tooltip formatter={(v, n) => [v, n === 'Température (°C)' ? 'Température (°C)' : 'Humidité (%)']} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="temperature" name="Température (°C)" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidité (%)" stroke="#94a3b8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
