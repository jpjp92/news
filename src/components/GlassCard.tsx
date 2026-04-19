import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  key?: React.Key | null;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "bg-white/40 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-2xl transition-colors duration-300 dark:bg-white/[0.055] dark:backdrop-blur-2xl dark:border-white/[0.11] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
