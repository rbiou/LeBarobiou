import React, { useState } from 'react'
import { FiArrowLeft, FiChevronDown, FiChevronUp, FiCheck } from 'react-icons/fi'
import { WiThermometer, WiRain, WiStrongWind, WiDaySunny, WiTime3 } from 'react-icons/wi'
import { useSettings } from '../context/SettingsContext'

export default function SettingsPage({ onBack }) {
    const { settings, updateSetting, toggleSetting, t } = useSettings()

    return (
        <div className="min-h-screen bg-bg text-text transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur-md border-b border-border">
                <div className="mx-auto container-max px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 rounded-full hover:bg-card-alt transition-colors active:scale-95 duration-200"
                        aria-label={t('settings.back')}
                    >
                        <FiArrowLeft size={22} />
                    </button>
                    <h1 className="text-xl font-semibold tracking-tight">{t('settings.title')}</h1>
                </div>
            </header>

            <main className="mx-auto container-max px-4 py-6 space-y-6 pb-20">

                {/* Language Section - Global */}
                <section className="bg-card rounded-3xl shadow-soft p-5 border border-border/50">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4 px-1">
                        {t('settings.language')}
                    </h2>
                    <div className="flex gap-2 p-1 bg-card-alt rounded-2xl border border-border relative">
                        {['auto', 'fr', 'en'].map((lang) => {
                            const isActive = settings.language === lang
                            return (
                                <button
                                    key={lang}
                                    onClick={() => updateSetting('language', lang)}
                                    className={`
                    flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative z-10
                    ${isActive
                                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                            : 'text-text-secondary hover:text-text hover:bg-black/5 dark:hover:bg-white/5'}
                  `}
                                >
                                    {t(`settings.language.${lang}`)}
                                </button>
                            )
                        })}
                    </div>
                </section>

                {/* Blocs Configuration - List of cards */}
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted px-2">
                        {t('settings.blocs')}
                    </h2>

                    <BlocSettings
                        title={t('settings.blocs.weatherCards')}
                        icon={<WiThermometer className="text-3xl text-orange-500" />}
                        isActive={settings.blocs.weatherCards}
                        onToggle={() => toggleSetting('blocs.weatherCards')}
                    />

                    <BlocSettings
                        title={t('settings.blocs.precipitation')}
                        icon={<WiRain className="text-3xl text-blue-500" />}
                        isActive={settings.blocs.precipitation}
                        onToggle={() => toggleSetting('blocs.precipitation')}
                    />

                    <BlocSettings
                        title={t('settings.blocs.wind')}
                        icon={<WiStrongWind className="text-3xl text-teal-500" />}
                        isActive={settings.blocs.wind}
                        onToggle={() => toggleSetting('blocs.wind')}
                    />

                    <BlocSettings
                        title={t('settings.blocs.sunMoon')}
                        icon={<WiDaySunny className="text-3xl text-amber-500" />}
                        isActive={settings.blocs.sunMoon}
                        onToggle={() => toggleSetting('blocs.sunMoon')}
                    />

                    {/* Chart Bloc with Sub-settings */}
                    <BlocSettings
                        title={t('settings.blocs.chart')}
                        icon={<WiTime3 className="text-3xl text-indigo-500" />}
                        isActive={settings.blocs.chart}
                        onToggle={() => toggleSetting('blocs.chart')}
                        collapsible
                    >
                        <div className="mt-2 space-y-6 pt-4 border-t border-border/50">

                            {/* Show Temp Extremes Toggle */}
                            <SettingsToggle
                                label={t('settings.chart.showTempExtremes')}
                                checked={settings.chart.showTempExtremes}
                                onChange={() => updateSetting('chart', {
                                    ...settings.chart,
                                    showTempExtremes: !settings.chart.showTempExtremes
                                })}
                            />

                            {/* Default Visible Data */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                                    {t('settings.chart.defaults')}
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { key: 'temperature', label: t('chart.series.temperature') },
                                        { key: 'humidity', label: t('chart.series.humidity') },
                                        { key: 'pressure', label: t('chart.series.pressure') },
                                        { key: 'precipAmount', label: t('chart.series.precipCum') },
                                    ].map(({ key, label }) => {
                                        const isAvailable = settings.chart.selectableInLegend[key]
                                        const labelContent = (
                                            <span className="flex items-center justify-between gap-2 w-full">
                                                <span>{label}</span>
                                                {!isAvailable && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold uppercase tracking-wider whitespace-nowrap">
                                                        {t('settings.chart.unavailable')}
                                                    </span>
                                                )}
                                            </span>
                                        )

                                        return (
                                            <Checkbox
                                                key={key}
                                                label={labelContent}
                                                checked={settings.chart.defaultVisible[key]}
                                                disabled={!isAvailable}
                                                onChange={() => {
                                                    if (!isAvailable) return
                                                    updateSetting('chart', {
                                                        ...settings.chart,
                                                        defaultVisible: {
                                                            ...settings.chart.defaultVisible,
                                                            [key]: !settings.chart.defaultVisible[key]
                                                        }
                                                    })
                                                }}
                                            />
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Legend Selectable Data */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                                    {t('settings.chart.legend')}
                                </h3>
                                <div className="text-xs text-text-muted mb-2 opacity-80">
                                    {t('settings.chart.selectableDesc')}
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { key: 'temperature', label: t('chart.series.temperature') },
                                        { key: 'humidity', label: t('chart.series.humidity') },
                                        { key: 'pressure', label: t('chart.series.pressure') },
                                        { key: 'precipAmount', label: t('chart.series.precipCum') },
                                    ].map(({ key, label }) => (
                                        <Checkbox
                                            key={key}
                                            label={label}
                                            checked={settings.chart.selectableInLegend[key]}
                                            onChange={() => {
                                                const newValue = !settings.chart.selectableInLegend[key]
                                                // If disabling availability, also disable default visibility
                                                const newDefaultVisible = newValue
                                                    ? settings.chart.defaultVisible
                                                    : { ...settings.chart.defaultVisible, [key]: false }

                                                updateSetting('chart', {
                                                    ...settings.chart,
                                                    selectableInLegend: {
                                                        ...settings.chart.selectableInLegend,
                                                        [key]: newValue
                                                    },
                                                    defaultVisible: newDefaultVisible
                                                })
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                        </div>
                    </BlocSettings>

                </div>
            </main>
        </div>
    )
}

/**
 * Component for a Bloc Settings Card
 */
function BlocSettings({ title, icon, isActive, onToggle, collapsible = false, children }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const showContent = collapsible && isActive && (isExpanded || true) // Always expanded if active for now, or use toggle

    return (
        <div className={`
      bg-card rounded-3xl shadow-soft border border-border/50 overflow-hidden transition-all duration-300
      ${!isActive ? 'opacity-70 grayscale-[0.5]' : 'opacity-100'}
    `}>
            <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`
            w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-colors
            ${isActive ? 'bg-card-alt shadow-sm' : 'bg-transparent border border-border/50'}
          `}>
                        {icon}
                    </div>
                    <span className="font-semibold text-lg">{title}</span>
                </div>

                <Switch checked={isActive} onChange={onToggle} />
            </div>

            {/* Render children if active and collapsible */}
            {collapsible && isActive && (
                <div className="px-5 pb-5 animate-in slide-in-from-top-2 fade-in duration-300">
                    {children}
                </div>
            )}
        </div>
    )
}

function SettingsToggle({ label, checked, onChange }) {
    return (
        <div className="flex items-center justify-between py-2 cursor-pointer" onClick={onChange}>
            <span className="text-sm font-medium text-text-secondary">{label}</span>
            <Switch checked={checked} onChange={onChange} />
        </div>
    )
}

function Switch({ checked, onChange }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={(e) => {
                e.stopPropagation()
                onChange()
            }}
            className={`
        relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-sm
        ${checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}
      `}
        >
            <span
                className={`
          pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
            />
        </button>
    )
}

function Checkbox({ label, checked, onChange, disabled }) {
    return (
        <button
            type="button"
            className={`
                flex items-center gap-3 p-3 rounded-xl border w-full text-left transition-all active:scale-[0.99]
                ${disabled
                    ? 'bg-card-alt/50 border-border/30 opacity-60 cursor-not-allowed grayscale'
                    : 'bg-card-alt border-border/50 cursor-pointer hover:bg-card-alt/80'
                }
            `}
            onClick={!disabled ? onChange : undefined}
            disabled={disabled}
        >
            <div className={`
        flex items-center justify-center w-5 h-5 rounded-md border transition-all duration-200 shrink-0
        ${checked ? 'bg-primary border-primary text-white' : 'bg-transparent border-text-muted/40'}
      `}>
                {checked && <FiCheck size={14} />}
            </div>
            <span className="text-sm font-medium text-text-secondary flex-1">{label}</span>
        </button>
    )
}
