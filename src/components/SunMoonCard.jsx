import React from 'react';
import { WiSunrise, WiSunset, WiMoonAltFull } from 'react-icons/wi';
import { formatClock, formatDateLabel, formatDaysUntil } from '../utils/formatters';

const SunMoonCard = ({ sun, sunSummary, sunTomorrow, moon, moonCycle, moonNextPhases }) => {
    return (
        <div className="rounded-2xl bg-card p-4 shadow-soft sm:p-6 sm:col-span-2 lg:col-span-3">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-medium text-text-secondary">Soleil & Lune</div>
                    {sun?.sunrise && sun?.sunset ? (
                        <div className="text-xs text-text-muted">
                            {`Aujourd’hui : ${formatClock(sun.sunrise)} → ${formatClock(sun.sunset)}`}
                        </div>
                    ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Sun Section */}
                    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card-alt p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wide text-text-muted">Soleil</span>
                            {sun?.sunrise && sun?.sunset ? (
                                <span className="text-xs text-text-muted">Durée {sunSummary.lengthLabel}</span>
                            ) : null}
                        </div>

                        {sun?.sunrise && sun?.sunset ? (
                            <>
                                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:items-stretch">
                                    <div className="flex h-full min-h-[140px] items-center gap-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 px-4 py-6">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-amber-500/20 text-amber-500 dark:text-amber-400 shadow-soft">
                                            <WiSunrise className="text-2xl" />
                                        </div>
                                        <div>
                                            <div className="text-[11px] uppercase tracking-wide text-amber-600 dark:text-amber-400">Lever</div>
                                            <div className="text-base font-semibold text-text">{formatClock(sun.sunrise)}</div>
                                        </div>
                                    </div>
                                    <div className="flex h-full min-h-[140px] items-center gap-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 px-4 py-6">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 shadow-soft">
                                            <WiSunset className="text-2xl" />
                                        </div>
                                        <div>
                                            <div className="text-[11px] uppercase tracking-wide text-rose-600 dark:text-rose-400">Coucher</div>
                                            <div className="text-base font-semibold text-text">{formatClock(sun.sunset)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="relative h-3 w-full overflow-hidden rounded-full border border-border bg-gradient-to-r from-slate-100 via-sky-100 to-amber-100 dark:from-slate-800 dark:via-sky-900/30 dark:to-amber-900/30">
                                        <div
                                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400/70 via-amber-300/70 to-rose-400/70 transition-all duration-500 ease-out"
                                            style={{ width: `${sunSummary.progressPct}%` }}
                                        />
                                        <div
                                            className="absolute -top-2 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white dark:border-slate-800 bg-amber-400 shadow transition-all duration-500 ease-out"
                                            style={{ left: `${sunSummary.progressPct}%` }}
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                                        <div className="flex items-center gap-2">
                                            <span>Progression</span>
                                            <span className={`rounded-full px-2 py-0.5 ${sunSummary.tone} text-[11px]`}>{sunSummary.label}</span>
                                        </div>
                                        {sunTomorrow?.sunrise ? (
                                            <div className="text-xs text-text-muted">
                                                Lever demain&nbsp;: {formatClock(sunTomorrow.sunrise)}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="text-sm text-text-secondary">
                                    {`Le soleil s’est levé aujourd’hui à ${formatClock(sun.sunrise)}, se couchera à ${formatClock(sun.sunset)}, et se lèvera demain à ${formatClock(sunTomorrow?.sunrise)}.`}
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-text-muted">Informations solaires indisponibles.</div>
                        )}
                    </section>

                    {/* Moon Section */}
                    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card-alt p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wide text-text-muted">Lune</span>
                            <span className="text-xs text-text-muted">{formatDateLabel(new Date())}</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:items-stretch">
                            <div className="flex h-full min-h-[140px] items-center gap-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 px-4 py-6">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-indigo-500/20 text-lg font-semibold text-indigo-600 dark:text-indigo-400 shadow-soft">🌕</div>
                                <div className="text-left">
                                    <div className="text-[11px] uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Prochaine pleine lune</div>
                                    <div className="text-base font-semibold text-text">{formatDateLabel(moonNextPhases.nextFull)}</div>
                                    <div className="text-[11px] text-indigo-500 dark:text-indigo-300">{formatDaysUntil(moonNextPhases.nextFull)}</div>
                                </div>
                            </div>
                            <div className="flex h-full min-h-[140px] items-center gap-4 rounded-2xl bg-slate-100 dark:bg-slate-700/50 px-4 py-6">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-600 text-lg font-semibold text-slate-700 dark:text-slate-200 shadow-soft">🌑</div>
                                <div className="text-left">
                                    <div className="text-[11px] uppercase tracking-wide text-text-secondary">Prochaine nouvelle lune</div>
                                    <div className="text-base font-semibold text-text">{formatDateLabel(moonNextPhases.nextNew)}</div>
                                    <div className="text-[11px] text-text-muted">{formatDaysUntil(moonNextPhases.nextNew)}</div>
                                </div>
                            </div>
                        </div>

                        {moonCycle.progressPct != null ? (
                            <div className="flex flex-col gap-2">
                                <div className="relative h-3 w-full overflow-hidden rounded-full border border-border bg-gradient-to-r from-slate-900/20 via-indigo-300/30 to-slate-200 dark:from-slate-700 dark:to-slate-800">
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-slate-800 via-indigo-500 to-slate-200/90 dark:from-indigo-600 dark:to-slate-400 transition-all duration-500 ease-out"
                                        style={{ width: `${moonCycle.progressPct}%` }}
                                    />
                                    <div
                                        className="absolute -top-2 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white dark:border-slate-800 bg-slate-900 dark:bg-indigo-400 shadow transition-all duration-500 ease-out"
                                        style={{ left: `${moonCycle.progressPct}%` }}
                                    />
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                                    <span>Cycle lunaire</span>
                                    {moonCycle.label ? (
                                        <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                                            {moonCycle.label}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-700 text-3xl text-white shadow-inner">
                                {moon?.phaseEmoji ?? <WiMoonAltFull />}
                            </div>
                            <div className="text-sm font-semibold text-text">{moon?.phaseName || 'Phase inconnue'}</div>
                            <div className="text-xs text-text-muted">
                                Pleine lune : {formatDateLabel(moonNextPhases.nextFull)} · Nouvelle lune : {formatDateLabel(moonNextPhases.nextNew)}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default SunMoonCard;
