/**
 * Helper functions for graph data preparation and manipulation
 */

import { format, eachDayOfInterval, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface GraphPoint {
  date: Date;
  value: number;
}

export interface GraphDataPoint {
  x: string | number;
  y: number;
}

/**
 * Prepare data points for react-native-graph LineGraph
 */
export const prepareGraphPoints = (
  data: { date: string; value: number }[],
  dateRange: { start: Date; end: Date },
  defaultValue: number = 0
): GraphPoint[] => {
  const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  const dataMap = new Map(data.map(d => [d.date, d.value]));
  
  return days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return {
      date: day,
      value: dataMap.get(dateStr) || defaultValue,
    };
  });
};

/**
 * Prepare weekly data points
 */
export const prepareWeeklyPoints = (
  data: { date: string; value: number }[],
  defaultValue: number = 0
): GraphPoint[] => {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
  
  return prepareGraphPoints(data, { start: weekStart, end: weekEnd }, defaultValue);
};

/**
 * Prepare monthly data points
 */
export const prepareMonthlyPoints = (
  data: { date: string; value: number }[],
  month: Date,
  defaultValue: number = 0
): GraphPoint[] => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  
  return prepareGraphPoints(data, { start: monthStart, end: monthEnd }, defaultValue);
};

/**
 * Prepare last N days data points
 */
export const prepareLastNDaysPoints = (
  data: { date: string; value: number }[],
  days: number,
  defaultValue: number = 0
): GraphPoint[] => {
  const today = new Date();
  const start = subDays(today, days - 1);
  
  return prepareGraphPoints(data, { start, end: today }, defaultValue);
};

/**
 * Calculate trend (increasing, decreasing, or stable)
 */
export const calculateTrend = (values: number[]): 'up' | 'down' | 'stable' => {
  if (values.length < 2) return 'stable';
  
  const recent = values.slice(-7); // Last 7 values
  const previous = values.slice(-14, -7); // Previous 7 values
  
  if (previous.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
  
  const change = ((recentAvg - previousAvg) / previousAvg) * 100;
  
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
};

/**
 * Get trend indicator text and color
 */
export const getTrendIndicator = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return { text: '↑ Improving', color: '#2ECC71' };
    case 'down':
      return { text: '↓ Declining', color: '#E74C3C' };
    default:
      return { text: '→ Stable', color: '#7F8C8D' };
  }
};

/**
 * Calculate average value from graph points
 */
export const calculateAverage = (points: GraphPoint[]): number => {
  if (points.length === 0) return 0;
  const sum = points.reduce((acc, point) => acc + point.value, 0);
  return sum / points.length;
};

/**
 * Find min and max values from graph points
 */
export const findMinMax = (points: GraphPoint[]): { min: number; max: number } => {
  if (points.length === 0) return { min: 0, max: 0 };
  
  const values = points.map(p => p.value);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

/**
 * Format date for graph labels
 */
export const formatGraphLabel = (date: Date, formatType: 'day' | 'week' | 'month' = 'day'): string => {
  switch (formatType) {
    case 'day':
      return format(date, 'EEE'); // Mon, Tue, etc.
    case 'week':
      return format(date, 'MMM d');
    case 'month':
      return format(date, 'MMM');
    default:
      return format(date, 'MMM d');
  }
};

/**
 * Prepare data for react-native-chart-kit
 */
export const prepareChartKitData = (
  data: { date: string; value: number }[],
  dateRange: { start: Date; end: Date },
  labelFormat: 'day' | 'week' | 'month' = 'day'
): { labels: string[]; datasets: Array<{ data: number[] }> } => {
  const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  const dataMap = new Map(data.map(d => [d.date, d.value]));
  
  const labels = days.map(day => formatGraphLabel(day, labelFormat));
  const values = days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return dataMap.get(dateStr) || 0;
  });
  
  return {
    labels,
    datasets: [{ data: values }],
  };
};

/**
 * Prepare pie chart data from key-value pairs
 */
export const preparePieChartData = (
  data: { [key: string]: number },
  colors: string[]
): Array<{ name: string; value: number; color: string; legendFontColor: string; legendFontSize: number }> => {
  return Object.entries(data).map(([name, value], index) => ({
    name,
    value,
    color: colors[index % colors.length],
    legendFontColor: '#2C3E50',
    legendFontSize: 12,
  }));
};
