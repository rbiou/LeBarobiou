export const formatDateTime = (date) => {
    return date ? new Date(date).toLocaleString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        timeZone: 'Europe/Paris'
    }) : '—'
}

export const formatClock = (value) => {
    if (!value) return '--:--'
    const d = new Date(value)
    return d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/Paris'
    })
}

export const formatDateLabel = (value) => {
    if (!value) return ''
    const d = new Date(value)
    return d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Europe/Paris'
    })
}

export const formatDaysUntil = (value) => {
    if (!value) return ''
    const now = new Date()
    const d = new Date(value)
    const diffTime = d - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return "Aujourd'hui"
    if (diffDays === 1) return 'Demain'
    return `Dans ${diffDays} jours`
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

export const formatDecimal = (n) => (n == null ? null : Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
