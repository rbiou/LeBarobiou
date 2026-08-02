import React from 'react';
import { WiSunrise, WiMoonAltFull } from 'react-icons/wi';
import { Sun, Moon } from 'lucide-react';
import { formatClock, formatDateLabel, formatDaysUntil } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';
import { detectBrowserLanguage } from '../utils/i18n';
import { Card, CardContent } from './ui/card';

const SunMoonCard = ({ sun, sunSummary, sunTomorrow, moon, moonCycle, moonNextPhases }) => {
    const { settings, t } = useSettings();
    const locale = settings.language === 'auto' ? detectBrowserLanguage() : (settings.language === 'en' ? 'en-US' : 'fr-FR');

    return (
        <Card className="p-4 sm:p-6 sm:col-span-2 lg:col-span-3">
            <CardContent className="p-0 flex flex-col gap-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-medium text-secondary-foreground">{t('sun.title', 'Soleil et Lune')}</div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* SUN BENTO */}
                    <section className="relative overflow-hidden rounded-2xl border border-border bg-muted p-5 flex flex-col justify-between min-h-[160px]">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-2 text-muted-foreground font-semibold tracking-wide uppercase text-[10px] sm:text-[11px]">
                                <Sun className="size-4" /> {t('sun.sun_title', 'Soleil')}
                            </div>
                            {sun?.sunrise && sun?.sunset && (
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    {t('sun.duration', 'Durée :')} {sunSummary.lengthLabel}
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        {sun?.sunrise && sun?.sunset ? (
                            <div className="flex flex-col flex-1 justify-center gap-6 relative z-10">
                                {/* Status Label (Matin, Après-midi, etc) */}
                                <div className="flex justify-center">
                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold shadow-inner border border-white/50 dark:border-white/10 ${sunSummary.tone}`}>
                                        {sunSummary.label}
                                    </span>
                                </div>

                                {/* Enhanced Progress Bar */}
                                <div className="flex flex-col gap-2">
                                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-chart-2/30 via-chart-1/30 to-chart-3/30 shadow-inner">
                                        <div
                                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-chart-2 via-chart-1 to-chart-3 transition-all duration-1000 ease-out"
                                            style={{ width: `${sunSummary.progressPct}%` }}
                                        />
                                        <div
                                            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-chart-2 shadow-sm transition-all duration-1000 ease-out z-10"
                                            style={{ 
                                                left: `${sunSummary.progressPct}%`,
                                                backgroundColor: sunSummary.progressPct > 50 ? '#fb923c' : '#fbbf24'
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mt-1 px-1">
                                        <div className="flex flex-col">
                                            <span className="text-[9.5px] font-semibold text-muted-foreground uppercase">{t('sun.rise')}</span>
                                            <span className="text-base font-bold tracking-tight text-foreground">{formatClock(sun.sunrise, locale)}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[9.5px] font-semibold text-muted-foreground uppercase">{t('sun.set')}</span>
                                            <span className="text-base font-bold tracking-tight text-foreground">{formatClock(sun.sunset, locale)}</span>
                                        </div>
                                    </div>
                                </div>

                                {sunTomorrow?.sunrise && (
                                    <div className="text-[10.5px] font-medium text-muted-foreground text-center flex items-center justify-center gap-1 -mt-1 pb-1">
                                        <WiSunrise className="text-base opacity-70" /> {t('sun.tomorrow')} : {formatClock(sunTomorrow.sunrise, locale)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-1 items-center justify-center text-sm font-medium text-muted-foreground">{t('sun.unavailable')}</div>
                        )}
                        
                        {/* Subtle Amber Glow */}
                        <div className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-chart-2/5 blur-3xl" />
                    </section>

                    {/* MOON BENTO */}
                    <section className="relative overflow-hidden rounded-2xl border border-border bg-muted p-5 flex flex-col justify-between min-h-[160px]">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-2 text-muted-foreground font-semibold tracking-wide uppercase text-[10px] sm:text-[11px]">
                                <Moon className="size-4" /> {t('moon.moon_title')}
                            </div>
                            {moonCycle.label && (
                                <div className="text-[10px] font-bold text-chart-4/80 uppercase tracking-wider bg-chart-4/10 px-2 py-0.5 rounded-full border border-chart-4/20">
                                    {moonCycle.label}
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        <div className="flex flex-col flex-1 justify-center gap-6 relative z-10">
                            {/* Big Sexy Moon */}
                            <div className="flex flex-col items-center justify-center gap-1.5 pt-2">
                                <div className="text-6xl drop-shadow-md transform transition-transform hover:scale-105 duration-300">
                                    {moon?.phaseEmoji ?? <WiMoonAltFull />}
                                </div>
                                <div className="text-[13px] font-bold tracking-tight text-foreground mt-1">
                                    {moon?.phaseKey ? t(`moon.phase.${moon.phaseKey}`) : (moon?.phaseName || t('moon.phase_unknown'))}
                                </div>
                            </div>

                            {/* Next Phases Divider & Stats */}
                            <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-border/70">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[9.5px] font-semibold text-muted-foreground uppercase tracking-wider">{t('moon.next_full')} 🌕</span>
                                    <span className="text-sm font-bold text-foreground">{formatDateLabel(moonNextPhases.nextFull, locale)}</span>
                                    <span className="text-[10px] font-medium text-secondary-foreground">{formatDaysUntil(moonNextPhases.nextFull, t)}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 text-right">
                                    <span className="text-[9.5px] font-semibold text-muted-foreground uppercase tracking-wider">🌑 {t('moon.next_new')}</span>
                                    <span className="text-sm font-bold text-foreground">{formatDateLabel(moonNextPhases.nextNew, locale)}</span>
                                    <span className="text-[10px] font-medium text-secondary-foreground">{formatDaysUntil(moonNextPhases.nextNew, t)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Subtle Indigo Glow */}
                        <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-chart-4/5 blur-3xl" />
                    </section>
                </div>
            </CardContent>
        </Card>
    );
};

export default SunMoonCard;