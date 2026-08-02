import React, { useState, useEffect } from 'react'
import { ArrowLeft, Check, GripVertical, LayoutGrid, Globe, Thermometer, CloudRain, Wind, Sun, Clock } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select'
import { Switch } from './ui/switch'
import { Checkbox } from './ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    TouchSensor
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SettingsPage({ onBack }) {
    const { settings, updateSetting, toggleSetting, t } = useSettings()

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    )

    const [activeDragId, setActiveDragId] = useState(null)

    const handleDragStart = (event) => {
        setActiveDragId(event.active.id)
    }

    const handleDragEnd = (event) => {
        const { active, over } = event
        setActiveDragId(null)

        if (over && active.id !== over.id) {
            const oldIndex = settings.blocOrder.indexOf(active.id)
            const newIndex = settings.blocOrder.indexOf(over.id)

            const newOrder = arrayMove(settings.blocOrder, oldIndex, newIndex)
            updateSetting('blocOrder', newOrder)
        }
    }

    const handleDragCancel = () => {
        setActiveDragId(null)
    }

    // Default order fallback
    const effectiveOrder = settings.blocOrder && settings.blocOrder.length > 0
        ? settings.blocOrder
        : ['weatherCards', 'precipitation', 'wind', 'sunMoon', 'chart']

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
                <div className="mx-auto container-max px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors active:scale-95 duration-200"
                        aria-label={t('settings.back')}
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <h1 className="text-xl font-semibold tracking-tight">{t('settings.title')}</h1>
                </div>
            </header>

            <main className="mx-auto container-max px-4 py-6 space-y-6 pb-20">

                {/* Language Section - Global */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('settings.language')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select
                            value={settings.language}
                            onValueChange={(val) => updateSetting('language', val)}
                        >
                            <SelectTrigger className="w-full">
                                <span className="flex flex-1 items-center text-left">
                                    {settings.language === 'auto' ? t('settings.language.auto') : t(`settings.language.${settings.language}`)}
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">
                                    <Globe className="size-4" />
                                    {t('settings.language.auto')}
                                </SelectItem>
                                <SelectItem value="fr">{t('settings.language.fr')}</SelectItem>
                                <SelectItem value="en">{t('settings.language.en')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Weather Model Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('settings.weatherModel')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <Select
                            value={settings.weatherModel || 'auto'}
                            onValueChange={(val) => updateSetting('weatherModel', val)}
                        >
                            <SelectTrigger className="w-full">
                                <span className="flex flex-1 items-center text-left">
                                    {settings.weatherModel === 'auto' || !settings.weatherModel ? t('settings.weatherModel.auto') : t(`settings.weatherModel.${settings.weatherModel}`)}
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">{t('settings.weatherModel.auto')}</SelectItem>
                                <SelectItem value="meteofrance_seamless">{t('settings.weatherModel.meteofrance_seamless')}</SelectItem>
                                <SelectItem value="icon_seamless">{t('settings.weatherModel.icon_seamless')}</SelectItem>
                                <SelectItem value="gfs_seamless">{t('settings.weatherModel.gfs_seamless')}</SelectItem>
                                <SelectItem value="ecmwf_ifs04">{t('settings.weatherModel.ecmwf_ifs04')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {t('settings.weatherModel.desc')}
                        </p>
                    </CardContent>
                </Card>

                {/* Blocs Configuration - List of cards */}
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-2">
                        {t('settings.blocs')}
                    </h2>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                    >
                        <SortableContext
                            items={effectiveOrder}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-4">
                                {effectiveOrder.map((key) => {
                                    if (key === 'forecast') {
                                        return (
                                            <SortableBlocItem key={key} id={key}>
                                                <BlocSettings
                                                    title={t('settings.blocs.forecast')}
                                                    icon={<Sun className="size-6 text-amber-500" />}
                                                    isActive={settings.blocs.forecast}
                                                    onToggle={() => toggleSetting('blocs.forecast')}
                                                    collapsible
                                                    isGlobalDragActive={!!activeDragId}
                                                >
                                                    <div className="mt-2 space-y-6 pt-4 border-t border-border/50">
                                                        <SettingsToggle
                                                            label={t('forecast.autoExpand')}
                                                            checked={settings.forecast?.autoExpandToday ?? true}
                                                            onChange={() => updateSetting('forecast', {
                                                                ...settings.forecast,
                                                                autoExpandToday: !settings.forecast?.autoExpandToday
                                                            })}
                                                        />
                                                    </div>
                                                </BlocSettings>
                                            </SortableBlocItem>
                                        )
                                    }
                                    if (key === 'weatherCards') {
                                        return (
                                            <SortableBlocItem key={key} id={key}>
                                                <BlocSettings
                                                    title={t('settings.blocs.weatherCards')}
                                                    icon={<Thermometer className="size-6 text-orange-500" />}
                                                    isActive={settings.blocs.weatherCards}
                                                    onToggle={() => toggleSetting('blocs.weatherCards')}
                                                    isGlobalDragActive={!!activeDragId}
                                                />
                                            </SortableBlocItem>
                                        )
                                    }
                                    if (key === 'precipitation') {
                                        return (
                                            <SortableBlocItem key={key} id={key}>
                                                <BlocSettings
                                                    title={t('settings.blocs.precipitation')}
                                                    icon={<CloudRain className="size-6 text-blue-500" />}
                                                    isActive={settings.blocs.precipitation}
                                                    onToggle={() => toggleSetting('blocs.precipitation')}
                                                    isGlobalDragActive={!!activeDragId}
                                                />
                                            </SortableBlocItem>
                                        )
                                    }
                                    if (key === 'wind') {
                                        return (
                                            <SortableBlocItem key={key} id={key}>
                                                <BlocSettings
                                                    title={t('settings.blocs.wind')}
                                                    icon={<Wind className="size-6 text-teal-500" />}
                                                    isActive={settings.blocs.wind}
                                                    onToggle={() => toggleSetting('blocs.wind')}
                                                    isGlobalDragActive={!!activeDragId}
                                                />
                                            </SortableBlocItem>
                                        )
                                    }
                                    if (key === 'sunMoon') {
                                        return (
                                            <SortableBlocItem key={key} id={key}>
                                                <BlocSettings
                                                    title={t('settings.blocs.sunMoon')}
                                                    icon={<Sun className="size-6 text-amber-500" />}
                                                    isActive={settings.blocs.sunMoon}
                                                    onToggle={() => toggleSetting('blocs.sunMoon')}
                                                    isGlobalDragActive={!!activeDragId}
                                                />
                                            </SortableBlocItem>
                                        )
                                    }
                                    if (key === 'chart') {
                                        return (
                                            <SortableBlocItem key={key} id={key}>
                                                <BlocSettings
                                                    title={t('settings.blocs.chart')}
                                                    icon={<Clock className="size-6 text-indigo-500" />}
                                                    isActive={settings.blocs.chart}
                                                    onToggle={() => toggleSetting('blocs.chart')}
                                                    collapsible
                                                    isGlobalDragActive={!!activeDragId}
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
                                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                                {t('settings.chart.defaults')}
                                                            </h3>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {[
                                                                    { key: 'temperature', label: t('chart.series.temperature') },
                                                                    { key: 'humidity', label: t('chart.series.humidity') },
                                                                    { key: 'pressure', label: t('chart.series.pressure') },
                                                                    { key: 'precipAmount', label: t('chart.series.precipRain') },
                                                                    { key: 'precipCum', label: t('chart.series.precipCum') },
                                                                ].map(({ key, label }) => {
                                                                    const isAvailable = settings.chart.selectableInLegend[key]
                                                                    const labelContent = (
                                                                        <span className="flex items-center justify-between gap-2 w-full">
                                                                            <span>{label}</span>
                                                                            {!isAvailable && (
                                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold uppercase tracking-wider whitespace-nowrap">
                                                                                    {t('settings.chart.unavailable')}
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    )

                                                                    return (
                                                                        <label
                                                                            key={key}
                                                                            className={`flex items-center gap-3 p-3 rounded-xl border w-full text-left transition-all active:scale-[0.99] ${!isAvailable
                                                                                ? 'bg-muted/50 border-border/30 opacity-60 cursor-not-allowed grayscale'
                                                                                : 'bg-muted border-border/50 cursor-pointer hover:bg-muted/80'
                                                                                }`}
                                                                        >
                                                                            <Checkbox
                                                                                checked={settings.chart.defaultVisible[key]}
                                                                                disabled={!isAvailable}
                                                                                onCheckedChange={() => {
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
                                                                            <span className="text-sm font-medium text-secondary-foreground flex-1">{labelContent}</span>
                                                                        </label>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Legend Selectable Data */}
                                                        <div className="space-y-3">
                                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                                {t('settings.chart.legend')}
                                                            </h3>
                                                            <div className="text-xs text-muted-foreground mb-2 opacity-80">
                                                                {t('settings.chart.selectableDesc')}
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {[
                                                                    { key: 'temperature', label: t('chart.series.temperature') },
                                                                    { key: 'humidity', label: t('chart.series.humidity') },
                                                                    { key: 'pressure', label: t('chart.series.pressure') },
                                                                    { key: 'precipAmount', label: t('chart.series.precipRain') },
                                                                    { key: 'precipCum', label: t('chart.series.precipCum') },
                                                                ].map(({ key, label }) => (
                                                                    <label
                                                                        key={key}
                                                                        className="flex items-center gap-3 p-3 rounded-xl border w-full text-left transition-all active:scale-[0.99] bg-muted border-border/50 cursor-pointer hover:bg-muted/80"
                                                                    >
                                                                        <Checkbox
                                                                            checked={settings.chart.selectableInLegend[key]}
                                                                            onCheckedChange={() => {
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
                                                                        <span className="text-sm font-medium text-secondary-foreground flex-1">{label}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                    </div>
                                                </BlocSettings>
                                            </SortableBlocItem>
                                        )
                                    }
                                    if (key === 'mosaic') {
                                        return (
                                            <SortableBlocItem key={key} id={key}>
                                                <BlocSettings
                                                    title={t('settings.blocs.mosaic')}
                                                    icon={<LayoutGrid className="size-6 text-purple-500" />}
                                                    isActive={settings.blocs.mosaic}
                                                    onToggle={() => toggleSetting('blocs.mosaic')}
                                                    collapsible
                                                    isGlobalDragActive={!!activeDragId}
                                                >
                                                    <div className="mt-2 space-y-6 pt-4 border-t border-border/50">
                                                        <SettingsToggle
                                                            label={t('settings.chart.showTempExtremes')}
                                                            checked={settings.mosaic?.showTempExtremes ?? true}
                                                            onChange={() => updateSetting('mosaic', {
                                                                ...settings.mosaic,
                                                                showTempExtremes: !settings.mosaic?.showTempExtremes
                                                            })}
                                                        />
                                                    </div>
                                                </BlocSettings>
                                            </SortableBlocItem>
                                        )
                                    }
                                })}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </main>
        </div>
    )
}

function SortableBlocItem({ id, children }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: 'relative',
    }

    return (
        <div ref={setNodeRef} style={style}>
            {React.cloneElement(children, {
                isDragging,
                dragHandle: (
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-2 -ml-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors touch-none"
                    >
                        <GripVertical size={20} />
                    </div>
                )
            })}
        </div>
    )
}

function BlocSettings({ title, icon, isActive, onToggle, collapsible = false, children, dragHandle, isDragging, isGlobalDragActive }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const showContent = collapsible && isActive && (isExpanded || true) // Always expanded if active for now, or use toggle

    return (
        <div className={`
      bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden transition-all duration-300
      ${!isActive ? 'opacity-70 grayscale-[0.5]' : 'opacity-100'}
      ${isDragging ? 'shadow-xl scale-[1.02] ring-2 ring-primary/50 opacity-90' : ''}
    `}>
            <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {dragHandle}
                    <div className={`
            w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-colors
            ${isActive ? 'bg-muted shadow-sm' : 'bg-transparent border border-border/50'}
          `}>
                        {icon}
                    </div>
                    <span className="font-semibold text-lg">{title}</span>
                </div>

                <Switch checked={isActive} onCheckedChange={onToggle} />
            </div>

            {/* Render children if active and collapsible - HIDE when dragging (local or global) */}
            {collapsible && isActive && !isDragging && !isGlobalDragActive && (
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
            <span className="text-sm font-medium text-secondary-foreground">{label}</span>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    )
}