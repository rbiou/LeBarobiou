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
  if (value === undefined || value === null || Number.isNaN(Number(value))) return null
  try {
    return Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  } catch {
    return Number(value).toFixed(1)
  }
}

export default function WeatherCard({
  type,
  title,
  value,
  unit,
  trendDiff = null,
  trendUnit,
  trendLabel = 'sur 1h',
  minValue = null,
  minTime = null,
  maxValue = null,
  maxTime = null,
  children,
}) {
  const Icon = iconMap[type] || (() => null)
  const formatted = formatOneDecimal(value)
  const hasTrend = trendDiff !== null && trendDiff !== undefined && Number.isFinite(Number(trendDiff))
  const formattedTrend = hasTrend ? formatOneDecimal(Math.abs(trendDiff)) : null
  const trendSign = hasTrend ? (trendDiff > 0 ? '+' : trendDiff < 0 ? '-' : '') : ''
  const trendTone = trendDiff == null
    ? 'bg-slate-100 text-slate-600'
    : trendDiff > 0
      ? 'bg-emerald-50 text-emerald-700'
      : trendDiff < 0
        ? 'bg-rose-50 text-rose-700'
        : 'bg-slate-100 text-slate-600'
  const minFormatted = formatOneDecimal(minValue)
  const maxFormatted = formatOneDecimal(maxValue)
  const formatTime = (time) => {
    if (!(time instanceof Date) || Number.isNaN(time.getTime())) return null
    try {
      return time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return null
    }
  }
  const minTimeFormatted = formatTime(minTime)
  const maxTimeFormatted = formatTime(maxTime)

  return (
    <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary text-3xl">
            <Icon />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
            <div className="text-3xl font-semibold tracking-tight">
              {formatted !== null ? (
                <span>
                  {formatted}
                  {unit ? <span className="ml-1 text-lg font-medium text-slate-500">{unit}</span> : null}
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>
        </div>

        {hasTrend && (
          <div className={`flex min-w-[96px] flex-col items-end rounded-lg px-3 py-2 text-xs font-semibold ${trendTone}`}>
            <span>
              {trendSign}
              {formattedTrend}
              {trendUnit ? <span className="ml-1 font-medium">{trendUnit}</span> : null}
            </span>
            {trendLabel ? <span className="mt-0.5 text-[10px] font-normal opacity-80">{trendLabel}</span> : null}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Min jour</div>
          <div className="mt-1 text-base font-semibold text-slate-900">
            {minFormatted !== null ? (
              <span>
                {minFormatted}
                {unit ? <span className="ml-1 text-xs font-medium text-slate-500">{unit}</span> : null}
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
          {minTimeFormatted && (
            <div className="mt-0.5 text-[11px] text-slate-500">à {minTimeFormatted}</div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Max jour</div>
          <div className="mt-1 text-base font-semibold text-slate-900">
            {maxFormatted !== null ? (
              <span>
                {maxFormatted}
                {unit ? <span className="ml-1 text-xs font-medium text-slate-500">{unit}</span> : null}
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
          {maxTimeFormatted && (
            <div className="mt-0.5 text-[11px] text-slate-500">à {maxTimeFormatted}</div>
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
