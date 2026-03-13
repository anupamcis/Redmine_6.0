import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function DatePicker({ value, onChange, onClose, label = 'Date', showStartDate = false, startDateValue = null }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getQuickDates = () => {
    const dates = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Today
    dates.push({ label: 'Today', date: new Date(today), day: dayNames[today.getDay()] });
    
    // Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dates.push({ label: 'Tomorrow', date: tomorrow, day: dayNames[tomorrow.getDay()] });
    
    // This weekend (next Saturday)
    const thisWeekend = new Date(today);
    const daysUntilSaturday = (6 - today.getDay()) % 7 || 7;
    thisWeekend.setDate(today.getDate() + daysUntilSaturday);
    dates.push({ label: 'This weekend', date: thisWeekend, day: dayNames[thisWeekend.getDay()] });
    
    // Next week (next Monday)
    const nextWeek = new Date(today);
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    nextWeek.setDate(today.getDate() + daysUntilMonday);
    dates.push({ label: 'Next week', date: nextWeek, day: dayNames[nextWeek.getDay()] });
    
    // Next weekend (Saturday after next week)
    const nextWeekend = new Date(nextWeek);
    nextWeekend.setDate(nextWeek.getDate() + 5);
    dates.push({ label: 'Next weekend', date: nextWeekend, day: dayNames[nextWeekend.getDay()] });
    
    // 2 weeks
    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    dates.push({ label: '2 weeks', date: twoWeeks, day: dayNames[twoWeeks.getDay()] });
    
    // 4 weeks
    const fourWeeks = new Date(today);
    fourWeeks.setDate(fourWeeks.getDate() + 28);
    dates.push({ label: '4 weeks', date: fourWeeks, day: dayNames[fourWeeks.getDay()] });
    
    return dates;
  };

  const quickDates = getQuickDates();

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false
      });
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true
      });
    }
    
    // Add next month's leading days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    const dateStr = date.toISOString().split('T')[0];
    onChange(dateStr);
    onClose();
  };

  const handleQuickDateSelect = (quickDate) => {
    handleDateSelect(quickDate.date);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isDateSelected = (date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isDateToday = (date) => {
    return date.toDateString() === today.toDateString();
  };

  const isDateInRange = (date) => {
    if (!showStartDate || !startDateValue || !selectedDate) return false;
    const start = new Date(startDateValue);
    const end = selectedDate;
    return date >= start && date <= end;
  };

  const isDateBeforeStart = (date) => {
    if (!showStartDate || !startDateValue) return false;
    const start = new Date(startDateValue);
    return date < start;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div 
      ref={pickerRef}
      className="absolute left-0 mt-2 w-[600px] rounded-xl border border-[var(--theme-border)] bg-[var(--theme-cardBg)] shadow-2xl z-50"
    >
      <div className="p-4 border-b border-[var(--theme-border)] flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showStartDate && (
            <div className="flex-1">
              <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Start date</label>
              <input
                type="date"
                value={startDateValue || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    onChange(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              />
            </div>
          )}
          <div className="flex-1">
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">{label}</label>
            <input
              type="date"
              value={value || ''}
              onChange={(e) => {
                if (e.target.value) {
                  onChange(e.target.value);
                  onClose();
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-[var(--theme-surface)] rounded-lg transition-colors"
        >
          <X size={18} className="text-[var(--theme-textSecondary)]" />
        </button>
      </div>

      <div className="flex">
        {/* Quick Date Options */}
        <div className="w-1/2 border-r border-[var(--theme-border)] p-4">
          <div className="space-y-1">
            {quickDates.map((quickDate, idx) => {
              const isSelected = selectedDate && quickDate.date.toDateString() === selectedDate.toDateString();
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickDateSelect(quickDate)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? 'bg-[var(--theme-primary)] text-white'
                      : 'text-[var(--theme-text)] hover:bg-[var(--theme-surface)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{quickDate.label}</span>
                    <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-[var(--theme-textSecondary)]'}`}>
                      {quickDate.day}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar View */}
        <div className="w-1/2 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-[var(--theme-surface)] rounded transition-colors"
            >
              <ChevronLeft size={18} className="text-[var(--theme-textSecondary)]" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--theme-text)]">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              {isDateToday(currentMonth) && (
                <span className="text-xs text-[var(--theme-textSecondary)]">Today</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-[var(--theme-surface)] rounded transition-colors"
            >
              <ChevronRight size={18} className="text-[var(--theme-textSecondary)]" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-medium text-[var(--theme-textSecondary)] py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((dayObj, idx) => {
              const date = dayObj.date;
              const isSelected = isDateSelected(date);
              const isToday = isDateToday(date);
              const inRange = isDateInRange(date);
              const beforeStart = isDateBeforeStart(date);
              
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (!beforeStart && dayObj.isCurrentMonth) {
                      handleDateSelect(date);
                    }
                  }}
                  disabled={beforeStart || !dayObj.isCurrentMonth}
                  className={`
                    aspect-square rounded-lg text-sm transition-colors
                    ${!dayObj.isCurrentMonth ? 'text-[var(--theme-textSecondary)]/30' : ''}
                    ${beforeStart ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isSelected 
                      ? 'bg-[var(--theme-primary)] text-white font-medium' 
                      : inRange
                      ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]'
                      : isToday
                      ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] font-medium'
                      : 'text-[var(--theme-text)] hover:bg-[var(--theme-surface)]'
                    }
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

