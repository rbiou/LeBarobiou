import React, { useState, useMemo } from 'react'
import { useSettings } from '../context/SettingsContext'
import WeatherChart from './WeatherChart'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'

export default function MosaicBlock({ hourly, hourly7d, dailyHistory, minLoading, historyLoading, error }) {
    const { t, settings } = useSettings()
    const [range, setRange] = useState('day')

    // Shared range for all sub-charts
    const handleRangeChange = (newRange) => {
        setRange(newRange)
    }

    const RANGE_OPTIONS = useMemo(() => [
        { value: 'day', label: t('chart.range.day') },
        { value: '7d', label: t('chart.range.week') },
        { value: '30d', label: t('chart.range.month') },
    ], [t])

    const data = useMemo(() => {
        if (range === 'day') return hourly
        if (range === '7d') return hourly7d
        if (range === '30d') return dailyHistory
        return hourly
    }, [range, hourly, hourly7d, dailyHistory])

    const isLoading = useMemo(() => {
        if (range === '30d') return historyLoading && (!dailyHistory || dailyHistory.length === 0)
        if (range === '7d') return minLoading && (!hourly7d || hourly7d.length === 0)
        return minLoading && (!hourly || hourly.length === 0)
    }, [range, minLoading, historyLoading, hourly, hourly7d, dailyHistory])

    return (
        <div className="rounded-2xl bg-card p-4 sm:p-5 sm:col-span-2 lg:col-span-3">
            {/* Header with Title and Range Selector */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-text-secondary">
                        {t('settings.blocs.mosaic.detailed').replace('{range}',
                            range === 'day' ? t('chart.range.day') : (range === '7d' ? t('chart.range.week') : t('chart.range.month'))
                        )}
                    </div>
                </div>
                <Tabs value={range} onValueChange={handleRangeChange} className="w-full sm:w-64">
                    <TabsList className="w-full h-10 rounded-full bg-muted p-1">
                        {RANGE_OPTIONS.map(({ value, label }) => (
                            <TabsTrigger
                                key={value}
                                value={value}
                                className="flex-1 rounded-full text-xs font-medium data-active:bg-background data-active:text-foreground data-active:shadow-sm"
                            >
                                {label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {/* Mosaic Grid: 1 col mobile, 2 cols tablet+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Tile 1: Temperature */}
                <WeatherChart
                    data={data}
                    range={range}
                    loading={isLoading}
                    error={error}
                    hideControls={true}
                    showLegend={false}
                    title={t('chart.series.temperature')}
                    height={200}
                    forceVisible={{
                        temperature: true,
                        temperatureMin: settings.mosaic?.showTempExtremes ?? true,
                        temperatureMax: settings.mosaic?.showTempExtremes ?? true,
                        humidity: false,
                        pressure: false,
                        precipCum: false,
                        precipAmount: false,
                        precipRate: false
                    }}
                    chartSettings={{
                        showTempExtremes: settings.mosaic?.showTempExtremes ?? true
                    }}
                    className="bg-card-alt border border-border/50 !p-3 shadow-none"
                />

                {/* Tile 2: Precipitation */}
                <WeatherChart
                    data={data}
                    range={range}
                    loading={isLoading}
                    error={error}
                    hideControls={true}
                    showLegend={false}
                    title={t('precip.title')}
                    height={200}
                    forceVisible={{
                        temperature: false,
                        temperatureMin: false,
                        temperatureMax: false,
                        humidity: false,
                        pressure: false,
                        precipCum: true,
                        precipAmount: true,
                        precipRate: false
                    }}
                    chartSettings={{ showTempExtremes: false }}
                    className="bg-card-alt border border-border/50 !p-3 shadow-none"
                />

                {/* Tile 3: Pressure */}
                <WeatherChart
                    data={data}
                    range={range}
                    loading={isLoading}
                    error={error}
                    hideControls={true}
                    showLegend={false}
                    title={t('weather.pressure')}
                    height={200}
                    forceVisible={{
                        temperature: false,
                        temperatureMin: false,
                        temperatureMax: false,
                        humidity: false,
                        pressure: true,
                        precipCum: false,
                        precipAmount: false,
                        precipRate: false
                    }}
                    chartSettings={{ showTempExtremes: false }}
                    className="bg-card-alt border border-border/50 !p-3 shadow-none"
                />

                {/* Tile 4: Humidity */}
                <WeatherChart
                    data={data}
                    range={range}
                    loading={isLoading}
                    error={error}
                    hideControls={true}
                    showLegend={false}
                    title={t('weather.humidity')}
                    height={200}
                    forceVisible={{
                        temperature: false,
                        temperatureMin: false,
                        temperatureMax: false,
                        humidity: true,
                        pressure: false,
                        precipCum: false,
                        precipAmount: false,
                        precipRate: false
                    }}
                    chartSettings={{ showTempExtremes: false }}
                    className="bg-card-alt border border-border/50 !p-3 shadow-none"
                />

            </div>
        </div>
    )
}
