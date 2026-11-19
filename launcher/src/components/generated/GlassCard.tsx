import React from 'react';
import { cn } from '@/lib/utils';
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  intensity?: 'low' | 'medium' | 'high';
  hoverable?: boolean;
}
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  blur = 'xl',
  intensity = 'medium',
  hoverable = false,
  ...props
}) => {
  const blurMap = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-[20px]',
  };
  const intensityMap = {
    low: 'bg-white/5 border-white/5',
    medium: 'bg-white/10 border-white/10',
    high: 'bg-white/20 border-white/20',
  };
  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-300 overflow-hidden',
        blurMap[blur],
        intensityMap[intensity],
        hoverable &&
          'hover:bg-white/15 hover:border-white/20 hover:scale-[1.02] cursor-pointer shadow-xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
