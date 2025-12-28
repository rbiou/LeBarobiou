export const formatDateTime = (date, locale = 'fr-FR') => {
    return date ? new Date(date).toLocaleString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
    }) : '—'
}

export const formatClock = (value, locale = 'fr-FR') => {
    if (!value) return '--:--'
    const d = new Date(value)
    return d.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })
}

export const formatDateLabel = (value, locale = 'fr-FR') => {
    if (!value) return ''
    const d = new Date(value)
    return d.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    })
}

export const formatDaysUntil = (value, t) => {
    if (!value) return ''
    const now = new Date()
    const d = new Date(value)
    const diffTime = d - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return t ? t('date.today') : "Aujourd'hui"
    if (diffDays === 1) return t ? t('date.tomorrow') : 'Demain'
    return t ? t('date.in_days').replace('{days}', diffDays) : `Dans ${diffDays} jours`
}

export const formatDuration = (hours) => {
    if (!Number.isFinite(hours) || hours <= 0) return '0 min'
    const totalMinutes = Math.max(0, Math.round(hours * 60))
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    if (h === 0) return `${totalMinutes} min`
    if (m === 0) return `${h} h`
    return `${h} h ${String(m).padStart(2, '0')} min`
}

export const formatDecimal = (n, locale = 'fr-FR') => (n == null ? null : Number(n).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
