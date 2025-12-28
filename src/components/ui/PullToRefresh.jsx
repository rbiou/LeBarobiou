import React, { useRef, useState, useEffect } from 'react'
import { HiArrowPath, HiArrowDown } from 'react-icons/hi2'
import { useSettings } from '../../context/SettingsContext'

export default function PullToRefresh({ onRefresh, isRefreshing, children }) {
    const { t } = useSettings()
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
            if (e.cancelable) e.preventDefault()
            const dampedDiff = Math.pow(diff, 0.8)
            setPullY(Math.min(dampedDiff, 150))
        } else {
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

    const progress = Math.min(pullY / THRESHOLD, 1)
    const rotation = progress * 180
    const isTriggered = pullY > THRESHOLD

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
                        {isRefreshing ? t('app.refreshing') : (isTriggered ? t('app.releaseToRefresh') : t('app.pullToRefresh'))}
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
                        {isRefreshing ? t('app.refreshing') : t('app.refresh')}
                    </span>
                </button>
            </div>

            {/* Content */}
            {children}
        </div>
    )
}
