import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

export default function RadarMap({ embedded = false } = {}) {
    const [frames, setFrames] = useState([])
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(true)
    const [speed, setSpeed] = useState(400)
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
        const controller = new AbortController()
        const loadFrames = async () => {
            try {
                const response = await fetch('https://tilecache.rainviewer.com/api/maps.json', {
                    signal: controller.signal,
                    cache: 'no-store',
                })
                if (!response.ok) throw new Error(`RainViewer maps.json ${response.status}`)
                const data = await response.json()
                const past = Array.isArray(data?.radar?.past) ? data.radar.past : []
                const nowcast = Array.isArray(data?.radar?.nowcast) ? data.radar.nowcast : []
                const combined = [...past, ...nowcast]
                    .filter(frame => typeof frame?.time === 'number')
                    .sort((a, b) => a.time - b.time)

                setFrames(combined)
                setCurrentFrameIndex(0)
            } catch (error) {
                if (error.name !== 'AbortError') console.error('RainViewer fetch failed', error)
                setFrames([])
            }
        }

        loadFrames()
        return () => controller.abort()
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

    // Decide which ticks to show to avoid clutter
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
        : 'rounded-2xl overflow-hidden shadow-soft border border-slate-200 p-2'

    const timelineContainerSpacing = embedded ? 'mt-3' : 'mt-4'
    const timelinePadding = embedded ? 'px-3 py-5 sm:px-4' : 'px-4 py-7 sm:px-5'
    const timelineOuterLayout = embedded
        ? 'flex flex-col items-center gap-3 px-2 sm:px-3'
        : 'flex flex-col items-center gap-3'
    const timelineInnerWidth = 'w-full'
    const controlsWidth = embedded ? 'max-w-xl w-full' : 'max-w-2xl w-full'
    const mapHeight = embedded ? 'min(60vh, 360px)' : '400px'

    return (
        <div className={wrapperClasses}>
            <MapContainer center={centerAigre} zoom={8} style={{ height: mapHeight, width: '100%' }} className="relative z-0">
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap contributors"
                />
                <Marker position={centerAigre}>
                    <Popup>Aigre (16140, France)</Popup>
                </Marker>
                {frames.length > 0 && (
                    <TileLayer
                        url={`https://tilecache.rainviewer.com/v2/radar/${frames[currentFrameIndex].path ?? frames[currentFrameIndex].time}/256/{z}/{x}/{y}/2/1_1.png`}
                        opacity={0.7}
                        attribution="Radar: RainViewer"
                    />
                )}
            </MapContainer>

            {/* Timeline */}
            <div className={`${timelineContainerSpacing} ${timelineOuterLayout}`}>
                <div
                    ref={timelineRef}
                    className={`relative ${timelineInnerWidth} select-none touch-pan-x ${timelinePadding} focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${hasFrames ? 'cursor-pointer' : 'pointer-events-none opacity-60'}`}
                    onMouseDown={handleDrag}
                    onMouseMove={(e) => e.buttons === 1 && handleDrag(e)}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    role="slider"
                    aria-label="Timeline des observations radar"
                    aria-valuemin={0}
                    aria-valuemax={maxFrameIndex}
                    aria-valuenow={hasFrames ? currentFrameIndex : 0}
                    aria-valuetext={formattedTime || 'Chargement des observations'}
                    tabIndex={hasFrames ? 0 : -1}
                    onKeyDown={handleKeyDown}
                >
                    <div className="absolute left-0 right-0 top-6">
                        <div className="relative h-2 rounded-full bg-slate-200">
                            <div
                                className="absolute left-0 top-0 h-full rounded-full bg-blue-500 transition-all duration-150 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />

                            {/* Timeline ticks & labels */}
                            {frames.map((frame, idx) => {
                                if (!hasFrames) return null
                                const isEdgeTick = idx === 0 || idx === maxFrameIndex
                                if (!isEdgeTick && idx % tickStep !== 0) return null
                                const leftPercent = hasFrames ? (idx / timelineRange) * 100 : 0
                                const labelAlignment = idx === 0
                                    ? 'translate-x-0'
                                    : idx === maxFrameIndex
                                        ? '-translate-x-full'
                                        : '-translate-x-1/2'
                                const label = formatUnixTime(frame.time)
                                return (
                                    <React.Fragment key={frame.time}>
                                        <div
                                            className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-slate-400"
                                            style={{ left: `${leftPercent}%` }}
                                        />
                                        <div
                                            className={`absolute top-full mt-2 whitespace-nowrap text-[10px] text-slate-600 sm:text-xs ${labelAlignment} ${isEdgeTick ? 'block' : 'hidden sm:block'}`}
                                            style={{ left: `${leftPercent}%` }}
                                        >
                                            {label}
                                        </div>
                                    </React.Fragment>
                                )
                            })}

                            {/* Draggable handle */}
                            <div
                                className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-blue-600 shadow-sm transition-transform duration-150 ease-out active:cursor-grabbing"
                                style={{ left: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Floating timestamp */}
                    {formattedTime && (
                        <div
                            className="absolute left-0 right-0"
                            style={{ top: '-0.25rem' }}
                        >
                            <div
                                className={`absolute whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-800 shadow-sm ${
                                    progressPercent < 5
                                        ? 'translate-x-0'
                                        : progressPercent > 95
                                            ? '-translate-x-full'
                                            : '-translate-x-1/2'
                                }`}
                                style={{ left: `${progressPercent}%` }}
                            >
                                {formattedTime}
                            </div>
                        </div>
                    )}
                </div>

                {!hasFrames && (
                    <div className={`${timelineInnerWidth} text-center text-sm text-slate-500`}>
                        Chargement des observations radar…
                    </div>
                )}

                <div className={`${controlsWidth} flex flex-col items-center gap-3 rounded-xl bg-white/80 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-center sm:gap-6`}>
                    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center sm:gap-3">
                        <button
                            className="h-10 rounded-lg bg-blue-500 px-4 text-sm font-medium text-white shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:translate-y-px sm:min-w-[96px]"
                            onClick={() => setIsPlaying(!isPlaying)}
                        >
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>

                        <button
                            className={`h-10 rounded-lg px-4 text-sm font-medium shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:translate-y-px ${showLightning ? 'bg-yellow-400 text-black' : 'bg-slate-300 text-slate-700'}`}
                            onClick={() => setShowLightning(!showLightning)}
                        >
                            ⚡
                        </button>
                    </div>

                    <div className="flex w-full flex-col items-stretch gap-1 text-sm sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                        <label className="text-sm font-medium text-slate-700 sm:whitespace-nowrap">Vitesse</label>
                        <select
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={speed}
                            onChange={(e) => setSpeed(Number(e.target.value))}
                        >
                            <option value={100}>Rapide</option>
                            <option value={200}>Normal</option>
                            <option value={400}>Lent</option>
                            <option value={600}>Très lent</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    )
}
