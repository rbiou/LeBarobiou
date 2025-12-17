import React, { useRef, useState, useEffect } from 'react';

export default function SwipeableTabs({
    options,
    value,
    onChange,
    className = "", // Applied to outer wrapper (e.g. h-10 w-full bg-slate-100 p-1)
    itemClassName = "",
    activeItemClassName = "",
    inactiveItemClassName = "",
    indicatorClassName = ""
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef(null);
    const [dragState, setDragState] = useState({
        isDragging: false,
        startX: 0,
        currentX: 0,
        itemWidth: 0,
    });

    useEffect(() => {
        const idx = options.findIndex(o => o.value === value);
        if (idx !== -1) setActiveIndex(idx);
    }, [value, options]);

    useEffect(() => {
        // Measure ITEM width, not container width (container might have padding)
        const updateWidth = () => {
            if (containerRef.current && options.length > 0) {
                // We assume the items divide the available content space equally
                // We can get this by measuring the first button
                const firstButton = containerRef.current.querySelector('button');
                if (firstButton) {
                    setDragState(prev => ({
                        ...prev,
                        itemWidth: firstButton.offsetWidth
                    }));
                }
            }
        }
        updateWidth();
        // Use a small timeout to allow layout to settle if needed (e.g. after font load)
        const timer = setTimeout(updateWidth, 50);
        window.addEventListener('resize', updateWidth);
        return () => {
            window.removeEventListener('resize', updateWidth);
            clearTimeout(timer);
        }
    }, [options.length]);

    const handlePointerDown = (e) => {
        setDragState(prev => ({
            ...prev,
            isDragging: true,
            startX: e.clientX || e.touches?.[0]?.clientX,
            currentX: e.clientX || e.touches?.[0]?.clientX,
        }));
    };

    const handlePointerMove = (e) => {
        if (!dragState.isDragging) return;
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        setDragState(prev => ({ ...prev, currentX: clientX }));
    };

    const handlePointerUp = (e) => {
        if (!dragState.isDragging) return;

        const diff = dragState.currentX - dragState.startX;
        const threshold = dragState.itemWidth / 2;

        // If moved significantly, stick to next/prev
        if (Math.abs(diff) > threshold) {
            const direction = diff > 0 ? 1 : -1;
            const newIndex = Math.max(0, Math.min(options.length - 1, activeIndex + direction));
            if (newIndex !== activeIndex) {
                onChange(options[newIndex].value);
            }
        }
        // If it was just a tap (minimal movement), find which item was tapped
        // We can use the event target or calculate from clientX
        // But the native onClick is safer for "what did I hit". 
        // HOWEVER, if we are dragging, we don't want to trigger onClick potentially?
        // Actually, if we dragged far, we consumed the action.

        setDragState(prev => ({ ...prev, isDragging: false }));
    };

    const getTransform = () => {
        const baseTranslate = activeIndex * 100; // 100% per item
        if (dragState.isDragging) {
            if (dragState.itemWidth === 0) return `translateX(${baseTranslate}%)`;

            const pixelDiff = dragState.currentX - dragState.startX;
            const percentDiff = (pixelDiff / dragState.itemWidth) * 100;
            const proposedTranslate = baseTranslate + percentDiff;

            // Clamp between 0% and (length - 1) * 100%
            const maxTranslate = (options.length - 1) * 100;
            const clampedTranslate = Math.max(0, Math.min(maxTranslate, proposedTranslate));

            return `translateX(${clampedTranslate}%)`;
        }
        return `translateX(${baseTranslate}%)`;
    };

    return (
        <div
            ref={containerRef}
            className={`relative grid items-stretch cursor-grab active:cursor-grabbing touch-none select-none ${className}`}
            style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} // Enforces equal width
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
        >
            {/* Sliding Indicator Layer - Absolute relative to the GRID container, respecting padding if grid has it? 
          Wait, if className has padding, 'absolute top-0 left-0' will be relative to the padding box edge? No, content box. 
          Actually, let's make the indicator a sibling of the buttons in the grid flow? No, needs to slide. 
          Standard Pattern: Outer Div (Padding/Border) -> Relative Inner Track -> Indicator + Buttons.
          Current approach: Outer Div acts as Track. If className adds padding, this might break 'absolute left-0'.
          
          FIX: We can assume `className` (passed by parent) handles the visual container (bg, roundness, padding).
          The indicator needs to be positioned RELATIVE to the CONTENT box of that container.
          If `className` includes `p-1`, then `absolute left-0 top-0` is at the padding edge.
          BUT, standard CSS absolute positioning inside a relative parent ignores padding offsets unless specified.
          
          Correction: if Parent has `p-1`, active content starts at 4px. 
          If Indicator is `absolute left-0`, it goes to 0px (border edge).
          
          BETTER FIX: Let's explicitly calculate margins? No, too brittle.
          
          BEST FIX: don't put padding on the draggable container `div`.
          Put padding on the *items*? No, we want a gap around the pill.
          
          Let's use the provided `className` as a wrapper. But inside, we have a `relative` track that fills the space.
          The `className` provided by parent usually looks like `bg-slate-100 p-1 rounded-full`.
          So `children` are inside the content box.
          
          If we make the first child `absolute`, it aligns to padding box usually? 
          Actually, `absolute` aligns to padding box of `relative` parent.
          So if parent has simple `p-1` (4px), `left-1 top-1` would align it? No.
      */}

            {/* Indicator - Using standard "Grid Area" trick or just simple absolute with calc?
          Problem with Grid Area is sliding animation.
          Let's stick to absolute but rely on `itemWidth` logic for sliding.
          We just need to make sure its initial position matches the first item.
          
          If we render the indicator as the FIRST child of the grid, with `grid-column: 1 / span 1`.
          Then use transform to move it.
          This way it naturally respects the grid layout (and parent padding)!
      */}

            <div
                className={`pointer-events-none z-0 rounded-[inherit] transition-transform duration-300 ease-out ${indicatorClassName}`}
                style={{
                    gridColumn: '1 / span 1',
                    gridRow: '1',
                    transform: getTransform(),
                    transition: dragState.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
            />

            {options.map((opt, idx) => {
                const isActive = idx === activeIndex;
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={`z-10 flex min-w-0 items-center justify-center gap-1.5 transition-colors duration-200 ${itemClassName} ${isActive ? activeItemClassName : inactiveItemClassName}`}
                        style={{ gridColumn: `${idx + 1} / span 1`, gridRow: '1' }}
                    >
                        {opt.icon && <opt.icon className={`text-lg shrink-0 transition-transform ${isActive ? 'scale-110' : ''}`} />}
                        {opt.label && <span className={`truncate ${isActive ? 'font-semibold' : 'opacity-70'}`}>{opt.label}</span>}
                    </button>
                );
            })}
        </div>
    );
}
