import React, { useState, useEffect } from 'react';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { getHolidayForDate } from '@/utils/holidayData';
import { X, ArrowRight } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

interface HotelDateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onSelect: (checkIn: string, checkOut: string) => void;
  renderTrigger: (onClickCheckIn: () => void, onClickCheckOut: () => void) => React.ReactNode;
  isMobile?: boolean;
  wrapperClassName?: string;
}

export default function HotelDateRangePicker({
  checkIn,
  checkOut,
  onSelect,
  renderTrigger,
  isMobile = false,
  wrapperClassName = '',
}: HotelDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: checkIn ? new Date(checkIn) : undefined,
    to: checkOut ? new Date(checkOut) : undefined,
  });
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Sync internal state if props change externally
  useEffect(() => {
    if (open) {
      setDateRange({
        from: checkIn ? new Date(checkIn) : undefined,
        to: checkOut ? new Date(checkOut) : undefined,
      });
    }
  }, [open, checkIn, checkOut]);

  const handleSelect = (range: DateRange | undefined, selectedDay: Date) => {
    if (!selectedDay) return;

    const formatLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (selecting === 'checkIn') {
      // User picked Check-In. Set from, clear to, switch mode.
      setDateRange({ from: selectedDay, to: undefined });
      setSelecting('checkOut');
    } else {
      // User is picking Check-Out
      if (dateRange?.from && selectedDay > dateRange.from) {
        // Valid Check-Out date
        setDateRange({ from: dateRange.from, to: selectedDay });

        // Both are selected, trigger onSelect and close
        const fromStr = formatLocal(dateRange.from);
        const toStr = formatLocal(selectedDay);
        onSelect(fromStr, toStr);
        setTimeout(() => setOpen(false), 300);
      } else {
        // Picked a Check-Out that is BEFORE Check-In. Treat as new Check-In!
        setDateRange({ from: selectedDay, to: undefined });
        setSelecting('checkOut');
      }
    }
  };

  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const renderCalendarContent = () => (
    <div className="flex flex-col bg-white flex-1 overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10 lg:hidden shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {selecting === 'checkIn' ? 'Select Check-In' : 'Select Check-Out'}
          </h2>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 mt-1">
            <span>
              {dateRange?.from
                ? dateRange.from.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : 'Check-In'}
            </span>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <span>
              {dateRange?.to
                ? dateRange.to.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : 'Check-Out'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 shrink-0"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="p-2 sm:p-4 overflow-y-auto flex-1 pb-4">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleSelect}
          numberOfMonths={isMobile ? 1 : 2}
          pagedNavigation={true}
          showOutsideDays={false}
          disabled={(date) => {
            const today = getToday();
            if (date < today) return true;
            if (selecting === 'checkOut' && dateRange?.from) {
              const diffTime = date.getTime() - dateRange.from.getTime();
              const diffDays = diffTime / (1000 * 3600 * 24);
              if (diffDays > 14) return true;
            }
            return false;
          }}
          onDayMouseEnter={(day) => setHoveredDate(day)}
          onDayMouseLeave={() => setHoveredDate(null)}
          className="w-full"
          classNames={{
            root: 'w-fit relative mx-auto',
            months: 'flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 w-full mt-4',
            month: 'space-y-4 w-full lg:w-auto px-4',
            caption: 'flex justify-center pt-1 relative items-center mb-4',
            caption_label: 'text-lg font-bold text-gray-900',
            nav: 'absolute inset-x-0 top-5 flex w-full items-center justify-between px-6 z-10 pointer-events-none',
            button_previous:
              'h-10 w-10 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm transition-all pointer-events-auto [&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-gray-700',
            button_next:
              'h-10 w-10 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm transition-all pointer-events-auto [&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-gray-700',
            table: 'w-full border-collapse space-y-1',
            head_row: 'flex w-full mb-1',
            head_cell:
              'text-gray-400 w-[14.28%] font-semibold text-[11px] uppercase tracking-wider',
            row: 'flex w-full mt-1',
            cell: 'text-center p-0 relative w-[14.28%] h-[38px]',
            day: '',
            day_range_start: '',
            day_range_end: '',
            day_selected: '',
            day_today: '',
            day_outside: 'opacity-0 pointer-events-none',
            day_disabled: '',
            day_hidden: 'invisible',
          }}
          components={{
            DayButton: (props: any) => {
              const { day } = props;
              const date = day.date;
              const holiday = getHolidayForDate(date);
              const isPast = date < getToday();

              const isSameDay = (d1: Date | undefined, d2: Date | undefined) => {
                if (!d1 || !d2) return false;
                return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
              };

              const isCheckIn = isSameDay(date, dateRange?.from);
              const isCheckOut = isSameDay(date, dateRange?.to);

              const dateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
              const fromTime = dateRange?.from ? new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate()).getTime() : 0;
              const toTime = dateRange?.to ? new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate()).getTime() : 0;
              const hoverTime = hoveredDate ? new Date(hoveredDate.getFullYear(), hoveredDate.getMonth(), hoveredDate.getDate()).getTime() : 0;

              const isSelectedRange = fromTime && toTime && dateTime > fromTime && dateTime < toTime;

              let isHoverRange = false;
              let isHoverEnd = false;
              let isValidFutureCheckOut = false;

              if (selecting === 'checkOut' && fromTime) {
                const diffDays = (dateTime - fromTime) / (1000 * 3600 * 24);
                if (diffDays > 0 && diffDays <= 14) {
                  isValidFutureCheckOut = true;
                  if (hoverTime > fromTime && dateTime < hoverTime) isHoverRange = true;
                  if (hoverTime > fromTime && dateTime === hoverTime) isHoverEnd = true;
                }
              }

              let wrapperClass = "relative flex flex-col items-center justify-center h-[38px] w-full";
              if (isSelectedRange || isHoverRange) {
                wrapperClass += " bg-blue-50";
              }
              if (isCheckIn && (toTime || hoverTime > fromTime)) {
                wrapperClass += " bg-gradient-to-r from-transparent via-blue-50 to-blue-50";
              }
              if ((isCheckOut || isHoverEnd) && fromTime) {
                wrapperClass += " bg-gradient-to-l from-transparent via-blue-50 to-blue-50";
              }

              let btnClass = "h-8 w-8 text-sm rounded-full flex items-center justify-center transition-all z-10 relative ";
              if (isCheckIn || isCheckOut || isHoverEnd) {
                btnClass += "bg-blue-600 text-white font-bold shadow-md hover:bg-blue-700";
              } else if (isSelectedRange || isHoverRange) {
                btnClass += "text-blue-900 font-medium hover:bg-blue-100";
              } else if (isPast) {
                btnClass += "text-gray-300 pointer-events-none";
              } else if (isValidFutureCheckOut) {
                btnClass += "text-blue-600 font-medium hover:bg-blue-50";
              } else {
                btnClass += "text-gray-700 hover:bg-gray-100";
              }

              // Remove react-day-picker classes we don't want interfering
              const cleanProps = { ...props, className: btnClass };

              return (
                <div className={wrapperClass}>
                  <CalendarDayButton {...cleanProps} />
                  {!isPast && holiday && (
                    <div className="absolute bottom-0 flex flex-col items-center w-full px-1 pointer-events-none z-20">
                      <span className="text-[8px] font-bold text-orange-500 truncate max-w-full leading-none">
                        {holiday.name.split(' ')[0]}
                      </span>
                    </div>
                  )}
                </div>
              );
            },
          }}
        />
      </div>
    </div>
  );

  // Render Popover for both Desktop and Mobile
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={`w-full ${wrapperClassName}`}>
          {renderTrigger(
            () => {
              setSelecting('checkIn');
              setOpen(true);
            },
            () => {
              setSelecting('checkOut');
              setOpen(true);
            },
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className={`w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden z-[60] ${isMobile ? 'max-w-[95vw]' : ''}`}
        align="start"
        side="bottom"
        sideOffset={10}
        avoidCollisions={false}
      >
        {renderCalendarContent()}
      </PopoverContent>
    </Popover>
  );
}
