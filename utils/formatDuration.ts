/**
 * Formats duration in hours to a human-readable string
 * - Shows minutes if less than 1 hour (e.g., "15 min" instead of "0.25h")
 * - Shows hours and minutes if 1 hour or more (e.g., "1h 30m" instead of "1.5h")
 * 
 * @param hours - Duration in hours (can be decimal)
 * @returns Formatted string like "15 min", "1h 30m", "2h"
 */
export const formatDuration = (hours: number): string => {
  if (hours < 1) {
    // Less than 1 hour - show minutes only
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }
  
  // 1 hour or more - show hours and minutes
  const wholeHours = Math.floor(hours);
  const remainingMinutes = Math.round((hours - wholeHours) * 60);
  
  if (remainingMinutes === 0) {
    return `${wholeHours}h`;
  }
  
  return `${wholeHours}h ${remainingMinutes}m`;
};

/**
 * Formats duration in minutes to a human-readable string
 * - Shows minutes if less than 60 (e.g., "15 min")
 * - Shows hours and minutes if 60 or more (e.g., "1h 30m")
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted string like "15 min", "1h 30m", "2h"
 */
export const formatDurationFromMinutes = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};


