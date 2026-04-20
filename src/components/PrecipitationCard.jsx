import React from 'react';
import { FiClock, FiDroplet, FiCalendar } from 'react-icons/fi';
import RadarMap from './RadarMap';
import { useSettings } from '../context/SettingsContext';

const PrecipitationCard = ({ loading, statusCard, summaryCards, monthlyNormals, currentMonthPrecip, lastUpdate }) => {
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

            <div className="mt-4 flex flex-col gap-4 sm:gap-5">
                <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
                    <div
                        className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-all duration-300 xl:col-span-1 flex flex-col justify-between min-h-[160px] ${statusCard.variant === 'wet'
                            ? 'border-sky-500/50 bg-gradient-to-br from-sky-600 via-blue-600 to-blue-700 text-white shadow-[0_8px_30px_rgb(2,132,199,0.25)]'
                            : 'border-border bg-card'
                            }`}
                    >
                        {statusCard.variant === 'wet' && (
                            <>
                                <div className="weather-rain-container opacity-80">
                                    <div className="weather-rain-layer-1" />
                                    <div className="weather-rain-layer-2" />
                                </div>
                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)] opacity-80 z-0" />
                            </>
                        )}
                        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${statusCard.variant === 'wet' ? 'text-blue-100/70' : 'text-text-muted'}`}>
                                    {t('precip.cumToday', "Aujourd'hui")}
                                </span>
                                <div className={`mt-0.5 flex items-baseline gap-1.5 text-4xl sm:text-5xl font-black tracking-tight ${statusCard.variant === 'wet' ? 'text-white' : 'text-text'}`}>
                                    {statusCard.todayTotal ?? '0'}
                                    {(statusCard.todayTotal != null || statusCard.todayTotal === 0) && <span className={`text-xl sm:text-2xl font-bold ${statusCard.variant === 'wet' ? 'text-white/70' : 'text-text-muted/70'}`}>mm</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    {statusCard.variant === 'wet' ? (
                                        <>
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                            </span>
                                            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-100/90">{t('precip.ongoing', 'Épisode en cours')}</span>
                                        </>
                                    ) : (
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">Pas de pluie actuellement</span>
                                    )}
                                </div>
                                {statusCard.variant === 'wet' && statusCard.description && (
                                    <div className="text-xs font-semibold text-blue-100/80 mt-1">
                                        {statusCard.description}
                                    </div>
                                )}
                            </div>
                            
                            {statusCard.variant === 'wet' && statusCard.rateValue && (
                                <div className={`flex flex-col items-center justify-center rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 min-w-[90px] bg-white/10 shadow-inner border border-white/20 shrink-0`}>
                                    <span className="text-[8.5px] sm:text-[9.5px] font-extrabold uppercase tracking-widest mb-1 text-white/70">Intensité</span>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-xl sm:text-2xl font-black tracking-tight leading-none text-white">{statusCard.rateValue}</span>
                                        <span className="text-[9.5px] sm:text-[10.5px] font-extrabold text-white/80">mm/h</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {statusCard.lastRadar && (
                            <div className={`relative z-10 text-[9.5px] font-bold uppercase tracking-widest mt-auto pt-6 ${statusCard.variant === 'wet' ? 'text-blue-100/60' : 'text-text-muted/50'}`}>
                                Radar : {statusCard.lastRadar.split(' ')[1] || statusCard.lastRadar}
                            </div>
                        )}
                    </div>
                    <div className="rounded-2xl border border-border bg-card shadow-sm flex flex-col overflow-hidden xl:col-span-3">
                        <div className="flex items-center justify-between border-b border-border bg-card-alt/30 px-4 py-3">
                            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-text-muted font-medium">
                                <FiDroplet className="text-sky-500" /> {t('precip.recent_totals', 'Cumuls observés')}
                            </div>
                            {loading && <span className="text-[10px] uppercase tracking-wide text-sky-500 font-medium animate-pulse">{t('app.updating')}</span>}
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-border flex-1 bg-card">
                            {summaryCards.map(({ key, badge, value }) => (
                                <div key={key} className="flex flex-col items-center justify-center p-4 sm:p-5 md:p-6 hover:bg-card-alt/50 transition-colors text-center group cursor-default">
                                    <div className="flex items-center gap-1.5 bg-card-alt border border-border/40 rounded-full px-2.5 py-0.5 mb-2 sm:mb-4 group-hover:border-sky-500/30 transition-colors">
                                        {key === 'month' ? <FiCalendar className="text-sky-500/70 text-[10px]" /> : <FiClock className="text-sky-500/70 text-[10px]" />}
                                        <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-text-muted group-hover:text-sky-500 transition-colors">
                                            {badge}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-0.5 sm:gap-1 text-2xl sm:text-3xl md:text-4xl font-bold text-text">
                                        <span>{value ?? '—'}</span>
                                        {value != null && <span className="text-xs sm:text-sm font-semibold text-text-muted">mm</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {monthlyNormals && monthlyNormals.length === 12 && (
                    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                       <div className="flex items-center justify-between mb-3 gap-2">
                           <div className="text-[10px] sm:text-[11px] uppercase tracking-tight sm:tracking-wide text-text-muted leading-snug">
                               {t('precip.monthly_normals_title', 'Cumuls mensuels moyens')}
                           </div>
                           <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] text-text-muted shrink-0">
                               <div className="flex items-center gap-1.5">
                                   <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-sky-500/20 rounded-[2px]"></div>
                                   <span>Normale</span>
                               </div>
                               {currentMonthPrecip != null && (
                                   <div className="flex items-center gap-1.5">
                                       <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-sky-500 shadow-[0_0_4px_rgba(14,165,233,0.5)] rounded-[2px]"></div>
                                       <span className="hidden sm:inline">Cumul actuel</span>
                                       <span className="sm:hidden">Actuel</span>
                                   </div>
                               )}
                           </div>
                       </div>
                       <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                         <div className="flex items-end justify-between h-28 sm:h-32 gap-3 sm:gap-1 min-w-[350px] sm:min-w-full">
                            {(() => {
                                const globalMaxVal = Math.max(...monthlyNormals, 1);
                                
                                return monthlyNormals.map((val, idx) => {
                                    const isCurrentMonth = new Date().getMonth() === idx;
                                    const mtdVal = isCurrentMonth && currentMonthPrecip != null ? currentMonthPrecip : 0;
                                    const isOverflowing = mtdVal > globalMaxVal;
                                    
                                    const heightPct = (val / globalMaxVal) * 100;
                                    const mtdHeightPct = Math.min((mtdVal / globalMaxVal) * 100, 100);

                                    const monthRaw = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(2024, idx, 1)).replace('.', '');
                                    const monthName = monthRaw.substring(0, 3);
                                    const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

                                    return (
                                        <div key={idx} className="flex flex-col items-center flex-1 gap-1 group relative">
                                           <div className="flex flex-col items-center justify-end h-[24px] sm:h-[28px] pb-1 gap-0.5 z-20">
                                              {isCurrentMonth && currentMonthPrecip != null && (
                                                 <span className="text-[9px] sm:text-[10px] font-bold text-sky-500 whitespace-nowrap leading-none">
                                                    {Math.round(currentMonthPrecip)} mm
                                                 </span>
                                              )}
                                              <span className={`text-[9px] sm:text-[10px] whitespace-nowrap leading-none ${isCurrentMonth && currentMonthPrecip != null ? 'text-text-muted/60' : 'text-text-muted'}`}>
                                                 {val} mm
                                              </span>
                                           </div>
                                           <div className="w-full flex justify-center h-[50px] sm:h-[70px] items-end relative">
                                          {/* Normal Bar */}
                                          <div 
                                             className={`w-full max-w-[12px] sm:max-w-[20px] rounded-t-sm transition-all duration-300 absolute bottom-0 bg-sky-500/20`}
                                             style={{ height: `${Math.max(heightPct, 5)}%` }}
                                          />
                                          {/* MTD Superimposed Bar */}
                                          {isCurrentMonth && currentMonthPrecip != null && (
                                             <div 
                                                className="w-[6px] sm:w-[10px] rounded-t-[2px] transition-all duration-300 absolute bottom-0 bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)] z-10"
                                                style={{ height: `${Math.max(mtdHeightPct, 2)}%` }}
                                                title={`${currentMonthPrecip.toFixed(1)} mm du 1er à aujourd'hui`}
                                             >
                                                {isOverflowing && (
                                                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[14px] sm:w-[20px] h-[6px] sm:h-[8px] -rotate-12 flex flex-col justify-between pointer-events-none">
                                                        <div className="w-full h-[2px] bg-card"></div>
                                                        <div className="w-full h-[2px] bg-card"></div>
                                                    </div>
                                                )}
                                             </div>
                                          )}
                                       </div>
                                       <span className={`text-[10px] sm:text-[11px] font-semibold ${isCurrentMonth ? 'text-sky-500' : 'text-text-muted'}`}>
                                          {capMonth}
                                       </span>
                                    </div>
                                )
                            })
                            })()}
                         </div>
                       </div>
                    </section>
                )}

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
