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
            {/* Loading Indicator - Mobile/Tablet Only (hidden lg+) */}
            <div
                className={`fixed left-0 right-0 top-0 z-[60] flex justify-center pointer-events-none lg:hidden
              transition-transform duration-300 ease-out`}
                style={{
                    transform: `translateY(${showSpinner ? (isRefreshing ? 70 : (pullY > 0 ? pullY * 0.6 : -60)) : -80}px)`
                }}
            >
                <div className={`
                flex items-center justify-center w-10 h-10 rounded-full shadow-lg border border-white/20 bg-white dark:bg-slate-800 text-primary
                transition-all duration-200
                ${isTriggered ? 'scale-110 rotate-0' : 'scale-100'} 
            `}>
                    {isRefreshing ? (
                        <HiArrowPath className="text-xl animate-spin" />
                    ) : (
                        <HiArrowDown
                            className="text-xl transition-transform duration-200"
                            style={{
                                // Rotate 180deg (point up) when threshold reached
                                transform: `rotate(${isTriggered ? -180 : 0}deg)`,
                                opacity: pullY > 10 ? 1 : 0.5
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Content - Bounces on pull */}
            <div
                style={{
                    transform: `translateY(${isPulling ? (pullY > 0 ? pullY * 0.4 : 0) : 0}px)`,
                    transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
            >
                {children}
            </div>
        </div>
    )
}
