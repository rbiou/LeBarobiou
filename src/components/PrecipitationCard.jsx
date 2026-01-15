import React from 'react';
import { FiClock, FiDroplet } from 'react-icons/fi';
import RadarMap from './RadarMap';
import { useSettings } from '../context/SettingsContext';

const PrecipitationCard = ({ loading, statusCard, summaryCards, lastUpdate }) => {
    const { t } = useSettings();

    return (
        <div className="rounded-2xl bg-card p-4 shadow-soft sm:p-5 sm:col-span-2 lg:col-span-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium text-text-secondary">{t('precip.title')}</div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                    {loading && (
                        <span className="rounded-full border border-border bg-card-alt px-2 py-0.5 text-[11px] uppercase tracking-wide">
                            {t('app.updating')}
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-4 flex flex-col gap-5">
                <section className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div
                        className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 ${statusCard.variant === 'wet'
                            ? 'border-sky-500/50 bg-gradient-to-br from-sky-600 via-blue-600 to-blue-700 text-white shadow-lg shadow-sky-500/20'
                            : 'border-border bg-card-alt text-text-secondary shadow-inner'
                            }`}
                    >
                        {statusCard.variant === 'wet' && (
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)] opacity-80" />
                        )}
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span
                                        className={`text-[11px] uppercase tracking-wide font-medium ${statusCard.variant === 'wet' ? 'text-blue-100/90' : 'text-text-muted'
                                            }`}
                                    >
                                        {statusCard.title}
                                    </span>
                                    <div className="mt-1 text-lg font-bold leading-tight tracking-tight">
                                        {statusCard.headline}
                                    </div>
                                </div>
                                {statusCard.rateValue && (
                                    <div className="flex items-baseline gap-1 text-4xl font-bold tracking-tight">
                                        <span>{statusCard.rateValue}</span>
                                        {statusCard.rateUnit && (
                                            <span className="text-lg font-medium opacity-80">{statusCard.rateUnit}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {statusCard.description && (
                                <p
                                    className={`text-sm leading-relaxed ${statusCard.variant === 'wet' ? 'text-blue-50/90' : 'text-text-secondary'
                                        }`}
                                >
                                    {statusCard.description}
                                </p>
                            )}

                            {statusCard.metrics.length > 0 && (
                                <div className="grid grid-cols-2 gap-3 mt-1">
                                    {statusCard.metrics.map((metric) => (
                                        <div
                                            key={metric.id}
                                            className={`rounded-xl border backdrop-blur-md px-3 py-3 transition-all ${statusCard.variant === 'wet'
                                                ? 'border-white/20 bg-white/10 text-white shadow-sm'
                                                : 'border-border bg-card text-text-secondary'
                                                }`}
                                        >
                                            <div
                                                className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-medium ${statusCard.variant === 'wet' ? 'text-blue-100/80' : 'text-text-muted'
                                                    }`}
                                            >
                                                {metric.id === 'duration' && <FiClock className="text-base opacity-90" />}
                                                {metric.id === 'total' && <FiDroplet className="text-base opacity-90" />}
                                                <span>{metric.label}</span>
                                            </div>

                                            <div className="mt-1.5 flex items-baseline gap-1 text-xl font-bold tracking-tight">
                                                <span>{metric.value}</span>
                                                {metric.unit && (
                                                    <span
                                                        className={`text-xs font-medium ${statusCard.variant === 'wet' ? 'text-blue-100/80' : 'text-text-muted'
                                                            }`}
                                                    >
                                                        {metric.unit}
                                                    </span>
                                                )}
                                            </div>
                                            {metric.helper && (
                                                <div
                                                    className={`mt-1 text-[11px] font-medium leading-tight ${statusCard.variant === 'wet' ? 'text-blue-100/60' : 'text-text-muted'
                                                        }`}
                                                >
                                                    {metric.helper}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {statusCard.lastRadar && (
                                <div
                                    className={`text-xs mt-1 ${statusCard.variant === 'wet' ? 'text-blue-100/70' : 'text-text-muted'
                                        }`}
                                >
                                    {t('precip.last_update')} {statusCard.lastRadar}
                                </div>
                            )}
                        </div>
                    </div>
                    {summaryCards.map(({ key, badge, value, helper }) => (
                        <div
                            key={key}
                            className="min-h-[160px] rounded-2xl border border-border bg-card p-4 shadow-sm"
                        >
                            <div className="flex h-full flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center rounded-full bg-text px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-bg">
                                        {badge}
                                    </span>
                                    {key !== 'today' && loading && (
                                        <span className="text-[10px] uppercase tracking-wide text-text-muted">{t('app.updating')}</span>
                                    )}
                                </div>

                                <div className="flex flex-col items-start gap-1 pt-2">
                                    <div className="flex items-baseline gap-1 text-3xl font-semibold text-text">
                                        <span>{value ?? '—'}</span>
                                        {value != null && <span className="text-base font-medium text-text-muted">{t('precip.mm')}</span>}
                                    </div>
                                </div>

                                {helper && (
                                    <div className="mt-auto text-xs leading-snug text-text-muted">
                                        {helper}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </section>

                <section className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs text-text-secondary">
                        <span className="uppercase tracking-wide">{t('precip.radar_title')}</span>
                        <span className="text-text-muted">{t('precip.source')}</span>
                    </div>
                    <RadarMap embedded lastUpdate={lastUpdate} />
                </section>
            </div>
        </div>
    );
};

export default PrecipitationCard;
