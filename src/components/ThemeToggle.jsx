import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { WiDaySunny, WiMoonAltWaxingCrescent3 } from 'react-icons/wi';
import { HiComputerDesktop } from 'react-icons/hi2';
import SwipeableTabs from './ui/SwipeableTabs';

const OPTIONS = [
    { value: 'light', icon: WiDaySunny, label: 'Clair' },
    { value: 'system', icon: HiComputerDesktop, label: 'Auto' },
    { value: 'dark', icon: WiMoonAltWaxingCrescent3, label: 'Sombre' },
];

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex justify-center">
            <SwipeableTabs
                options={OPTIONS}
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
