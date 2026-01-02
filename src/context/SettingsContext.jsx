import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { getTranslator, detectBrowserLanguage } from '../utils/i18n'

const STORAGE_KEY = 'lebarobiou_settings'
const SETTINGS_VERSION = 1

// Default settings structure
const defaultSettings = {
    version: SETTINGS_VERSION,
    language: 'auto', // 'auto' | 'fr' | 'en'
    blocs: {
        weatherCards: true,
        precipitation: true,
        wind: true,
        sunMoon: true,
        chart: true,
        mosaic: false,
    },
    blocOrder: ['weatherCards', 'precipitation', 'wind', 'sunMoon', 'chart', 'mosaic'],
    chart: {
        defaultVisible: {
            temperature: true,
            precipCum: true,
            precipAmount: true,
            humidity: false,
            pressure: false,
            temperatureMin: true,
            temperatureMax: true,
        },
        selectableInLegend: {
            temperature: true,
            precipCum: true,
            precipAmount: true,
            humidity: true,
            pressure: true,
            temperatureMin: true,
            temperatureMax: true,
        },
        showTempExtremes: true,
    },
    mosaic: {
        showTempExtremes: true,
    },
}

const SettingsContext = createContext()

/**
 * Load settings from localStorage
 * @returns {object} Settings object
 */
function loadSettings() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const parsed = JSON.parse(stored)
            // Migrate if version mismatch (future use)
            if (parsed.version === SETTINGS_VERSION) {
                // Merge with defaults to ensure all keys exist
                return {
                    ...defaultSettings,
                    ...parsed,
                    blocs: { ...defaultSettings.blocs, ...(parsed.blocs || {}) },
                    blocOrder: [...new Set([...(Array.isArray(parsed.blocOrder) ? parsed.blocOrder : []), ...defaultSettings.blocOrder])],
                    chart: {
                        ...defaultSettings.chart,
                        ...(parsed.chart || {}),
                        defaultVisible: { ...defaultSettings.chart.defaultVisible, ...(parsed.chart?.defaultVisible || {}) },
                        selectableInLegend: { ...defaultSettings.chart.selectableInLegend, ...(parsed.chart?.selectableInLegend || {}) },
                    },
                    mosaic: {
                        ...defaultSettings.mosaic,
                        ...(parsed.mosaic || {}),
                    },
                }
            }
        }
    } catch (e) {
        console.warn('Failed to load settings:', e)
    }
    return { ...defaultSettings }
}

/**
 * Save settings to localStorage
 * @param {object} settings - Settings object to save
 */
function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
        console.warn('Failed to save settings:', e)
    }
}

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(() => loadSettings())

    // Save to localStorage when settings change
    useEffect(() => {
        saveSettings(settings)
    }, [settings])

    // Get effective language
    const effectiveLanguage = useMemo(() => {
        return settings.language === 'auto' ? detectBrowserLanguage() : settings.language
    }, [settings.language])

    // Translation function
    const t = useMemo(() => getTranslator(settings.language), [settings.language])

    // Update a specific setting path
    const updateSetting = useCallback((path, value) => {
        setSettings(prev => {
            const newSettings = { ...prev }
            const parts = path.split('.')
            let current = newSettings

            for (let i = 0; i < parts.length - 1; i++) {
                current[parts[i]] = { ...current[parts[i]] }
                current = current[parts[i]]
            }

            current[parts[parts.length - 1]] = value
            return newSettings
        })
    }, [])

    // Toggle a boolean setting
    const toggleSetting = useCallback((path) => {
        setSettings(prev => {
            const parts = path.split('.')
            let current = prev
            for (const part of parts.slice(0, -1)) {
                current = current[part]
            }
            const currentValue = current[parts[parts.length - 1]]
            const newSettings = { ...prev }
            let target = newSettings
            for (let i = 0; i < parts.length - 1; i++) {
                target[parts[i]] = { ...target[parts[i]] }
                target = target[parts[i]]
            }
            target[parts[parts.length - 1]] = !currentValue
            return newSettings
        })
    }, [])

    // Reset to defaults
    const resetSettings = useCallback(() => {
        setSettings({ ...defaultSettings })
    }, [])

    const value = useMemo(() => ({
        settings,
        setSettings,
        updateSetting,
        toggleSetting,
        resetSettings,
        t,
        language: effectiveLanguage,
    }), [settings, updateSetting, toggleSetting, resetSettings, t, effectiveLanguage])

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const context = useContext(SettingsContext)
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}

export { defaultSettings }
