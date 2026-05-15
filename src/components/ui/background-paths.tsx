"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Button } from "./button";

function FloatingPaths({ position }: { position: number }) {
    const paths = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
            380 - i * 5 * position
        } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
            152 - i * 5 * position
        } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
            684 - i * 5 * position
        } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        color: `rgba(15,23,42,${0.1 + i * 0.03})`,
        width: 0.5 + i * 0.03,
    }));

    return (
        <div className="absolute inset-0 pointer-events-none">
            <svg
                className="w-full h-full text-primary/10"
                viewBox="0 0 696 316"
                fill="none"
            >
                <title>Background Paths</title>
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke="currentColor"
                        strokeWidth={path.width}
                        strokeOpacity={0.2 + path.id * 0.02}
                        initial={{ pathLength: 0.3, opacity: 0.6 }}
                        animate={{
                            pathLength: 1,
                            opacity: [0.4, 0.8, 0.4],
                            pathOffset: [0, 1, 0],
                        }}
                        transition={{
                            duration: 15 + Math.random() * 10,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

function Ripple() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{
                        scale: [0.5, 1.5, 2],
                        opacity: [0, 0.15, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: i * 2.5,
                        ease: "easeInOut",
                    }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-primary/20 rounded-full"
                />
            ))}
        </div>
    );
}

export function BackgroundPaths({
    logoSrc,
    logoAlt = "",
    title = "Life Admin Portal",
    subtitle = "Personal Registry & Task Management",
    onAction,
    secondaryAction,
}: {
    logoSrc?: string;
    logoAlt?: string;
    title?: string;
    subtitle?: string;
    onAction?: () => void;
    secondaryAction?: ReactNode;
}) {
    const words = title.split(" ");

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-stone-50">
            <div className="absolute inset-0">
                <Ripple />
                <FloatingPaths position={1} />
                <FloatingPaths position={-1} />
            </div>

            <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2 }}
                    className="max-w-4xl mx-auto"
                >
                    {logoSrc && (
                        <motion.img
                            src={logoSrc}
                            alt={logoAlt}
                            initial={{ opacity: 0, y: 16, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="mx-auto mb-8 h-28 w-28 sm:h-36 sm:w-36 rounded-[2rem] object-cover shadow-2xl shadow-primary/10 ring-1 ring-stone-200/70"
                        />
                    )}
                    <h1 className="text-5xl sm:text-7xl md:text-9xl font-bold mb-4 tracking-tighter font-display italic">
                        {words.map((word, wordIndex) => (
                            <span
                                key={wordIndex}
                                className="inline-block mr-4 last:mr-0"
                            >
                                {word.split("").map((letter, letterIndex) => (
                                    <motion.span
                                        key={`${wordIndex}-${letterIndex}`}
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{
                                            delay:
                                                wordIndex * 0.1 +
                                                letterIndex * 0.03,
                                            type: "spring",
                                            stiffness: 150,
                                            damping: 25,
                                        }}
                                        className="inline-block text-transparent bg-clip-text 
                                        bg-gradient-to-r from-black via-primary to-accent"
                                    >
                                        {letter}
                                    </motion.span>
                                ))}
                            </span>
                        ))}
                    </h1>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="text-stone-500 font-creative font-bold text-lg mb-8 uppercase tracking-[0.3em]"
                    >
                        {subtitle}
                    </motion.p>

                    <div
                        className="inline-block group relative bg-gradient-to-b from-primary/20 to-transparent p-px rounded-2xl backdrop-blur-lg 
                        overflow-hidden shadow-lg hover:shadow-primary/20 transition-all duration-300"
                    >
                        <Button
                            variant="ghost"
                            onClick={onAction}
                            className="rounded-[1.15rem] px-10 py-8 text-xl font-display font-medium backdrop-blur-md 
                            bg-white/95 hover:bg-primary/10 
                            text-black transition-all duration-300 
                            group-hover:-translate-y-0.5 border border-primary/20"
                        >
                            <span className="opacity-90 group-hover:opacity-100 transition-opacity">
                                ENTER PORTAL
                            </span>
                             <span
                                className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 
                                transition-all duration-300"
                            >
                                →
                            </span>
                        </Button>
                    </div>
                    {secondaryAction && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8, duration: 0.6 }}
                            className="mt-4"
                        >
                            {secondaryAction}
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
