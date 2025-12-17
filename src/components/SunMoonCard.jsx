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

                                <div className="flex flex-col gap-3">
                                    {/* Progress bar with times */}
                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                        <span className="font-medium">{formatClock(sun.sunrise)}</span>
                                        <div className="relative flex-1 h-2.5 overflow-hidden rounded-full bg-gradient-to-r from-amber-100 via-sky-100 to-rose-100 dark:from-amber-900/30 dark:via-sky-900/30 dark:to-rose-900/30">
                                            <div
                                                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 via-sky-400 to-rose-400 transition-all duration-500 ease-out"
                                                style={{ width: `${sunSummary.progressPct}%` }}
                                            />
                                            <div
                                                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-slate-700 bg-amber-400 shadow-sm transition-all duration-500 ease-out"
                                                style={{ left: `${sunSummary.progressPct}%` }}
                                            />
                                        </div>
                                        <span className="font-medium">{formatClock(sun.sunset)}</span>
                                    </div>
                                    {/* Status row */}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className={`rounded-full px-2.5 py-1 ${sunSummary.tone} text-xs font-medium`}>{sunSummary.label}</span>
                                        {sunTomorrow?.sunrise ? (
                                            <span className="text-xs text-text-muted">
                                                Demain : {formatClock(sunTomorrow.sunrise)}
                                            </span>
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
                            <div className="flex h-full min-h-[140px] items-center gap-4 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 px-4 py-6">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-cyan-500/20 text-lg font-semibold text-cyan-600 dark:text-cyan-400 shadow-soft">🌑</div>
                                <div className="text-left">
                                    <div className="text-[11px] uppercase tracking-wide text-cyan-600 dark:text-cyan-400">Prochaine nouvelle lune</div>
                                    <div className="text-base font-semibold text-text">{formatDateLabel(moonNextPhases.nextNew)}</div>
                                    <div className="text-[11px] text-cyan-500 dark:text-cyan-300">{formatDaysUntil(moonNextPhases.nextNew)}</div>
                                </div>
                            </div>
                        </div>

                        {moonCycle.progressPct != null ? (
                            <div className="flex flex-col gap-3">
                                {/* Progress bar - full moon to new moon cycle */}
                                <div className="flex items-center gap-2 text-xs">
                                    <span>🌕</span>
                                    <div className="relative flex-1 h-2.5 overflow-hidden rounded-full bg-gradient-to-r from-indigo-200 via-violet-200 to-slate-200 dark:from-indigo-900/50 dark:via-violet-900/50 dark:to-slate-700">
                                        <div
                                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-slate-400 dark:from-indigo-600 dark:to-slate-400 transition-all duration-500 ease-out"
                                            style={{ width: `${moonCycle.progressPct}%` }}
                                        />
                                        <div
                                            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-slate-700 bg-violet-500 shadow-sm transition-all duration-500 ease-out"
                                            style={{ left: `${moonCycle.progressPct}%` }}
                                        />
                                    </div>
                                    <span>🌑</span>
                                </div>
                                {/* Status row */}
                                <div className="flex items-center justify-center">
                                    <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 text-xs font-medium">
                                        {moonCycle.label}
                                    </span>
                                </div>
                            </div>
                        ) : null}

                        {/* Current phase card */}
                        <div className="flex flex-col items-center gap-2 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-700 text-2xl text-white shadow-inner">
                                {moon?.phaseEmoji ?? <WiMoonAltFull />}
                            </div>
                            <div className="text-sm font-semibold text-text">{moon?.phaseName || 'Phase inconnue'}</div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default SunMoonCard;
