/**
 * Timezone utility functions for consistent date handling
 */

// Available Indonesian timezones
export const INDONESIA_TIMEZONES = [
  { value: 'Asia/Jakarta', label: 'WIB - Jakarta, Bandung, Medan', offset: '+07:00' },
  { value: 'Asia/Makassar', label: 'WITA - Makassar, Denpasar, Balikpapan', offset: '+08:00' },
  { value: 'Asia/Jayapura', label: 'WIT - Jayapura, Manokwari, Sorong', offset: '+09:00' }
];

// Default timezone (can be overridden by settings)
const DEFAULT_TIMEZONE = 'Asia/Jayapura'; // WIT for Papua

/**
 * Get current timezone setting from localStorage or default
 */
export const getCurrentTimezone = (): string => {
  const saved = localStorage.getItem('app_timezone');
  return saved || DEFAULT_TIMEZONE;
};

/**
 * Save timezone setting to localStorage
 */
export const setCurrentTimezone = (timezone: string): void => {
  localStorage.setItem('app_timezone', timezone);
};

/**
 * Create a new Date object based COMPLETELY on timezone setting, not computer time
 * This ensures all dates are created using the configured timezone time, not local computer time
 */
export const createTimezoneDate = (date?: Date | string | number): Date => {
  const timezone = getCurrentTimezone();
  
  if (date) {
    // If specific date provided, just ensure it's a Date object
    return new Date(date);
  }
  
  // Get current time in the CONFIGURED timezone (not computer timezone)
  const now = new Date();
  const timeInConfiguredZone = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now);
  
  // Parse the timezone-specific time string to create Date object
  // This creates a Date as if we're in that timezone
  const [datePart, timePart] = timeInConfiguredZone.split(', ');
  const [year, month, day] = datePart.split('-');
  const [hour, minute, second] = timePart.split(':');
  
  // Create Date object representing the time in the configured timezone
  // This will be the "local" time for that timezone
  const timezoneDate = new Date(
    parseInt(year),
    parseInt(month) - 1, // Month is 0-based
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
  
  return timezoneDate;
};

/**
 * Get current date and time in configured timezone (for display purposes)
 */
export const getCurrentTimezoneDateTime = (): string => {
  const timezone = getCurrentTimezone();
  const now = new Date();
  
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(now);
};

/**
 * Create Date object from current time in specific timezone
 */
export const createDateInTimezone = (timezone: string): Date => {
  const now = new Date();
  const timeInZone = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now);
  
  const [datePart, timePart] = timeInZone.split(', ');
  const [year, month, day] = datePart.split('-');
  const [hour, minute, second] = timePart.split(':');
  
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day), 
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
};

/**
 * Format date with consistent timezone
 */
export const formatTimezoneDate = (date: Date, format: 'short' | 'long' = 'long'): string => {
  const timezone = getCurrentTimezone();
  
  if (format === 'short') {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: timezone,
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Get timezone info for display
 */
export const getTimezoneInfo = (timezone?: string): { name: string; offset: string; abbreviation: string } => {
  const tz = timezone || getCurrentTimezone();
  const tzData = INDONESIA_TIMEZONES.find(t => t.value === tz);
  
  if (tzData) {
    const abbreviation = tzData.label.split(' - ')[0];
    return {
      name: tzData.label,
      offset: tzData.offset,
      abbreviation
    };
  }
  
  // Fallback
  const now = new Date();
  const offset = new Intl.DateTimeFormat('id-ID', {
    timeZone: tz,
    timeZoneName: 'short'
  }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '';
  
  return {
    name: tz,
    offset: '',
    abbreviation: offset
  };
};

/**
 * Convert between timezones
 */
export const convertTimezone = (date: Date, fromTz: string, toTz: string): Date => {
  // Get time in source timezone
  const sourceTime = new Intl.DateTimeFormat('en-CA', {
    timeZone: fromTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
  
  // Create date object and adjust to target timezone
  const sourceDate = new Date(sourceTime);
  
  const targetTime = new Intl.DateTimeFormat('en-CA', {
    timeZone: toTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(sourceDate);
  
  return new Date(targetTime);
};

/**
 * Check if two dates are the same day in specific timezone
 */
export const isSameDayInTimezone = (date1: Date, date2: Date, timezone?: string): boolean => {
  const tz = timezone || getCurrentTimezone();
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return formatter.format(date1) === formatter.format(date2);
};