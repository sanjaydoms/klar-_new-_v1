import { Clock } from 'lucide-react';

interface TimerBannerProps {
  timeLeft: number;
  formatTime: (seconds: number) => string;
}

export default function TimerBanner({ timeLeft, formatTime }: TimerBannerProps) {
  return (
    <div className="border-b border-accent/30 bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
        <div className="flex items-center justify-center sm:justify-end gap-2 text-xs sm:text-sm">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
          <span className="font-medium text-primary">Complete your booking in</span>
          <span className="bg-orange-600 text-white px-2 py-0.5 rounded-md font-mono text-xs sm:text-sm">
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>
    </div>
  );
}
