"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function NavigationProgress() {
    const pathname = usePathname();
    const [progress, setProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousPathname = useRef(pathname);

    useEffect(() => {
        // Skip the initial mount
        if (previousPathname.current === pathname) return;
        previousPathname.current = pathname;

        // Start progress animation
        setIsVisible(true);
        setProgress(0);

        // Quick jump to ~30%
        requestAnimationFrame(() => setProgress(30));

        // Then gradually to ~70%
        const t1 = setTimeout(() => setProgress(70), 150);
        // Then ~90%
        const t2 = setTimeout(() => setProgress(90), 400);

        // Complete on route change (this effect fires when it's done)
        const t3 = setTimeout(() => {
            setProgress(100);
            timeoutRef.current = setTimeout(() => {
                setIsVisible(false);
                setProgress(0);
            }, 300);
        }, 500);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [pathname]);

    if (!isVisible) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
            <div
                className="h-full bg-gradient-to-r from-heritage-gold via-heritage-gold-light to-heritage-gold transition-all duration-300 ease-out"
                style={{
                    width: `${progress}%`,
                    boxShadow: "0 0 10px var(--color-heritage-gold), 0 0 5px var(--color-heritage-gold)",
                }}
            />
        </div>
    );
}
