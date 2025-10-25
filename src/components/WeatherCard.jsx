import React from 'react'
import { WiHumidity, WiStrongWind, WiBarometer, WiRain, WiThermometer } from 'react-icons/wi'

const iconMap = {
  temperature: WiThermometer,
  humidity: WiHumidity,
  pressure: WiBarometer,
  wind: WiStrongWind,
  rain: WiRain,
}

export default function WeatherCard({ type, title, value, unit, extra, children }) {
  const Icon = iconMap[type] || (() => null)
  return (
    <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-5 flex items-center gap-4">
      <div className="text-primary text-4xl shrink-0"><Icon /></div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-500">{title}</div>
        <div className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {value !== undefined && value !== null ? (
            <span>{value}{unit ? <span className="text-base text-slate-500 ml-1">{unit}</span> : null}</span>
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
