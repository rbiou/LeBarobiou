import React, { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { WiDaySunny, WiMoonAltWaxingCrescent3 } from 'react-icons/wi';
import { HiComputerDesktop } from 'react-icons/hi2';
import SwipeableTabs from './ui/SwipeableTabs';

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();
    const { t } = useSettings();

    const options = useMemo(() => [
        { value: 'light', icon: WiDaySunny, label: t('theme.light') },
        { value: 'system', icon: HiComputerDesktop, label: t('theme.system') },
        { value: 'dark', icon: WiMoonAltWaxingCrescent3, label: t('theme.dark') },
    ], [t]);

    return (
        <div className="flex justify-center">
            <SwipeableTabs
                options={options}
                value={theme}
                onChange={setTheme}
                className="h-10 w-64 rounded-full border border-border bg-card shadow-sm p-1"
                itemClassName="rounded-full text-xs font-medium"
                activeItemClassName="text-primary font-bold dark:text-white"
                inactiveItemClassName="text-text-muted hover:text-text-secondary"
                indicatorClassName="rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/50 top-1 bottom-1 left-1"
            />
        </div>
    );
};

export default ThemeToggle;
