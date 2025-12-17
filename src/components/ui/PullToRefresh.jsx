import React, { useRef, useState, useEffect } from 'react'
import { HiArrowPath, HiArrowDown } from 'react-icons/hi2'

export default function PullToRefresh({ onRefresh, isRefreshing, children }) {
    const [pullY, setPullY] = useState(0)
    const [isPulling, setIsPulling] = useState(false)
    const [activeRefresh, setActiveRefresh] = useState(false) // Tracks if THIS component triggered the refresh
    const touchStartY = useRef(0)
    const THRESHOLD = 80

    // Prevent native pull-to-refresh
    useEffect(() => {
        document.body.style.overscrollBehaviorY = 'contain'
        return () => {
            document.body.style.overscrollBehaviorY = 'auto'
        }
    }, [])

    // Sync internal state with external isRefreshing prop
    useEffect(() => {
        if (!isRefreshing) {
            setActiveRefresh(false)
        }
    }, [isRefreshing])

    const handleTouchStart = (e) => {
        if (window.scrollY === 0 && !isRefreshing) {
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

        if (diff > 0) {
            const dampedDiff = Math.pow(diff, 0.8)
            setPullY(Math.min(dampedDiff, 150))
        }
    }

    const handleTouchEnd = async () => {
        if (!isPulling || isRefreshing) return

        if (pullY > THRESHOLD) {
            if (navigator.vibrate) navigator.vibrate(10)
            setActiveRefresh(true) // We are responsible for this refresh
            await onRefresh()
        }

        setIsPulling(false)
        setPullY(0)
    }

    const handleTouchCancel = () => {
        setIsPulling(false)
        setPullY(0)
    }

    const rotation = Math.min((pullY / THRESHOLD) * 360, 360)
    const isTriggered = pullY > THRESHOLD

    // Only show the spinner visuals if ACTIVE REFRESH (we triggered it) or PULLING
    // If manual refresh happens (isRefreshing=true but activeRefresh=false), we show NOTHING.
    const showSpinner = isPulling || (isRefreshing && activeRefresh)

    return (
        <div
            className="relative min-h-screen"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
        >
            {/* Loading Indicator - Mobile/Tablet Only */}
            <div
                className={`fixed left-0 right-0 top-0 z-[60] flex justify-center pointer-events-none lg:hidden
              transition-transform duration-300 ease-out`}
                style={{
                    transform: `translateY(${showSpinner ? (isRefreshing ? 70 : (pullY > 0 ? pullY * 0.6 : -60)) : -80}px)`
                }}
            >
                <div className={`
                flex items-center justify-center w-10 h-10 rounded-full shadow-lg border border-white/20 bg-white dark:bg-slate-800 text-primary
                transition-transform duration-200
                ${isTriggered ? 'scale-110' : 'scale-100'}
            `}>
                    {isRefreshing ? (
                        <HiArrowPath className="text-xl animate-spin" />
                    ) : (
                        <HiArrowDown
                            className="text-xl transition-transform duration-200"
                            style={{ transform: `rotate(${rotation}deg)` }}
                        />
                    )}
                </div>
            </div>

            {/* Content - Bounces on pull, but stays put during refresh */}
            <div
                style={{
                    transform: `translateY(${isPulling ? (pullY > 0 ? pullY * 0.4 : 0) : 0}px)`,
                    transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
            >
                {/* Visual Hint */}
                <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none opacity-50 lg:hidden transition-opacity duration-200"
                    style={{ opacity: isRefreshing ? 0 : (pullY > 10 ? 0 : 0.5) }}>
                    {/* Optional subtle text hint, or just let the arrow speak? 
                    User asked to place indicator "above the header". 
                    Circle UI essentially replaces the need for text hint.
                    I will remove the text hint to keep it clean like standard Android/iOS.
                */}
                </div>
                {children}
            </div>
        </div>
    )
}
