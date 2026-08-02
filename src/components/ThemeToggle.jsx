import React, { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();
    const { t } = useSettings();

    const options = useMemo(() => [
        { value: 'light', icon: Sun, label: t('theme.light') },
        { value: 'system', icon: Monitor, label: t('theme.system') },
        { value: 'dark', icon: Moon, label: t('theme.dark') },
    ], [t]);

    return (
        <div className="flex justify-center">
            <Tabs value={theme} onValueChange={setTheme} className="w-64">
                <TabsList className="w-full h-10 rounded-full bg-muted p-1">
                    {options.map(({ value, icon: Icon, label }) => (
                        <TabsTrigger
                            key={value}
                            value={value}
                            className="flex-1 rounded-full text-xs font-medium data-active:bg-background data-active:text-foreground data-active:shadow-sm"
                        >
                            <Icon data-icon="inline-start" />
                            <span className="truncate">{label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </div>
    );
};

export default ThemeToggle;