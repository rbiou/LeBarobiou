import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

export default function Select({
    options,
    value,
    onChange,
    className = "",
    label = ""
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(o => o.value === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Label if needed */}
            {label && <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">{label}</label>}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl 
                    bg-card-alt border border-border/50 text-left transition-all duration-200
                    hover:bg-card-alt/80 hover:border-border/80 active:scale-[0.99]
                    ${isOpen ? 'ring-2 ring-primary/20 border-primary/50' : ''}
                `}
            >
                <div className="flex items-center gap-2">
                    {selectedOption?.icon && <selectedOption.icon className="text-lg opacity-70" />}
                    <span className="text-sm font-medium text-text">{selectedOption?.label}</span>
                </div>
                <FiChevronDown className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1 max-h-60 overflow-y-auto">
                        {options.map((option) => {
                            const isSelected = option.value === value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors
                                        ${isSelected
                                            ? 'bg-primary/10 text-primary font-medium'
                                            : 'text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-text'}
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        {option.icon && <option.icon className={`text-lg ${isSelected ? 'opacity-100' : 'opacity-70'}`} />}
                                        <span>{option.label}</span>
                                    </div>
                                    {isSelected && <FiCheck className="text-primary" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
