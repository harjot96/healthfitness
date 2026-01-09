/**
 * Centralized graph theme configuration
 * Provides consistent colors, styles, and configurations across all graphs
 */

export const graphColors = {
  primary: '#9B59B6', // Purple - Fasting
  secondary: '#3498DB', // Blue - Water
  success: '#2ECC71', // Green - Goals achieved
  warning: '#F39C12', // Orange - Attention needed
  error: '#E74C3C', // Red - Below goals
  info: '#17A2B8', // Teal - Information
  dark: '#2C3E50', // Dark gray
  light: '#ECF0F1', // Light gray
  white: '#FFFFFF',
  
  // Specific metric colors
  steps: '#3498DB',
  caloriesConsumed: '#E74C3C',
  caloriesBurned: '#27AE60',
  water: '#3498DB',
  fasting: '#9B59B6',
  macros: {
    carbs: '#F39C12',
    protein: '#E74C3C',
    fat: '#3498DB',
  },
  workout: '#8E44AD',
};

export const graphGradients = {
  primary: ['#9B59B6', '#8E44AD'],
  secondary: ['#3498DB', '#2980B9'],
  success: ['#2ECC71', '#27AE60'],
  warning: ['#F39C12', '#E67E22'],
  error: ['#E74C3C', '#C0392B'],
  steps: ['#3498DB', '#2980B9'],
  water: ['#3498DB', '#5DADE2'],
  fasting: ['#9B59B6', '#8E44AD'],
};

export const chartKitConfig = {
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`, // Blue default
  labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`, // Dark gray
  style: {
    borderRadius: 16,
    padding: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#3498DB',
  },
  propsForBackgroundLines: {
    strokeDasharray: '', // solid lines
    stroke: '#ECF0F1',
    strokeWidth: 1,
  },
};

export const getChartKitConfig = (color: string = graphColors.secondary) => {
  return {
    ...chartKitConfig,
    color: (opacity = 1) => {
      // Convert hex to rgba
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
    propsForDots: {
      ...chartKitConfig.propsForDots,
      stroke: color,
    },
  };
};

export const pieChartColors = [
  graphColors.macros.carbs,
  graphColors.macros.protein,
  graphColors.macros.fat,
  graphColors.success,
  graphColors.warning,
  graphColors.info,
];

export const graphStyles = {
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#2C3E50',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 12,
  },
};

export const formatValue = (value: number, type: 'number' | 'hours' | 'minutes' | 'percentage' = 'number'): string => {
  switch (type) {
    case 'hours':
      const hours = Math.floor(value);
      const minutes = Math.round((value - hours) * 60);
      if (hours === 0) return `${minutes}m`;
      if (minutes === 0) return `${hours}h`;
      return `${hours}h ${minutes}m`;
    case 'minutes':
      return `${Math.round(value)}m`;
    case 'percentage':
      return `${Math.round(value)}%`;
    default:
      return value.toLocaleString();
  }
};

export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};
