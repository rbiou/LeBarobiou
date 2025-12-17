import React from 'react'
import { WiHumidity, WiStrongWind, WiBarometer, WiRain, WiThermometer } from 'react-icons/wi'
import { HiArrowTrendingUp, HiArrowTrendingDown, HiMinus } from 'react-icons/hi2'

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

  // Revised Trend Logic: Simple text + icon, no background
  let TrendIcon = HiMinus
  let trendColor = 'text-text-muted'

  if (hasTrend) {
    if (trendDiff > 0) {
      TrendIcon = HiArrowTrendingUp
      trendColor = 'text-emerald-600 dark:text-emerald-400'
    } else if (trendDiff < 0) {
      TrendIcon = HiArrowTrendingDown
      trendColor = 'text-rose-600 dark:text-rose-400'
    }
  }
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
            <div className="text-xs uppercase tracking-wide text-text-muted">{title}</div>
            <div className="text-3xl font-semibold tracking-tight text-text">
              {formatted !== null ? (
                <span>
                  {formatted}
                  {unit ? <span className="ml-1 text-lg font-medium text-text-muted">{unit}</span> : null}
                </span>
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </div>
          </div>
        </div>

        {hasTrend && (
          <div className="flex flex-col items-end">
            <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
              <TrendIcon className="text-base" />
              <span>{formattedTrend}</span>
              {trendUnit && <span className="text-xs font-medium opacity-80">{trendUnit}</span>}
            </div>
            {trendLabel && <div className="text-[10px] text-text-muted">{trendLabel}</div>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border border-border bg-card-alt px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-text-muted">Min jour</div>
          <div className="mt-1 text-base font-semibold text-text">
            {minFormatted !== null ? (
              <span>
                {minFormatted}
                {unit ? <span className="ml-1 text-xs font-medium text-text-muted">{unit}</span> : null}
              </span>
            ) : (
              <span className="text-text-muted">—</span>
            )}
          </div>
          {minTimeFormatted && (
            <div className="mt-0.5 text-[11px] text-text-muted">à {minTimeFormatted}</div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card-alt px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-text-muted">Max jour</div>
          <div className="mt-1 text-base font-semibold text-text">
            {maxFormatted !== null ? (
              <span>
                {maxFormatted}
                {unit ? <span className="ml-1 text-xs font-medium text-text-muted">{unit}</span> : null}
              </span>
            ) : (
              <span className="text-text-muted">—</span>
            )}
          </div>
          {maxTimeFormatted && (
            <div className="mt-0.5 text-[11px] text-text-muted">à {maxTimeFormatted}</div>
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
