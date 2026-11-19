import React, { useState, useEffect } from 'react';
import { Cloud, User } from 'lucide-react';
import { cn } from '@/lib/utils';
export const TopBar: React.FC = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const formattedTime = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const formattedDate = time.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return (
    <div className="fixed top-6 left-32 right-8 flex justify-end items-center z-50 pointer-events-none">
      <div className="flex items-center gap-4 px-6 py-3 rounded-full bg-white/5 backdrop-blur-[20px] border border-white/10 shadow-lg pointer-events-auto">
        <div className="flex items-center gap-2 pr-4 border-r border-white/10">
          <Cloud className="text-primary w-5 h-5" />
          <span className="text-white font-medium">72°F</span>
        </div>

        <div className="flex flex-col items-center px-4 border-r border-white/10 min-w-[120px]">
          <span className="text-white font-bold text-lg leading-none">{formattedTime}</span>
          <span className="text-white/60 text-[10px] uppercase tracking-wider font-semibold mt-1">
            {formattedDate}
          </span>
        </div>

        <div className="flex items-center gap-3 pl-4">
          <div className="text-right">
            <p className="text-white text-sm font-semibold leading-none">Guest User</p>
            <p className="text-primary text-[10px] font-bold uppercase mt-1">Premium</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
            <div className="w-full h-full rounded-full bg-[#0A0B1E] flex items-center justify-center overflow-hidden">
              <User className="text-white/80 w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
