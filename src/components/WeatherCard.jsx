import React from 'react'
import { WiHumidity, WiStrongWind, WiBarometer, WiRain, WiThermometer } from 'react-icons/wi'

const iconMap = {
  temperature: WiThermometer,
  humidity: WiHumidity,
  pressure: WiBarometer,
  wind: WiStrongWind,
  rain: WiRain,
}

function formatOneDecimal(value) {
  if (value === undefined || value === null || isNaN(value)) return null
  try {
    return Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  } catch {
    return Number(value).toFixed(1)
  }
}

export default function WeatherCard({ type, title, value, unit, extra, children }) {
  const Icon = iconMap[type] || (() => null)
  const formatted = formatOneDecimal(value)
  return (
    <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-5 flex items-center gap-4">
      <div className="text-primary text-4xl shrink-0"><Icon /></div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-500">{title}</div>
        <div className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {formatted !== null ? (
            <span>{formatted}{unit ? <span className="text-base text-slate-500 ml-1">{unit}</span> : null}</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
        {extra ? <div className="text-xs text-slate-500 mt-1">{extra}</div> : null}
        {children}
      </div>
    </div>
  )
}
