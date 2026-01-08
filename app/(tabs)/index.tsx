import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { subDays, isToday, isSameDay, format, differenceInHours, differenceInMinutes, eachDayOfInterval } from 'date-fns';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';
import { StepCounter } from '../../components/health/StepCounter';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { CircularProgress } from '../../components/common/CircularProgress';
import { DailyHealthData } from '../../types';
import { getDailyHealthData, getWeeklyHealthData } from '../../services/storage/firestore';
import Constants from 'expo-constants';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const { todayData, healthMetrics, refreshHealthData } = useHealth();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [weeklyData, setWeeklyData] = useState<{ date: string; steps: number; caloriesConsumed: number; caloriesBurned: number; waterIntake: number }[]>([]);
  const [selectedChart, setSelectedChart] = useState<'steps' | 'calories' | 'water'>('steps');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDateData, setSelectedDateData] = useState<DailyHealthData | null>(null);
  const [dateDataMap, setDateDataMap] = useState<Map<string, DailyHealthData>>(new Map());
  const [loadingDateData, setLoadingDateData] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ date: string; value: number; index: number } | null>(null);
  const [LineGraph, setLineGraph] = useState<any>(null);
  
  const isExpoGo = Constants.appOwnership === 'expo';
  const canUseGraph = Platform.OS !== 'web' && !isExpoGo;

  // Get personalized greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Get user's display name
  const getUserDisplayName = () => {
    if (user?.email) {
      const name = user.email.split('@')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return 'User';
  };

  // Generate date picker dates (today + 4 days back = 5 days total)
  const datePickerDates = Array.from({ length: 5 }, (_, i) => subDays(new Date(), 4 - i));

  // Load and refresh data from Firebase when screen mounts or becomes focused
  useEffect(() => {
    if (user) {
      refreshHealthData();
      loadWeeklyData();
      loadDateData();
    }
  }, [user]);

  // Load data when selected date changes - always fetch fresh from Firebase
  useEffect(() => {
    if (user && selectedDate) {
      loadSelectedDateData(true); // Force refresh from Firebase
    }
  }, [user, selectedDate]);

  // Also update when todayData changes (for today's date)
  useEffect(() => {
    if (isToday(selectedDate) && todayData) {
      setSelectedDateData(todayData);
    }
  }, [todayData, selectedDate]);

  // Dynamically import LineGraph
  useEffect(() => {
    let cancelled = false;

    if (!canUseGraph) {
      setLineGraph(null);
      return undefined;
    }

    (async () => {
      try {
        const Graph = await import('react-native-graph');
        if (!cancelled) setLineGraph(() => Graph.LineGraph);
      } catch (error) {
        if (!cancelled) {
          console.warn('react-native-graph is not available. Graph features will be disabled.');
          setLineGraph(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canUseGraph]);

  const loadDateData = async () => {
    if (!user) return;
    try {
      const dates = datePickerDates.map(d => format(d, 'yyyy-MM-dd'));
      const dataPromises = dates.map(date => getDailyHealthData(user.uid, date));
      const results = await Promise.all(dataPromises);
      
      const map = new Map<string, DailyHealthData>();
      dates.forEach((date, index) => {
        if (results[index]) {
          map.set(date, results[index]);
        }
      });
      setDateDataMap(map);
    } catch (error) {
      console.error('Error loading date data:', error);
    }
  };

  const loadSelectedDateData = async (forceRefresh: boolean = false) => {
    if (!user) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      setLoadingDateData(true);
      
      // If it's today, refresh from context first, then use context data
      if (isToday(selectedDate)) {
        // Refresh today's data from context
        await refreshHealthData();
        setSelectedDateData(todayData);
        setLoadingDateData(false);
        return;
      }
      
      // For past dates, always fetch fresh from Firebase when date changes
      // (forceRefresh = true) or if not in cache
      if (!forceRefresh && dateDataMap.has(dateStr)) {
        // Use cached data if available and not forcing refresh
        setSelectedDateData(dateDataMap.get(dateStr) || null);
        setLoadingDateData(false);
        // Still fetch in background to update cache
        fetchDateDataInBackground(dateStr);
        return;
      }
      
      // Always fetch from Firebase when date changes
      console.log(`[Dashboard] Loading data from Firebase for date: ${dateStr}`);
      const data = await getDailyHealthData(user.uid, dateStr);
      
      if (data) {
        console.log(`[Dashboard] Data loaded for ${dateStr}:`, {
          steps: data.steps,
          caloriesConsumed: data.caloriesConsumed,
          caloriesBurned: data.caloriesBurned,
          waterIntake: data.waterIntake,
          meals: data.meals?.length || 0,
          workouts: data.workouts?.length || 0,
        });
      } else {
        console.log(`[Dashboard] No data found for ${dateStr}`);
      }
      
      setSelectedDateData(data);
      
      // Update cache
      if (data) {
        setDateDataMap(prev => new Map(prev).set(dateStr, data));
      }
    } catch (error) {
      console.error('[Dashboard] Error loading selected date data:', error);
      setSelectedDateData(null);
    } finally {
      setLoadingDateData(false);
    }
  };

  // Background fetch to update cache without blocking UI
  const fetchDateDataInBackground = async (dateStr: string) => {
    if (!user) return;
    try {
      const data = await getDailyHealthData(user.uid, dateStr);
      if (data) {
        setDateDataMap(prev => new Map(prev).set(dateStr, data));
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching data in background:', error);
    }
  };

  const loadWeeklyData = async () => {
    if (!user) return;
    try {
      const data = await getWeeklyHealthData(user.uid);
      setWeeklyData(data);
    } catch (error) {
      console.error('Error loading weekly data:', error);
    }
  };

  // Use selected date data or today's data
  const displayData = isToday(selectedDate) ? todayData : selectedDateData;
  
  // Calculate fasting/sleep progress
  const activeFasting = displayData?.fastingSession && !displayData.fastingSession.endTime;
  const completedFasting = displayData?.fastingSession?.endTime;
  let fastingProgress = 0;
  let fastingDuration = '0h 0m';
  let recoveryDuration = '0h 0m';
  
  if (activeFasting && displayData.fastingSession) {
    const now = new Date();
    const elapsedHours = differenceInHours(now, displayData.fastingSession.startTime);
    const elapsedMinutes = differenceInMinutes(now, displayData.fastingSession.startTime) % 60;
    fastingDuration = `${elapsedHours}h ${elapsedMinutes}m`;
    recoveryDuration = fastingDuration;
    
    if (displayData.fastingSession.targetDuration) {
      fastingProgress = Math.min(
        (elapsedHours / displayData.fastingSession.targetDuration) * 100,
        100
      );
    }
  } else if (completedFasting && displayData.fastingSession) {
    const hours = Math.floor(displayData.fastingSession.duration);
    const minutes = Math.floor((displayData.fastingSession.duration - hours) * 60);
    recoveryDuration = `${hours}h ${minutes}m`;
  }

  // Format steps - use healthMetrics for today, displayData for past dates
  const steps = isToday(selectedDate) ? (healthMetrics.steps || 0) : (displayData?.steps || 0);
  
  // Zone minutes (active calories / 10 as approximation)
  const zoneMinutes = Math.floor((displayData?.caloriesBurned || 0) / 10);
  
  // Mindful days (placeholder - could be based on meditation/fasting completion)
  const mindfulDays = displayData?.fastingSession?.endTime ? 1 : 0;
  
  // Water intake
  const waterIntake = displayData?.waterIntake || 0;
  const waterGoal = 8; // 8 glasses per day
  const waterProgress = Math.min((waterIntake / waterGoal) * 100, 100);

  // Calculate additional metrics
  const caloriesConsumed = displayData?.caloriesConsumed || 0;
  const caloriesBurned = displayData?.caloriesBurned || (isToday(selectedDate) ? healthMetrics.caloriesBurned : 0) || 0;
  const netCalories = caloriesConsumed - caloriesBurned;
  const calorieGoal = 2000; // Default goal
  const calorieProgress = Math.min((caloriesConsumed / calorieGoal) * 100, 100);
  
  const meals = displayData?.meals || [];
  const workouts = displayData?.workouts || [];
  const totalWorkoutCalories = workouts.reduce((sum, w) => sum + w.totalCaloriesBurned, 0);
  const totalWorkoutDuration = workouts.reduce((sum, w) => sum + w.duration, 0);
  
  const heartRate = isToday(selectedDate) ? (healthMetrics.heartRate || 0) : (displayData?.heartRate || 0);
  const restingHeartRate = isToday(selectedDate) ? (healthMetrics.restingHeartRate || 0) : (displayData?.restingHeartRate || 0);

  // Prepare chart data for labels (used in graph labels)
  const prepareWeeklyChartData = () => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    const dataMap = new Map(weeklyData.map(d => [d.date, d]));

    const labels = days.map(day => format(day, 'EEE').substring(0, 1));
    
    if (selectedChart === 'steps') {
      const data = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return dataMap.get(dateStr)?.steps || 0;
      });
      return { labels, data };
    } else if (selectedChart === 'calories') {
      const consumedData = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return dataMap.get(dateStr)?.caloriesConsumed || 0;
      });
      const burnedData = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return dataMap.get(dateStr)?.caloriesBurned || 0;
      });
      return { labels, consumedData, burnedData };
    } else {
      const data = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return dataMap.get(dateStr)?.waterIntake || 0;
      });
      return { labels, data };
    }
  };

  // Prepare graph points for react-native-graph (Skia-based)
  const prepareGraphPoints = (): any[] => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    const dataMap = new Map(weeklyData.map(d => [d.date, d]));

    if (selectedChart === 'steps') {
      return days.map((day, index) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const value = dataMap.get(dateStr)?.steps || 0;
        return {
          date: day,
          value: value,
        };
      });
    } else if (selectedChart === 'calories') {
      // For calories, we'll use consumed as primary, but can show both
      return days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const consumed = dataMap.get(dateStr)?.caloriesConsumed || 0;
        const burned = dataMap.get(dateStr)?.caloriesBurned || 0;
        // Return net calories
        return {
          date: day,
          value: consumed - burned,
        };
      });
    } else {
      return days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const value = dataMap.get(dateStr)?.waterIntake || 0;
        return {
          date: day,
          value: value,
        };
      });
    }
  };

  const chartData = prepareWeeklyChartData();
  const graphPoints = prepareGraphPoints();

  // Get chart colors and labels
  const getChartConfig = () => {
    switch (selectedChart) {
      case 'steps':
        return {
          color: '#4CAF50',
          gradientFillColors: ['#4CAF50', '#66BB6A'],
          label: 'Steps',
          formatValue: (value: number) => Math.round(value).toLocaleString(),
          unit: '',
        };
      case 'calories':
        return {
          color: '#FF6B35',
          gradientFillColors: ['#FF6B35', '#FF8A65'],
          label: 'Net Calories',
          formatValue: (value: number) => `${Math.round(value) > 0 ? '+' : ''}${Math.round(value)}`,
          unit: ' kcal',
        };
      case 'water':
        return {
          color: '#2196F3',
          gradientFillColors: ['#2196F3', '#42A5F5'],
          label: 'Water',
          formatValue: (value: number) => Math.round(value).toString(),
          unit: ' glasses',
        };
    }
  };

  const chartConfig = getChartConfig();

  // Prepare meal type pie chart data
  const mealTypeData = [
    {
      name: 'Breakfast',
      calories: meals.filter(m => m.type === 'breakfast').reduce((sum, m) => sum + m.calories, 0),
      color: '#FFA726',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Lunch',
      calories: meals.filter(m => m.type === 'lunch').reduce((sum, m) => sum + m.calories, 0),
      color: '#FF6B35',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Dinner',
      calories: meals.filter(m => m.type === 'dinner').reduce((sum, m) => sum + m.calories, 0),
      color: '#5C6BC0',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Snacks',
      calories: meals.filter(m => m.type === 'snack').reduce((sum, m) => sum + m.calories, 0),
      color: '#66BB6A',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
  ].filter(item => item.calories > 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Personalized Header with Greeting and Profile */}
        <View style={styles.personalizedHeader}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>
              {getGreeting()},
            </Text>
            <Text style={styles.userNameText}>{getUserDisplayName()}</Text>
          </View>
          <View style={styles.profileContainer}>
            <View style={styles.profilePicture}>
              <LinearGradient
                colors={['#4CAF50', '#2196F3', '#9B59B6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.profileGradient}
              >
                <Text style={styles.profileInitial}>
                  {getUserDisplayName().charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Date Picker */}
        <View style={styles.datePickerContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datePickerScroll}
          >
            {datePickerDates.map((date, index) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const isSelected = isSameDay(date, selectedDate);
              const dayNumber = format(date, 'd');
              const dayName = format(date, 'EEE');
              const isTodayDate = isToday(date);
              
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.datePickerItem,
                    isSelected && styles.datePickerItemActive
                  ]}
                  onPress={() => {
                    console.log(`[Dashboard] Date selected: ${dateStr}`);
                    setSelectedDate(date);
                  }}
                  disabled={loadingDateData && isSelected}
                >
                  <Text style={[
                    styles.datePickerDayNumber,
                    isSelected && styles.datePickerDayNumberActive
                  ]}>
                    {dayNumber}
                  </Text>
                  <Text style={[
                    styles.datePickerDayName,
                    isSelected && styles.datePickerDayNameActive
                  ]}>
                    {dayName}
                  </Text>
                  {isSelected && <View style={styles.datePickerDot} />}
                  {loadingDateData && isSelected && (
                    <View style={styles.loadingIndicator}>
                      <Text style={styles.loadingText}>...</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        
        {/* Loading indicator for data */}
        {loadingDateData && (
          <View style={styles.dataLoadingContainer}>
            <Text style={styles.dataLoadingText}>Loading data from Firebase...</Text>
          </View>
        )}
        
        {/* Main Sleep/Fasting Metric */}
        <View style={styles.mainMetricContainer}>
          <View style={styles.fastingCard}>
            <CircularProgress
              size={180}
              strokeWidth={12}
              progress={fastingProgress}
              color="#9B59B6"
              backgroundColor="#F3E5F5"
            >
              <View style={styles.fastingIconContainer}>
                <LinearGradient
                  colors={['#9B59B6', '#8E44AD']}
                  style={styles.fastingIconGradient}
                >
                  <Ionicons name="moon" size={36} color="#fff" />
                </LinearGradient>
              </View>
            </CircularProgress>
            <View style={styles.fastingTextContainer}>
              <Text style={styles.mainMetricValue}>{fastingDuration}</Text>
              <Text style={styles.mainMetricLabel}>Fasting</Text>
            </View>
          </View>
        </View>

        {/* Activity Metrics */}
        <View style={styles.activityMetrics}>
          <View style={styles.activityCard}>
            <LinearGradient
              colors={['#E8F5E9', '#C8E6C9']}
              style={styles.activityCardGradient}
            >
              <View style={styles.activityIconWrapper}>
                <Ionicons name="footsteps" size={28} color="#4CAF50" />
              </View>
              <Text style={styles.activityValue}>{steps.toLocaleString()}</Text>
              <Text style={styles.activityLabel}>Steps</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.activityCard}>
            <LinearGradient
              colors={['#E1F5FE', '#B3E5FC']}
              style={styles.activityCardGradient}
            >
              <View style={styles.activityIconWrapper}>
                <Ionicons name="flash" size={28} color="#2196F3" />
              </View>
              <Text style={[styles.activityValue, { color: '#2196F3' }]}>{zoneMinutes}</Text>
              <Text style={styles.activityLabel}>Zone Min</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.activityCard}>
            <LinearGradient
              colors={['#F1F8E9', '#DCEDC8']}
              style={styles.activityCardGradient}
            >
              <View style={styles.activityIconWrapper}>
                <Ionicons name="leaf" size={28} color="#8BC34A" />
              </View>
              <Text style={[styles.activityValue, { color: '#8BC34A' }]}>{mindfulDays} of 6</Text>
              <Text style={styles.activityLabel}>Mindful days</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Water Intake Section */}
        <View style={styles.waterSection}>
          <View style={styles.waterCard}>
            <View style={styles.waterHeader}>
              <View style={styles.waterTitleContainer}>
                <Ionicons name="water" size={24} color="#2196F3" />
                <Text style={styles.sectionTitle}>Water Intake</Text>
              </View>
              <TouchableOpacity 
                style={[
                  styles.waterAddButton,
                  waterIntake >= waterGoal && styles.waterAddButtonDisabled
                ]}
                onPress={() => router.push('/(tabs)/water')}
                disabled={waterIntake >= waterGoal}
              >
                {waterIntake < waterGoal ? (
                  <LinearGradient
                    colors={['#2196F3', '#1976D2']}
                    style={styles.waterButtonGradient}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </LinearGradient>
                ) : (
                  <View style={styles.waterButtonComplete}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.waterProgressContainer}>
              <View style={styles.waterProgressBar}>
                <LinearGradient
                  colors={waterIntake >= waterGoal 
                    ? ['#4CAF50', '#66BB6A'] 
                    : ['#2196F3', '#42A5F5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.waterProgressFill, 
                    { width: `${waterProgress}%` }
                  ]}
                />
              </View>
              <View style={styles.waterStats}>
                <Text style={styles.waterText}>
                  <Text style={styles.waterAmount}>{waterIntake}</Text>
                  <Text style={styles.waterDivider}> / </Text>
                  <Text style={styles.waterGoal}>{waterGoal} glasses</Text>
                </Text>
                {waterIntake >= waterGoal && (
                  <View style={styles.waterBadge}>
                    <Ionicons name="trophy" size={14} color="#FFD700" />
                    <Text style={styles.waterBadgeText}>Goal Achieved!</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Weekly Activity Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly Activity</Text>
            <View style={styles.chartSelector}>
              <TouchableOpacity
                style={[styles.chartTab, selectedChart === 'steps' && styles.chartTabActive]}
                onPress={() => setSelectedChart('steps')}
              >
                <Text style={[styles.chartTabText, selectedChart === 'steps' && styles.chartTabTextActive]}>
                  Steps
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartTab, selectedChart === 'calories' && styles.chartTabActive]}
                onPress={() => setSelectedChart('calories')}
              >
                <Text style={[styles.chartTabText, selectedChart === 'calories' && styles.chartTabTextActive]}>
                  Calories
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartTab, selectedChart === 'water' && styles.chartTabActive]}
                onPress={() => setSelectedChart('water')}
              >
                <Text style={[styles.chartTabText, selectedChart === 'water' && styles.chartTabTextActive]}>
                  Water
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.chartCard}>
            {/* Interactive Skia-based Graph */}
            <View style={styles.graphContainer}>
              {LineGraph ? (
                <>
                  <LineGraph
                    style={styles.graph}
                    points={graphPoints}
                    animated={true}
                    color={chartConfig.color}
                    gradientFillColors={chartConfig.gradientFillColors}
                    enablePanGesture={true}
                    enableIndicator={true}
                    indicatorPulsating={true}
                    onGestureStart={() => setSelectedPoint(null)}
                    onPointSelected={(point: any) => {
                      const dayIndex = graphPoints.findIndex(p => 
                        p.date.getTime() === point.date.getTime()
                      );
                      if (dayIndex !== -1) {
                        const dayDate = format(point.date, 'MMM d');
                        setSelectedPoint({
                          date: dayDate,
                          value: point.value,
                          index: dayIndex,
                        });
                      }
                    }}
                    onGestureEnd={() => {
                      // Keep selected point visible after gesture ends
                    }}
                    lineThickness={3}
                    enableFadeInMask={true}
                    panGestureDelay={0}
                    horizontalPadding={16}
                    verticalPadding={16}
                  />
                  
                  {/* Selected Point Info Display */}
                  {selectedPoint && (
                    <View style={styles.selectedPointInfo}>
                      <View style={styles.selectedPointCard}>
                        <Text style={styles.selectedPointDate}>{selectedPoint.date}</Text>
                        <Text style={[styles.selectedPointValue, { color: chartConfig.color }]}>
                          {chartConfig.formatValue(selectedPoint.value)}{chartConfig.unit}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Chart Labels */}
                  <View style={styles.graphLabels}>
                    {chartData.labels.map((label, index) => {
                      const day = subDays(new Date(), 6 - index);
                      const isSelected = selectedPoint?.index === index;
                      return (
                        <View key={index} style={styles.graphLabel}>
                          <Text style={[
                            styles.graphLabelText,
                            isSelected && styles.graphLabelTextSelected
                          ]}>
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : (
                <View style={styles.graphFallback}>
                  <Ionicons name="bar-chart-outline" size={64} color="#999" />
                  <Text style={styles.graphFallbackText}>Graph unavailable</Text>
                  <Text style={styles.graphFallbackSubtext}>
                    Chart data: {weeklyData.length} days recorded
                  </Text>
                </View>
              )}
            </View>
            
            {/* Additional Info for Calories Chart */}
            {selectedChart === 'calories' && (
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF6B35' }]} />
                  <Text style={styles.legendText}>Consumed</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.legendText}>Burned</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: chartConfig.color }]} />
                  <Text style={styles.legendText}>Net (Shown)</Text>
                </View>
              </View>
            )}
            
            {/* Helper Text */}
            <Text style={styles.graphHelperText}>
              Touch and drag to explore data points
            </Text>
          </View>
        </View>

        {/* Calories Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calories</Text>
          <View style={styles.caloriesCard}>
            <View style={styles.caloriesRow}>
              <View style={styles.caloriesItem}>
                <Ionicons name="flame" size={24} color="#FF6B35" />
                <Text style={styles.caloriesValue}>{caloriesConsumed}</Text>
                <Text style={styles.caloriesLabel}>Consumed</Text>
              </View>
              <View style={styles.caloriesDivider} />
              <View style={styles.caloriesItem}>
                <Ionicons name="barbell" size={24} color="#4CAF50" />
                <Text style={styles.caloriesValue}>{caloriesBurned}</Text>
                <Text style={styles.caloriesLabel}>Burned</Text>
              </View>
              <View style={styles.caloriesDivider} />
              <View style={styles.caloriesItem}>
                <Ionicons name={netCalories >= 0 ? "trending-up" : "trending-down"} size={24} color={netCalories >= 0 ? "#FF6B35" : "#4CAF50"} />
                <Text style={[styles.caloriesValue, { color: netCalories >= 0 ? "#FF6B35" : "#4CAF50" }]}>
                  {netCalories >= 0 ? '+' : ''}{netCalories}
                </Text>
                <Text style={styles.caloriesLabel}>Net</Text>
              </View>
            </View>
            <View style={styles.calorieProgressContainer}>
              <View style={styles.calorieProgressBar}>
                <View style={[styles.calorieProgressFill, { width: `${calorieProgress}%` }]} />
              </View>
              <Text style={styles.calorieProgressText}>
                {caloriesConsumed} / {calorieGoal} kcal ({calorieProgress.toFixed(0)}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Meals Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meals</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/diet')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {mealTypeData.length > 0 && (
            <View style={styles.pieChartCard}>
              <Text style={styles.pieChartTitle}>Calories by Meal Type</Text>
              <View style={styles.mealTypeVisualization}>
                {mealTypeData.map((item, index) => {
                  const totalCalories = mealTypeData.reduce((sum, m) => sum + m.calories, 0);
                  const percentage = totalCalories > 0 ? (item.calories / totalCalories) * 100 : 0;
                  return (
                    <View key={index} style={styles.mealTypeBar}>
                      <View style={styles.mealTypeHeader}>
                        <View style={styles.mealTypeLabelContainer}>
                          <View style={[styles.mealTypeColorDot, { backgroundColor: item.color }]} />
                          <Text style={styles.mealTypeLabel}>{item.name}</Text>
                        </View>
                        <Text style={styles.mealTypeValue}>{item.calories} kcal</Text>
                      </View>
                      <View style={styles.mealTypeBarContainer}>
                        <View 
                          style={[
                            styles.mealTypeBarFill, 
                            { 
                              width: `${percentage}%`,
                              backgroundColor: item.color,
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.mealTypePercentage}>{percentage.toFixed(1)}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          <View style={styles.mealsCard}>
            <View style={styles.mealsRow}>
              <View style={styles.mealItem}>
                <Ionicons name="sunny" size={20} color="#FFA726" />
                <Text style={styles.mealCount}>
                  {meals.filter(m => m.type === 'breakfast').length}
                </Text>
                <Text style={styles.mealLabel}>Breakfast</Text>
              </View>
              <View style={styles.mealItem}>
                <Ionicons name="partly-sunny" size={20} color="#FF6B35" />
                <Text style={styles.mealCount}>
                  {meals.filter(m => m.type === 'lunch').length}
                </Text>
                <Text style={styles.mealLabel}>Lunch</Text>
              </View>
              <View style={styles.mealItem}>
                <Ionicons name="moon" size={20} color="#5C6BC0" />
                <Text style={styles.mealCount}>
                  {meals.filter(m => m.type === 'dinner').length}
                </Text>
                <Text style={styles.mealLabel}>Dinner</Text>
              </View>
              <View style={styles.mealItem}>
                <Ionicons name="cafe" size={20} color="#66BB6A" />
                <Text style={styles.mealCount}>
                  {meals.filter(m => m.type === 'snack').length}
                </Text>
                <Text style={styles.mealLabel}>Snacks</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.addMealButton}
              onPress={() => router.push('/(tabs)/diet')}
            >
              <Ionicons name="add-circle" size={20} color="#4CAF50" />
              <Text style={styles.addMealText}>Add Meal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Workouts Summary */}
        {workouts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Workouts</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/workout')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.workoutsCard}>
              <View style={styles.workoutStats}>
                <View style={styles.workoutStat}>
                  <Ionicons name="barbell" size={24} color="#4CAF50" />
                  <Text style={styles.workoutStatValue}>{workouts.length}</Text>
                  <Text style={styles.workoutStatLabel}>Sessions</Text>
                </View>
                <View style={styles.workoutStat}>
                  <Ionicons name="time" size={24} color="#2196F3" />
                  <Text style={styles.workoutStatValue}>{totalWorkoutDuration}</Text>
                  <Text style={styles.workoutStatLabel}>Minutes</Text>
                </View>
                <View style={styles.workoutStat}>
                  <Ionicons name="flame" size={24} color="#FF6B35" />
                  <Text style={styles.workoutStatValue}>{totalWorkoutCalories}</Text>
                  <Text style={styles.workoutStatLabel}>Calories</Text>
                </View>
              </View>
              {workouts.slice(0, 2).map((workout) => (
                <View key={workout.id} style={styles.workoutItem}>
                  <View style={styles.workoutItemContent}>
                    <Text style={styles.workoutItemName}>{workout.name}</Text>
                    <Text style={styles.workoutItemDetails}>
                      {workout.duration} min • {workout.totalCaloriesBurned} kcal
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Heart Rate (if available) */}
        {(heartRate > 0 || restingHeartRate > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Heart Rate</Text>
            <View style={styles.heartRateCard}>
              {heartRate > 0 && (
                <View style={styles.heartRateItem}>
                  <Ionicons name="heart" size={24} color="#E91E63" />
                  <View style={styles.heartRateContent}>
                    <Text style={styles.heartRateValue}>{heartRate}</Text>
                    <Text style={styles.heartRateLabel}>Current BPM</Text>
                  </View>
                </View>
              )}
              {restingHeartRate > 0 && (
                <View style={styles.heartRateItem}>
                  <Ionicons name="bed" size={24} color="#9C27B0" />
                  <View style={styles.heartRateContent}>
                    <Text style={styles.heartRateValue}>{restingHeartRate}</Text>
                    <Text style={styles.heartRateLabel}>Resting BPM</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Recovery Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recovery</Text>
          <View style={styles.recoveryCard}>
            <View style={styles.recoveryContent}>
              <Text style={styles.recoveryLabel}>Fasting duration</Text>
              <Text style={styles.recoveryValue}>{recoveryDuration}</Text>
              <Text style={styles.recoveryDate}>Today</Text>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/(tabs)/fasting')}
            >
              <View style={styles.addButtonInner}>
                <Ionicons name="moon" size={20} color="#4CAF50" />
                <View style={styles.addIcon}>
                  <Ionicons name="add" size={16} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  personalizedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  userNameText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  profileContainer: {
    marginLeft: 16,
  },
  profilePicture: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  datePickerScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  datePickerItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    minWidth: 60,
    position: 'relative',
  },
  datePickerItemActive: {
    backgroundColor: '#FFF0F5',
  },
  datePickerDayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  datePickerDayNumberActive: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E91E63',
  },
  datePickerDayName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
    textTransform: 'uppercase',
  },
  datePickerDayNameActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E91E63',
  },
  datePickerDot: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E91E63',
  },
  loadingIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  loadingText: {
    fontSize: 10,
    color: '#E91E63',
  },
  dataLoadingContainer: {
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dataLoadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginTop: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  mainMetricContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  fastingCard: {
    width: '100%',
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  fastingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  fastingIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fastingTextContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  mainMetricValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#333',
    letterSpacing: -1,
  },
  mainMetricLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 6,
    fontWeight: '500',
  },
  activityMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginTop: 12,
    gap: 12,
  },
  activityCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  activityCardGradient: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  activityIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4CAF50',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  activityLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Calories Section
  caloriesCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 8,
  },
  caloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  caloriesItem: {
    alignItems: 'center',
    flex: 1,
  },
  caloriesDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  caloriesValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  caloriesLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  calorieProgressContainer: {
    marginTop: 12,
  },
  calorieProgressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  calorieProgressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
  calorieProgressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  // Meals Section
  mealsCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 8,
  },
  mealsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  mealItem: {
    alignItems: 'center',
    flex: 1,
  },
  mealCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  mealLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
    gap: 8,
  },
  addMealText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  // Workouts Section
  workoutsCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 8,
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  workoutStat: {
    alignItems: 'center',
    flex: 1,
  },
  workoutStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  workoutStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  workoutItemContent: {
    flex: 1,
  },
  workoutItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  workoutItemDetails: {
    fontSize: 12,
    color: '#666',
  },
  // Heart Rate Section
  heartRateCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  heartRateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heartRateContent: {
    alignItems: 'flex-start',
  },
  heartRateValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  heartRateLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  recoveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 8,
  },
  recoveryContent: {
    flex: 1,
  },
  recoveryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  recoveryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recoveryDate: {
    fontSize: 14,
    color: '#666',
  },
  waterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  waterCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 24,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  waterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waterAddButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  waterButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterButtonComplete: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterAddButtonDisabled: {
    opacity: 0.6,
  },
  waterProgressContainer: {
    gap: 12,
  },
  waterProgressBar: {
    height: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    overflow: 'hidden',
  },
  waterProgressFill: {
    height: '100%',
    borderRadius: 10,
  },
  waterStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterText: {
    fontSize: 16,
    fontWeight: '600',
  },
  waterAmount: {
    color: '#2196F3',
    fontSize: 20,
    fontWeight: '800',
  },
  waterDivider: {
    color: '#999',
  },
  waterGoal: {
    color: '#666',
  },
  waterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  waterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F57F17',
  },
  // Chart Styles
  chartSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  chartTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  chartTabActive: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  chartTabTextActive: {
    color: '#fff',
  },
  chartCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  // Interactive Graph Styles (Skia-based)
  graphContainer: {
    width: screenWidth - 80,
    height: 250,
    marginVertical: 8,
    position: 'relative',
  },
  graph: {
    flex: 1,
    borderRadius: 16,
  },
  selectedPointInfo: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  selectedPointCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  selectedPointDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedPointValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  graphLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  graphLabel: {
    flex: 1,
    alignItems: 'center',
  },
  graphLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  graphLabelTextSelected: {
    color: '#333',
    fontWeight: '700',
    fontSize: 12,
  },
  graphHelperText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  pieChartCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  pieChartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  mealTypeVisualization: {
    gap: 16,
  },
  mealTypeBar: {
    marginBottom: 4,
  },
  mealTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mealTypeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTypeColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  mealTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  mealTypeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  mealTypeBarContainer: {
    height: 12,
    backgroundColor: '#E8E8E8',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 4,
  },
  mealTypeBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  mealTypePercentage: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  graphFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 40,
  },
  graphFallbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  graphFallbackSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    marginLeft: 12,
  },
  addButtonInner: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

