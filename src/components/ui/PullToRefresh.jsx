import React, { useRef, useState, useEffect } from 'react'
import { HiArrowPath, HiArrowDown } from 'react-icons/hi2'

export default function PullToRefresh({ onRefresh, isRefreshing, children }) {
    const [pullY, setPullY] = useState(0)
    const [isPulling, setIsPulling] = useState(false)
    const [activeRefresh, setActiveRefresh] = useState(false)
    const touchStartY = useRef(0)
    const THRESHOLD = 80

    // Prevent native pull-to-refresh
    useEffect(() => {
        document.body.style.overscrollBehaviorY = 'contain'
        return () => {
            document.body.style.overscrollBehaviorY = 'auto'
        }
    }, [])

    useEffect(() => {
        if (!isRefreshing) {
            setActiveRefresh(false)
        }
    }, [isRefreshing])

    const handleTouchStart = (e) => {
        // Simple and robust check: if it's a touch event, it's a touch interaction.
        // We only care if we are at the top and not already refreshing.
        if (window.scrollY <= 1 && !isRefreshing) {
            touchStartY.current = e.touches[0].clientY
            setIsPulling(true)
        } else {
            setIsPulling(false)
        }
    }

    const handleTouchMove = (e) => {
        if (!isPulling || isRefreshing) return
        const currentY = e.touches[0].clientY
        const diff = currentY - touchStartY.current

        if (diff > 0 && window.scrollY <= 1) {
            // Prevent scrolling while pulling
            if (e.cancelable) e.preventDefault()
            const dampedDiff = Math.pow(diff, 0.8)
            setPullY(Math.min(dampedDiff, 150))
        } else {
            // If we scroll down, cancel pull
            setIsPulling(false)
            setPullY(0)
        }
    }

    const handleTouchEnd = async () => {
        if (!isPulling || isRefreshing) return

        if (pullY > THRESHOLD) {
            if (navigator.vibrate) navigator.vibrate(10)
            setActiveRefresh(true)
            await onRefresh()
        }

        setIsPulling(false)
        setPullY(0)
    }

    const handleTouchCancel = () => {
        setIsPulling(false)
        setPullY(0)
    }

    // Stable Rotation Logic:
    // Only rotate if we are past a minimal movement to avoid jitter at 0.
    // Full 180deg flip happens at THRESHOLD.
    // We stay at 180deg once passed threshold to indicate "Release to refresh".
    const progress = Math.min(pullY / THRESHOLD, 1)
    const rotation = progress * 180 // 0 to 180 degrees
    const isTriggered = pullY > THRESHOLD

    // Show spinner logic: 
    // - Visible if pulling
    // - Visible if this component triggered the refresh (activeRefresh)
    // - Hidden purely on desktop interactions (mouse) because touch events won't fire.
    //   But to be safe, the spinner is CSS-hidden on `lg:` screens as per user request.
    const showSpinner = isPulling || (isRefreshing && activeRefresh)

    return (
        <div
            className="relative min-h-screen"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
        >
            {/* Embedded Pull/Click Indicator - Mobile only */}
            <button
                onClick={() => !isRefreshing && onRefresh()}
                disabled={isRefreshing}
                className="lg:hidden w-full flex items-center justify-center text-text-muted transition-colors cursor-pointer disabled:cursor-wait focus:outline-none active:text-text-muted"
                style={{
                    paddingTop: 8,
                    paddingBottom: 8,
                    height: isPulling ? Math.max(36 + pullY * 0.5, 36) : (isRefreshing && activeRefresh ? 52 : 36),
                    transition: isPulling ? 'none' : 'height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
            >
                <div className="flex items-center justify-center gap-2">
                    {isRefreshing ? (
                        <HiArrowPath className="text-lg animate-spin" />
                    ) : (
                        <HiArrowDown
                            className="text-lg transition-transform duration-200"
                            style={{
                                transform: `rotate(${isTriggered ? -180 : 0}deg)`
                            }}
                        />
                    )}
                    <span className="text-xs">
                        {isRefreshing ? 'Mise à jour...' : (isTriggered ? 'Relâcher pour actualiser' : 'Tirer ou appuyer pour actualiser')}
                    </span>
                </div>
            </button>

            {/* Desktop Refresh Button - Hidden on mobile */}
            <div className="hidden lg:flex items-center justify-center py-3">
                <button
                    onClick={() => !isRefreshing && onRefresh()}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-text-muted hover:text-text bg-card hover:bg-card-alt border border-border rounded-full transition-all cursor-pointer disabled:cursor-wait focus:outline-none shadow-sm hover:shadow active:scale-95"
                >
                    <HiArrowPath className={`text-sm ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="font-medium">
                        {isRefreshing ? 'Mise à jour...' : 'Actualiser'}
                    </span>
                </button>
            </div>

            {/* Content */}
            {children}
        </div>
    )
}
