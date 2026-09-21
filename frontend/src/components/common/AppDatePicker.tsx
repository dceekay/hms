import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiClock,
  FiX,
  FiCheck,
  FiZap,
  FiUser,
} from "react-icons/fi";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from "@floating-ui/react";
import {
  format,
  parseISO,
  isValid,
  addMonths,
  subMonths,
  setMonth,
  setYear,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addDays,
  subYears,
  setHours,
  setMinutes,
} from "date-fns";
import "../../styles/app-pickers.css";

export interface AppDatePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  mode?: "date" | "datetime";
  presetType?: "appointment" | "dob" | "none";
  helperText?: string;
  allowClear?: boolean;
  className?: string;
  id?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const APPOINTMENT_TIME_SLOTS = [
  { label: "09:00 AM", h: 9, m: 0 },
  { label: "10:30 AM", h: 10, m: 30 },
  { label: "11:30 AM", h: 11, m: 30 },
  { label: "01:00 PM", h: 13, m: 0 },
  { label: "02:00 PM", h: 14, m: 0 },
  { label: "03:30 PM", h: 15, m: 30 },
  { label: "05:00 PM", h: 17, m: 0 },
];

export default function AppDatePicker({
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled = false,
  required = false,
  minDate,
  maxDate,
  mode = "date",
  presetType = "appointment",
  helperText,
  allowClear = true,
  className = "",
  id,
}: AppDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [ageInput, setAgeInput] = useState("");

  // Track responsive screen
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Floating UI Setup
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen && !isMobile,
    onOpenChange: setIsOpen,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip({ padding: 12 }), shift({ padding: 12 })],
  });

  const dismiss = useDismiss(context, { outsidePress: true });
  const role = useRole(context, { role: "dialog" });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role]);

  // Parse initial selected date safely
  const parsedDate = useMemo(() => {
    if (!value) return null;
    try {
      const d = parseISO(value);
      return isValid(d) ? d : null;
    } catch {
      return null;
    }
  }, [value]);

  // Calendar View month/year state
  const [viewDate, setViewDate] = useState<Date>(() => parsedDate || new Date());
  // Time state for datetime mode
  const [selectedHour, setSelectedHour] = useState<number>(() => parsedDate ? parsedDate.getHours() : 9);
  const [selectedMinute, setSelectedMinute] = useState<number>(() => parsedDate ? parsedDate.getMinutes() : 0);

  // Sync calendar view month when parsedDate changes
  useEffect(() => {
    if (parsedDate) {
      setViewDate(parsedDate);
      setSelectedHour(parsedDate.getHours());
      setSelectedMinute(parsedDate.getMinutes());
    }
  }, [parsedDate]);

  // Generate calendar days for current view month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [viewDate]);

  // Year options for fast switcher (1920 to 2035)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = presetType === "dob" ? currentYear - 110 : currentYear - 20;
    const endYear = presetType === "dob" ? currentYear : currentYear + 10;
    const years: number[] = [];
    for (let y = endYear; y >= startYear; y--) {
      years.push(y);
    }
    return years;
  }, [presetType]);

  const handlePrevMonth = () => setViewDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setViewDate((prev) => addMonths(prev, 1));

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setViewDate((prev) => setMonth(prev, newMonth));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setViewDate((prev) => setYear(prev, newYear));
  };

  // Commit date selection
  const handleDaySelect = (day: Date) => {
    let finalDate = day;
    if (mode === "datetime") {
      finalDate = setHours(finalDate, selectedHour);
      finalDate = setMinutes(finalDate, selectedMinute);
      const isoStr = format(finalDate, "yyyy-MM-dd'T'HH:mm");
      onChange(isoStr);
    } else {
      const dateStr = format(finalDate, "yyyy-MM-dd");
      onChange(dateStr);
      setIsOpen(false);
    }
  };

  const handleTimeSlotSelect = (h: number, m: number) => {
    setSelectedHour(h);
    setSelectedMinute(m);
    const base = parsedDate || new Date();
    const updated = setMinutes(setHours(base, h), m);
    onChange(format(updated, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  // Calculate DOB from Age
  const handleApplyAge = () => {
    const age = parseInt(ageInput.trim(), 10);
    if (!isNaN(age) && age >= 0 && age <= 120) {
      const calculatedDate = subYears(new Date(), age);
      // Keep month/day reasonable
      setViewDate(calculatedDate);
      onChange(format(calculatedDate, "yyyy-MM-dd"));
      setAgeInput("");
      setIsOpen(false);
    }
  };

  // Formatted display value in trigger
  const displayValue = useMemo(() => {
    if (!parsedDate) return "";
    if (mode === "datetime") {
      return format(parsedDate, "MMM d, yyyy 'at' hh:mm a");
    }
    return format(parsedDate, "MMM d, yyyy");
  }, [parsedDate, mode]);

  // Clinical preset handlers
  const applyPreset = (daysOffset: number) => {
    const target = addDays(new Date(), daysOffset);
    if (mode === "datetime") {
      const withTime = setMinutes(setHours(target, selectedHour), selectedMinute);
      onChange(format(withTime, "yyyy-MM-dd'T'HH:mm"));
    } else {
      onChange(format(target, "yyyy-MM-dd"));
      setIsOpen(false);
    }
    setViewDate(target);
  };

  const defaultPlaceholder =
    placeholder || (mode === "datetime" ? "Select date & time..." : "Select date...");

  const popoverContent = (
    <>
      {isMobile && (
        <div
          className="app-picker-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        ref={isMobile ? undefined : refs.setFloating}
        style={isMobile ? undefined : floatingStyles}
        {...(!isMobile ? getFloatingProps() : {})}
        className="app-picker-popover date-picker-card"
        role="dialog"
        aria-modal="true"
      >
        <div className="app-picker-mobile-handle" />

        {/* Header */}
        <div className="app-picker-header">
          <div className="app-picker-title">
            <FiCalendar color="var(--picker-primary)" />
            <span>{mode === "datetime" ? "Schedule Date & Time" : "Pick Date"}</span>
          </div>
          <button
            type="button"
            className="app-picker-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close date picker"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Clinical Presets */}
        {presetType === "appointment" && (
          <div className="calendar-presets-bar">
            <button
              type="button"
              className="calendar-preset-pill"
              onClick={() => applyPreset(0)}
            >
              Today
            </button>
            <button
              type="button"
              className="calendar-preset-pill"
              onClick={() => applyPreset(1)}
            >
              Tomorrow
            </button>
            <button
              type="button"
              className="calendar-preset-pill"
              onClick={() => applyPreset(3)}
            >
              In 3 Days
            </button>
            <button
              type="button"
              className="calendar-preset-pill"
              onClick={() => applyPreset(7)}
            >
              In 1 Week
            </button>
            <button
              type="button"
              className="calendar-preset-pill"
              onClick={() => applyPreset(14)}
            >
              In 2 Weeks
            </button>
          </div>
        )}

        {/* Fast Age Calculator for DOB */}
        {presetType === "dob" && (
          <div className="calendar-age-calc-row">
            <FiUser />
            <span>Know age? Calculate DOB:</span>
            <input
              type="number"
              min="0"
              max="120"
              placeholder="e.g. 28"
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyAge()}
            />
            <span>yrs</span>
            <button type="button" onClick={handleApplyAge}>
              Apply
            </button>
          </div>
        )}

        {/* Month & Year Navigation Bar */}
        <div className="calendar-nav-bar">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handlePrevMonth}
            aria-label="Previous month"
          >
            <FiChevronLeft size={16} />
          </button>

          <div className="calendar-nav-selects">
            <select
              className="calendar-select-dropdown"
              value={viewDate.getMonth()}
              onChange={handleMonthChange}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            <select
              className="calendar-select-dropdown"
              value={viewDate.getFullYear()}
              onChange={handleYearChange}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <FiChevronRight size={16} />
          </button>
        </div>

        {/* Weekdays and Calendar Grid */}
        <div className="calendar-grid-wrapper">
          <div className="calendar-weekdays-row">
            {WEEKDAY_NAMES.map((wd) => (
              <span key={wd}>{wd}</span>
            ))}
          </div>

          <div className="calendar-days-grid">
            {calendarDays.map((day) => {
              const isSelected = parsedDate ? isSameDay(day, parsedDate) : false;
              const isCurrentMonth = isSameMonth(day, viewDate);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`calendar-day-cell ${
                    !isCurrentMonth ? "other-month" : ""
                  } ${isTodayDate ? "today" : ""} ${isSelected ? "selected" : ""}`}
                  onClick={() => handleDaySelect(day)}
                >
                  <span>{format(day, "d")}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Selection Section (for datetime mode) */}
        {mode === "datetime" && (
          <div className="calendar-time-section">
            <div className="calendar-time-title">
              <span>
                <FiClock style={{ marginRight: 4 }} /> Appointment Time Slots
              </span>
              <span>
                {format(
                  setMinutes(setHours(new Date(), selectedHour), selectedMinute),
                  "hh:mm a"
                )}
              </span>
            </div>

            <div className="calendar-quick-slots-row">
              {APPOINTMENT_TIME_SLOTS.map((slot) => {
                const isActive =
                  selectedHour === slot.h && selectedMinute === slot.m;
                return (
                  <button
                    key={slot.label}
                    type="button"
                    className={`calendar-slot-chip ${isActive ? "active" : ""}`}
                    onClick={() => handleTimeSlotSelect(slot.h, slot.m)}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="app-picker-footer">
          <button
            type="button"
            className="app-picker-btn secondary"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className="app-picker-btn primary"
            onClick={() => setIsOpen(false)}
          >
            <FiCheck style={{ marginRight: 4 }} /> Done
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className={`app-picker-wrapper ${className}`}>
      {label && (
        <label className="app-picker-label" htmlFor={id}>
          <span>
            {label} {required && <span className="required-star">*</span>}
          </span>
          {helperText && <span className="helper-badge">{helperText}</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        id={id}
        className={`app-picker-trigger ${isOpen ? "open" : ""} ${
          displayValue ? "has-value" : ""
        } ${error ? "has-error" : ""} ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="app-picker-icon-box">
          {mode === "datetime" ? <FiClock /> : <FiCalendar />}
        </div>

        <div className="app-picker-content">
          {displayValue ? (
            <div className="app-picker-value">
              <span>{displayValue}</span>
              {mode === "date" && presetType === "dob" && parsedDate && (
                <span className="app-picker-subvalue">
                  ({Math.max(0, new Date().getFullYear() - parsedDate.getFullYear())} yrs)
                </span>
              )}
            </div>
          ) : (
            <span className="app-picker-placeholder">{defaultPlaceholder}</span>
          )}
        </div>

        <div className="app-picker-actions">
          {allowClear && displayValue && !disabled && (
            <button
              type="button"
              className="app-picker-clear-btn"
              onClick={handleClear}
              title="Clear date"
              aria-label="Clear date"
            >
              <FiX size={15} />
            </button>
          )}
          <FiChevronDown className={`app-picker-chevron ${isOpen ? "open" : ""}`} />
        </div>
      </div>

      {error && <span className="app-picker-error-msg">{error}</span>}

      {/* Popover / Mobile Sheet */}
      {isOpen && <FloatingPortal>{popoverContent}</FloatingPortal>}
    </div>
  );
}

// DateTime Picker Shortcut Wrapper
export function AppDateTimePicker(props: Omit<AppDatePickerProps, "mode">) {
  return <AppDatePicker {...props} mode="datetime" presetType="appointment" />;
}
