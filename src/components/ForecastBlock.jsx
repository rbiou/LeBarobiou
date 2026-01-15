import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { fetchForecast, getWeatherInfo } from '../api/openMeteo';
import * as WeatherIcons from 'react-icons/wi';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// Hook for scroll logic
function useScrollable() {
    const ref = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = () => {
        if (ref.current) {
            const { scrollLeft, scrollWidth, clientWidth } = ref.current;
            setCanScrollLeft(scrollLeft > 10);
            // Tolerance for rounding errors
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, []);

    const scroll = (direction) => {
        if (ref.current) {
            const scrollAmount = 200;
            ref.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return { ref, canScrollLeft, canScrollRight, scroll, checkScroll };
}

// Reusable Scroll Button Component
const ScrollArrow = ({ direction, onClick }) => (
    <div className={`absolute ${direction === 'left' ? 'left-0 bg-gradient-to-r from-card via-card' : 'right-0 bg-gradient-to-l from-card via-card'} top-0 bottom-0 z-10 flex items-center to-transparent ${direction === 'left' ? 'pl-0 pr-6' : 'pr-0 pl-6'}`}>
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="p-1 rounded-full bg-card-alt border border-border/50 shadow-sm hover:bg-card-alt/80 text-text-muted hover:text-text transition-colors"
        >
            {direction === 'left' ? <FiChevronLeft size={14} /> : <FiChevronRight size={14} />}
        </button>
    </div>
);

export default function ForecastBlock({ lat, lon, lastUpdate }) {
    const { t, settings } = useSettings();
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(null); // Tracks currently active day

    // Scroll Hooks
    const daysScroll = useScrollable();
    const hoursScroll = useScrollable();

    // Refs for synchronization
    const timelineRef = useRef(null); // Ref for the scrolling container
    const daysRefs = useRef([]); // Refs for each day section in the timeline
    const isClickScrolling = useRef(false); // Lock to prevent circular updates during click-scroll

    useEffect(() => {
        if (!lat || !lon) return;

        let isMounted = true;
        setLoading(true);

        fetchForecast(lat, lon, settings.weatherModel)
            .then(data => {
                if (isMounted) {
                    if (data) {
                        setForecast(data);
                        // Default to today
                        if (settings.forecast?.autoExpandToday) {
                            setSelectedIndex(0);
                        } else {
                            // Even if not auto-expanded, we might want to select 0 to show something, 
                            // or keep it null.
                            setSelectedIndex(0); // Always default to 0 for the continuous timeline view
                        }
                    }
                    else setError(t('app.noData'));
                    setLoading(false);
                }
            })
            .catch(err => {
                if (isMounted) {
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => { isMounted = false; };
    }, [lat, lon, settings.forecast?.autoExpandToday, settings.weatherModel, lastUpdate, t]);

    // Prepare Timeline Data (Grouping hours by day)
    const timelineData = useMemo(() => {
        if (!forecast) return [];

        const now = new Date();
        const currentHour = now.getHours();

        return forecast.map((day, index) => {
            const isToday = new Date(day.date).toDateString() === now.toDateString();

            let hours = day.hours || [];
            if (isToday) {
                hours = hours.filter(h => new Date(h.time).getHours() >= currentHour);
            }

            return {
                ...day,
                displayHours: hours,
                originalIndex: index
            };
        });
    }, [forecast]);

    // Sync: Update selectedIndex on scroll based on position
    useEffect(() => {
        const container = hoursScroll.ref.current;
        if (!container) return;

        const handleScrollSync = () => {
            if (isClickScrolling.current) return;

            const scrollLeft = container.scrollLeft;
            // Define a trigger point slightly into the view (e.g., 50px)
            // This ensures we switch to the next day when it "enters" the main reading area
            const triggerPoint = scrollLeft + 50;

            let activeIndex = selectedIndex;
            let found = false;

            for (let i = 0; i < timelineData.length; i++) {
                const el = daysRefs.current[i];
                if (!el) continue;

                // Check if the trigger point is within this element's horizontal range
                // Note: offsetLeft is relative to the scroll container's content start
                if (el.offsetLeft <= triggerPoint && (el.offsetLeft + el.offsetWidth) > triggerPoint) {
                    activeIndex = i;
                    found = true;
                    break;
                }
            }

            if (found && activeIndex !== selectedIndex) {
                setSelectedIndex(activeIndex);
            }
        };

        // Attach listener specifically for sync (in addition to the scrollable hook's listener)
        container.addEventListener('scroll', handleScrollSync, { passive: true });
        // Initial check
        handleScrollSync();

        return () => container.removeEventListener('scroll', handleScrollSync);
    }, [timelineData, selectedIndex, hoursScroll.ref]);

    // Sync: Scroll to section when selectedIndex changes (via click)
    const handleDayClick = (index) => {
        if (index === selectedIndex) return; // Already there

        setSelectedIndex(index);
        isClickScrolling.current = true;

        const targetEl = daysRefs.current[index];
        const container = hoursScroll.ref.current;

        if (targetEl && container) {
            // Calculate offset to align left
            const offsetLeft = targetEl.offsetLeft - container.offsetLeft;
            container.scrollTo({
                left: offsetLeft,
                behavior: 'smooth'
            });

            // Unlock after animation
            setTimeout(() => {
                isClickScrolling.current = false;
            }, 600);
        }
    };

    // Helper to get day name
    const getDayName = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);

        if (d.getTime() === today.getTime()) return t('date.today');

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        if (d.getTime() === tomorrow.getTime()) return t('date.tomorrow');

        const options = { weekday: 'long', day: 'numeric' };
        let name = d.toLocaleDateString(settings.language === 'en' ? 'en-US' : 'fr-FR', options);
        // Capitalize first letter
        name = name.charAt(0).toUpperCase() + name.slice(1);
        return name;
    };

    // Helper for separator text
    const getSeparatorText = (date) => {
        const d = new Date(date);
        const weekday = d.toLocaleDateString(settings.language === 'en' ? 'en-US' : 'fr-FR', { weekday: 'short' }).replace('.', '');
        const dayNum = d.getDate();
        return `${weekday} ${dayNum}`;
    };

    // Helper to format hour
    const formatHour = (isoString) => {
        const d = new Date(isoString);
        return `${d.getHours()}h`;
    };

    if (!forecast && loading) return (
        <div className="rounded-2xl bg-card p-6 shadow-soft h-40 flex items-center justify-center">
            <span className="text-text-muted text-sm animate-pulse">{t('app.loading')}</span>
        </div>
    );

    if (error || !forecast) return null;

    return (
        <section className="bg-card rounded-2xl shadow-soft p-4 sm:p-5 overflow-hidden transition-all duration-300 relative group">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted px-1">
                    {t('forecast.title')}
                </h2>
                <div className="text-xs text-text-muted">
                    {t('forecast.source')}
                </div>
            </div>

            {/* MASTER LIST: 7 Days - Scrollable Area */}
            <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
                {daysScroll.canScrollLeft && <ScrollArrow direction="left" onClick={() => daysScroll.scroll('left')} />}

                <div
                    ref={daysScroll.ref}
                    onScroll={daysScroll.checkScroll}
                    className="flex overflow-x-auto pb-2 gap-3 scrollbar-hide snap-x mb-2 no-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {forecast.map((day, index) => {
                        const isSelected = selectedIndex === index;
                        const morning = day.morning;
                        const afternoon = day.afternoon;

                        const morningInfo = morning ? getWeatherInfo(morning.weatherCode) : null;
                        const afternoonInfo = afternoon ? getWeatherInfo(afternoon.weatherCode) : null;

                        const MorningIcon = morningInfo ? (WeatherIcons[morningInfo.icon] || WeatherIcons.WiNa) : WeatherIcons.WiNa;
                        const AfternoonIcon = afternoonInfo ? (WeatherIcons[afternoonInfo.icon] || WeatherIcons.WiNa) : WeatherIcons.WiNa;

                        return (
                            <div
                                key={index}
                                onClick={() => handleDayClick(index)}
                                className={`flex-none w-[130px] sm:w-[140px] snap-center flex flex-col rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${isSelected ? 'bg-card-alt ring-2 ring-primary/20 border-primary' : 'bg-bg/40 border-border/50 hover:bg-bg/60'}`}
                            >
                                {/* Day Header */}
                                <div className={`py-2 px-1 flex flex-col items-center justify-center gap-0.5 border-b border-border/30 transition-colors ${isSelected ? 'bg-primary/5' : 'bg-card-alt/50'}`}>
                                    <span className={`text-[11px] font-bold uppercase tracking-wider text-center truncate w-full ${isSelected ? 'text-primary' : 'text-text-secondary'}`}>
                                        {getDayName(day.date)}
                                    </span>
                                    <div className="text-[10px] font-medium flex gap-1.5 items-center">
                                        <span className="text-blue-400">{Math.round(day.dayTempMin)}°</span>
                                        <span className="text-border">/</span>
                                        <span className="text-red-400">{Math.round(day.dayTempMax)}°</span>
                                    </div>
                                </div>

                                <div className="flex flex-col flex-1 divide-y divide-border/30">
                                    <div className="flex divide-x divide-border/30">
                                        {/* Morning */}
                                        <div className={`flex flex-col items-center justify-center p-2 gap-1 flex-1 ${morning ? '' : 'opacity-50'}`}>
                                            <div className="h-6 flex items-center justify-center">
                                                {morning ? <MorningIcon className={`text-xl ${morningInfo.style}`} /> : <span className="text-xs">-</span>}
                                            </div>
                                            {morning && morning.precipProb > 20 && <span className="text-[9px] font-bold text-blue-400">{morning.precipProb}%</span>}
                                        </div>
                                        {/* Afternoon */}
                                        <div className={`flex flex-col items-center justify-center p-2 gap-1 flex-1 ${afternoon ? '' : 'opacity-50'}`}>
                                            <div className="h-6 flex items-center justify-center">
                                                {afternoon ? <AfternoonIcon className={`text-xl ${afternoonInfo.style}`} /> : <span className="text-xs">-</span>}
                                            </div>
                                            {afternoon && afternoon.precipProb > 20 && <span className="text-[9px] font-bold text-blue-500">{afternoon.precipProb}%</span>}
                                        </div>
                                    </div>
                                </div>

                                {isSelected && <div className="h-1 bg-primary w-full" />}
                            </div>
                        );
                    })}
                </div>

                {daysScroll.canScrollRight && <ScrollArrow direction="right" onClick={() => daysScroll.scroll('right')} />}
            </div>

            {/* CONTINUOUS TIMELINE VIEW */}
            {(
                <div
                    className="mt-2 bg-bg/40 rounded-xl p-3 border border-border/50 animate-in slide-in-from-top-2 fade-in duration-300 relative"
                >
                    {hoursScroll.canScrollLeft && <ScrollArrow direction="left" onClick={() => hoursScroll.scroll('left')} />}

                    <div
                        ref={hoursScroll.ref}
                        onScroll={hoursScroll.checkScroll}
                        className="flex overflow-x-auto gap-0 pb-1 scrollbar-hide snap-x w-full items-end no-scrollbar"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {timelineData.map((day, dayIndex) => {
                            if (day.displayHours.length === 0) return null;

                            return (
                                <div
                                    key={dayIndex}
                                    ref={el => daysRefs.current[dayIndex] = el}
                                    data-index={dayIndex}
                                    className="flex items-end flex-none"
                                >
                                    {/* Separator */}
                                    {dayIndex > 0 && (
                                        <div className="flex-none flex flex-col items-center justify-end self-stretch gap-2 mx-1 -mb-1 pb-1 opacity-70">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted/60 whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                                {getSeparatorText(day.date)}
                                            </span>
                                            <div className="w-px h-8 bg-gradient-to-b from-border/10 to-border/40" />
                                        </div>
                                    )}

                                    {day.displayHours.map((h, i) => {
                                        const info = getWeatherInfo(h.weatherCode);
                                        const Icon = WeatherIcons[info.icon] || WeatherIcons.WiNa;

                                        const now = new Date();
                                        const isToday = new Date(day.date).toDateString() === now.toDateString();
                                        const isNow = isToday && i === 0; // First hour of today is "Live"

                                        return (
                                            <div key={`${dayIndex}-${i}`} className="flex-none w-[42px] snap-start flex flex-col items-center gap-1 mx-1.5">
                                                <span className={`text-[9px] font-medium whitespace-nowrap ${isNow ? 'text-primary font-bold' : 'text-text-muted'}`}>
                                                    {isNow ? t('date.now') : formatHour(h.time)}
                                                </span>
                                                <Icon className={`text-xl ${info.style}`} />
                                                <span className="text-xs font-bold text-text-primary">{Math.round(h.temp)}°</span>

                                                <div className="h-4 w-full flex items-center justify-center">
                                                    {h.precipProb > 0 && (
                                                        <div className="flex items-center gap-0.5 animate-in fade-in duration-300">
                                                            <WeatherIcons.WiRaindrop className="text-sm text-blue-400" />
                                                            <span className="text-[9px] font-bold text-blue-400 leading-none">
                                                                {h.precipProb}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {hoursScroll.canScrollRight && <ScrollArrow direction="right" onClick={() => hoursScroll.scroll('right')} />}
                </div>
            )}
        </section>
    );
}
