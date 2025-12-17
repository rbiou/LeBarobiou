import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useTheme } from '../context/ThemeContext'
import { HiPlay, HiPause, HiBolt } from 'react-icons/hi2'
import SwipeableTabs from './ui/SwipeableTabs'

const SPEED_OPTIONS = [
    { label: 'Lent', value: 600 },
    { label: 'Normal', value: 400 },
    { label: 'Rapide', value: 200 },
]

export default function RadarMap({ embedded = false } = {}) {
    const { isDark } = useTheme()
    const [frames, setFrames] = useState([])
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(true)
    const [speed, setSpeed] = useState(400) // Default Normal
    const [showLightning, setShowLightning] = useState(true)
    const timelineRef = useRef(null)
    const intervalRef = useRef(null)
    const touchStartXRef = useRef(null)

    const formatTimeLabel = (date) => {
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        return `${hours}:${minutes}`
    }

    const formatUnixTime = (unixSeconds) => formatTimeLabel(new Date(unixSeconds * 1000))

    useEffect(() => {
        let isMounted = true

        const loadFrames = async () => {
            try {
                const response = await fetch('https://tilecache.rainviewer.com/api/maps.json', {
                    mode: 'cors',
                    cache: 'no-cache',
                    credentials: 'omit',
                })
                if (!response.ok) throw new Error(`RainViewer maps.json ${response.status}`)

                const payload = await response.json()

                const timestamps = Array.isArray(payload)
                    ? payload
                    : [
                        ...(Array.isArray(payload?.radar?.past) ? payload.radar.past.map((f) => f.time ?? f) : []),
                        ...(Array.isArray(payload?.radar?.nowcast) ? payload.radar.nowcast.map((f) => f.time ?? f) : []),
                    ]

                const framesList = [...new Set(
                    timestamps
                        .map((value) => {
                            if (typeof value === 'number') return value
                            if (typeof value === 'string') {
                                const parsed = Number(value)
                                return Number.isFinite(parsed) ? parsed : null
                            }
                            return null
                        })
                        .filter((value) => value != null)
                )]
                    .sort((a, b) => a - b)
                    .map((time) => ({
                        time,
                        url: `https://tilecache.rainviewer.com/v2/radar/${time}/256/{z}/{x}/{y}/2/1_1.png`,
                    }))

                if (isMounted) {
                    setFrames(framesList)
                    setCurrentFrameIndex(0)
                }
            } catch (error) {
                if (isMounted) {
                    console.error('RainViewer fetch failed', error)
                    setFrames([])
                }
            }
        }

        loadFrames()
        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (!isPlaying || frames.length === 0) return

        intervalRef.current = setInterval(() => {
            setCurrentFrameIndex(prev => (prev + 1) % frames.length)
        }, speed)

        return () => clearInterval(intervalRef.current)
    }, [frames, isPlaying, speed])

    const centerAigre = [45.88987652780406, 0.0146396052940087]

    const updateFrameFromPosition = (clientX) => {
        if (!timelineRef.current || frames.length === 0) return
        const rect = timelineRef.current.getBoundingClientRect()
        if (rect.width === 0) return
        const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
        const maxIndex = Math.max(frames.length - 1, 0)
        const newIndex = Math.round((x / rect.width) * maxIndex)
        const boundedIndex = Math.min(Math.max(newIndex, 0), maxIndex)
        setCurrentFrameIndex(boundedIndex)
        setIsPlaying(false)
    }

    const handleDrag = (e) => {
        if (frames.length === 0) return
        updateFrameFromPosition(e.clientX)
    }

    const handleTouchStart = (e) => {
        if (frames.length === 0) return
        const clientX = e.touches[0]?.clientX
        if (typeof clientX !== 'number') return
        touchStartXRef.current = clientX
        updateFrameFromPosition(clientX)
    }

    const handleTouchMove = (e) => {
        if (!touchStartXRef.current || frames.length === 0) return
        e.preventDefault()
        const clientX = e.touches[0]?.clientX
        if (typeof clientX !== 'number') return
        updateFrameFromPosition(clientX)
    }

    const handleTouchEnd = () => { touchStartXRef.current = null }

    const hasFrames = frames.length > 0
    const maxFrameIndex = hasFrames ? frames.length - 1 : 0
    const timelineRange = Math.max(maxFrameIndex, 1)
    const progressPercent = hasFrames ? (currentFrameIndex / timelineRange) * 100 : 0
    const currentFrameTime = hasFrames ? new Date(frames[currentFrameIndex].time * 1000) : null
    const formattedTime = currentFrameTime ? formatTimeLabel(currentFrameTime) : ''

    const maxTickCount = 6
    const tickStep = frames.length > maxTickCount ? Math.ceil(frames.length / maxTickCount) : 1

    const handleKeyDown = (event) => {
        if (!hasFrames) return
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault()
            setCurrentFrameIndex(prev => Math.min(prev + 1, maxFrameIndex))
            setIsPlaying(false)
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault()
            setCurrentFrameIndex(prev => Math.max(prev - 1, 0))
            setIsPlaying(false)
        } else if (event.key === 'Home') {
            event.preventDefault()
            setCurrentFrameIndex(0)
            setIsPlaying(false)
        } else if (event.key === 'End') {
            event.preventDefault()
            setCurrentFrameIndex(maxFrameIndex)
            setIsPlaying(false)
        }
    }

    const wrapperClasses = embedded
        ? 'flex flex-col gap-4'
        : 'rounded-2xl overflow-hidden shadow-soft border border-border bg-card p-2'

    const mapHeight = embedded ? 'min(60vh, 360px)' : '400px'
    const lightningTileUrl = 'https://tilecache.rainviewer.com/v2/lightning/latest/256/{z}/{x}/{y}.png'

    // Stadia Maps - Alidade Smooth & Dark
    const tileUrl = isDark
        ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
        : 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png'

    const attribution = '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'

    return (
        <div className={wrapperClasses}>
            <div className="relative z-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900" style={{ height: mapHeight, width: '100%' }}>
                <MapContainer center={centerAigre} zoom={8} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url={tileUrl}
                        attribution={attribution}
                    />
                    <Marker position={centerAigre}>
                        <Popup>Aigre (16140, France)</Popup>
                    </Marker>
                    {frames.length > 0 && (
                        <TileLayer
                            key={`radar-${frames[currentFrameIndex].time}`}
                            url={frames[currentFrameIndex].url}
                            opacity={0.7}
                            attribution="Radar: RainViewer"
                        />
                    )}
                    {showLightning && (
                        <TileLayer
                            key="lightning-overlay"
                            url={lightningTileUrl}
                            opacity={0.8}
                            attribution="Lightning: RainViewer"
                        />
                    )}
                </MapContainer>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4 px-2 pb-2 mt-4">

                {/* Timeline */}
                <div
                    ref={timelineRef}
                    className={`relative w-full h-8 select-none touch-pan-x flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${hasFrames ? 'cursor-pointer' : 'pointer-events-none opacity-60'}`}
                    onMouseDown={handleDrag}
                    onMouseMove={(e) => e.buttons === 1 && handleDrag(e)}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    role="slider"
                    tabIndex={hasFrames ? 0 : -1}
                    onKeyDown={handleKeyDown}
                >
                    {/* Track */}
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 relative">
                        {/* Progress */}
                        <div
                            className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-150 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                        {/* Draggable handle */}
                        <div
                            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 border-2 border-primary rounded-full shadow-sm active:scale-110 transition-transform"
                            style={{ left: `${progressPercent}%` }}
                        />
                    </div>

                    {/* Ticks */}
                    {frames.map((frame, idx) => {
                        if (!hasFrames) return null
                        const isEdgeTick = idx === 0 || idx === maxFrameIndex
                        if (!isEdgeTick && idx % tickStep !== 0) return null
                        const leftPercent = hasFrames ? (idx / timelineRange) * 100 : 0
                        return (
                            <div
                                key={frame.time}
                                className={`absolute top-6 text-[10px] text-text-muted transform -translate-x-1/2 ${isEdgeTick ? 'block' : 'hidden sm:block'}`}
                                style={{ left: `${leftPercent}%` }}
                            >
                                {formatUnixTime(frame.time)}
                            </div>
                        )
                    })}
                </div>

                {!hasFrames && (
                    <div className="text-center text-xs text-text-muted mt-2">
                        Chargement des observations radar…
                    </div>
                )}

                {/* Control Action Bar */}
                <div className="flex items-center justify-between gap-4 mt-2">
                    {/* Play/Pause Button */}
                    <button
                        className="flex-none h-11 w-11 flex items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                        onClick={() => setIsPlaying(!isPlaying)}
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <HiPause className="text-xl" /> : <HiPlay className="text-xl ml-0.5" />}
                    </button>

                    {/* Swipeable Speed Selector */}
                    <div className="flex-1 max-w-[280px]">
                        <SwipeableTabs
                            options={SPEED_OPTIONS}
                            value={speed}
                            onChange={setSpeed}
                            className="h-10 rounded-full border border-border bg-card shadow-sm p-1"
                            itemClassName="rounded-full text-[11px] font-medium"
                            activeItemClassName="text-primary font-bold dark:text-white"
                            inactiveItemClassName="text-text-muted hover:text-text-secondary"
                            indicatorClassName="rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/50 top-1 bottom-1 left-1"
                        />
                    </div>


                    {/* Lightning Toggle */}
                    <button
                        className={`flex flex-none items-center justify-center h-10 px-3 rounded-full border transition-colors gap-2 ${showLightning ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' : 'bg-card border-border text-text-muted hover:text-text hover:bg-card-alt'}`}
                        onClick={() => setShowLightning(!showLightning)}
                        title="Afficher/Masquer les éclairs"
                    >
                        <HiBolt className={`text-lg ${showLightning ? 'fill-current' : ''}`} />
                        <span className="hidden sm:inline text-xs font-semibold">Éclairs</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
