import React from 'react'
import { WiHumidity, WiStrongWind, WiBarometer, WiRain, WiThermometer } from 'react-icons/wi'
import { HiArrowTrendingUp, HiArrowTrendingDown, HiMinus } from 'react-icons/hi2'
import { useSettings } from '../context/SettingsContext'

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
  trendLabel, // Default handled below via translation
  minValue = null,
  minTime = null,
  normalMin = null,
  maxValue = null,
  maxTime = null,
  normalMax = null,
  children,
}) {
  const { t } = useSettings()

  const Icon = iconMap[type] || (() => null)
  const formatted = formatOneDecimal(value)
  const hasTrend = trendDiff !== null && trendDiff !== undefined && Number.isFinite(Number(trendDiff))
  const formattedTrend = hasTrend ? formatOneDecimal(Math.abs(trendDiff)) : null

  // Use prop or translation default
  const effectiveTrendLabel = trendLabel || t('weather.trend')

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

  const getDiffStyles = (actual, normal) => {
    const diff = Number(actual) - normal;
    if (diff > 1.5) return 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
    if (diff < -1.5) return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
    if (Math.abs(diff) <= 0.5) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
  };

  const formatDiff = (actual, normal) => {
    const diff = Number(actual) - normal;
    return (diff > 0 ? '+' : '') + diff.toFixed(1) + '°';
  };

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
            {effectiveTrendLabel && <div className="text-[10px] text-text-muted">{effectiveTrendLabel}</div>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border border-border bg-card-alt px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wide text-text-muted">{t('weather.min')}</div>
            {normalMin !== null && (
              <div className="text-[10px] text-text-muted/60 font-medium" title="Normale saisonnière">
                Norm. {normalMin}°
              </div>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-base font-semibold text-text">
              {minFormatted !== null ? (
                <span>
                  {minFormatted}
                  {unit ? <span className="ml-1 text-xs font-medium text-text-muted">{unit}</span> : null}
                </span>
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </div>
            {normalMin !== null && minValue !== null && (
              <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm whitespace-nowrap ${getDiffStyles(minValue, normalMin)}`} title="Anomalie">
                {formatDiff(minValue, normalMin)}
              </div>
            )}
          </div>
          {minTimeFormatted && (
            <div className="mt-0.5 text-[11px] text-text-muted">{t('weather.at')} {minTimeFormatted}</div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card-alt px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wide text-text-muted">{t('weather.max')}</div>
            {normalMax !== null && (
              <div className="text-[10px] text-text-muted/60 font-medium" title="Normale saisonnière">
                Norm. {normalMax}°
              </div>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-base font-semibold text-text">
              {maxFormatted !== null ? (
                <span>
                  {maxFormatted}
                  {unit ? <span className="ml-1 text-xs font-medium text-text-muted">{unit}</span> : null}
                </span>
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </div>
            {normalMax !== null && maxValue !== null && (
              <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm whitespace-nowrap ${getDiffStyles(maxValue, normalMax)}`} title="Anomalie">
                {formatDiff(maxValue, normalMax)}
              </div>
            )}
          </div>
          {maxTimeFormatted && (
            <div className="mt-0.5 text-[11px] text-text-muted">{t('weather.at')} {maxTimeFormatted}</div>
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
