import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';
import { CircularProgress } from '../../components/common/CircularProgress';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { differenceInHours, differenceInMinutes, subDays, eachDayOfInterval, format as formatDate, isToday, isSameDay } from 'date-fns';
import { format } from 'date-fns';
import { getWeeklyHealthData, getDailyHealthData } from '../../services/storage/firestore';
import { DailyHealthData } from '../../types';

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

  const loadDateData = async () => {
    if (!user) return;
    try {
      const dates = datePickerDates.map(d => formatDate(d, 'yyyy-MM-dd'));
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
    
    const dateStr = formatDate(selectedDate, 'yyyy-MM-dd');
    
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

  // Prepare chart data
  const prepareWeeklyChartData = () => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    const dataMap = new Map(weeklyData.map(d => [d.date, d]));

    const labels = days.map(day => formatDate(day, 'EEE').substring(0, 1));
    
    if (selectedChart === 'steps') {
      const data = days.map(day => {
        const dateStr = formatDate(day, 'yyyy-MM-dd');
        return dataMap.get(dateStr)?.steps || 0;
      });
      return { labels, data };
    } else if (selectedChart === 'calories') {
      const consumedData = days.map(day => {
        const dateStr = formatDate(day, 'yyyy-MM-dd');
        return dataMap.get(dateStr)?.caloriesConsumed || 0;
      });
      const burnedData = days.map(day => {
        const dateStr = formatDate(day, 'yyyy-MM-dd');
        return dataMap.get(dateStr)?.caloriesBurned || 0;
      });
      return { labels, consumedData, burnedData };
    } else {
      const data = days.map(day => {
        const dateStr = formatDate(day, 'yyyy-MM-dd');
        return dataMap.get(dateStr)?.waterIntake || 0;
      });
      return { labels, data };
    }
  };

  const chartData = prepareWeeklyChartData();

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

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#4CAF50',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
    },
  };

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
              const dateStr = formatDate(date, 'yyyy-MM-dd');
              const isSelected = isSameDay(date, selectedDate);
              const dayNumber = formatDate(date, 'd');
              const dayName = formatDate(date, 'EEE');
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
          <CircularProgress
            size={200}
            strokeWidth={14}
            progress={fastingProgress}
            color="#9B59B6"
            backgroundColor="#E8E8E8"
          >
            <Ionicons name="moon" size={40} color="#9B59B6" />
          </CircularProgress>
          <Text style={styles.mainMetricValue}>{fastingDuration}</Text>
          <Text style={styles.mainMetricLabel}>Fasting</Text>
        </View>

        {/* Activity Metrics */}
        <View style={styles.activityMetrics}>
          <View style={styles.activityCircle}>
            <View style={styles.activityDot} />
            <Ionicons name="footsteps" size={32} color="#4CAF50" />
            <Text style={styles.activityValue}>{steps.toLocaleString()}</Text>
            <Text style={styles.activityLabel}>Steps</Text>
          </View>
          
          <View style={styles.activityCircle}>
            <View style={styles.activityDot} />
            <Ionicons name="flash" size={32} color="#4CAF50" />
            <Text style={styles.activityValue}>{zoneMinutes}</Text>
            <Text style={styles.activityLabel}>Zone Min</Text>
          </View>
          
          <View style={styles.activityCircle}>
            <View style={styles.activityDot} />
            <Ionicons name="leaf" size={32} color="#4CAF50" />
            <Text style={styles.activityValue}>{mindfulDays} of 6</Text>
            <Text style={styles.activityLabel}>Mindful days</Text>
          </View>
        </View>

        {/* Water Intake Section */}
        <View style={styles.waterSection}>
          <Text style={styles.sectionTitle}>Water Intake</Text>
          <View style={styles.waterCard}>
            <View style={styles.waterContent}>
              <View style={styles.waterProgressContainer}>
                <View style={styles.waterProgressBar}>
                  <View style={[
                    styles.waterProgressFill, 
                    { 
                      width: `${waterProgress}%`,
                      backgroundColor: waterIntake >= waterGoal ? '#4CAF50' : '#2196F3'
                    }
                  ]} />
                </View>
                <Text style={styles.waterText}>
                  {waterIntake} / {waterGoal} glasses
                  {waterIntake >= waterGoal && ' ✓'}
                </Text>
                {waterIntake >= waterGoal && (
                  <Text style={styles.waterGoalAchieved}>
                    🎉 Daily goal achieved!
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity 
              style={[
                styles.addButton,
                waterIntake >= waterGoal && styles.addButtonDisabled
              ]}
              onPress={() => router.push('/(tabs)/water')}
              disabled={waterIntake >= waterGoal}
            >
              <View style={styles.addButtonInner}>
                <Ionicons 
                  name="water" 
                  size={20} 
                  color={waterIntake >= waterGoal ? "#ccc" : "#4CAF50"} 
                />
                {waterIntake < waterGoal && (
                  <View style={styles.addIcon}>
                    <Ionicons name="add" size={16} color="#fff" />
                  </View>
                )}
                {waterIntake >= waterGoal && (
                  <View style={styles.checkIcon}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
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
            {selectedChart === 'steps' && (
              <LineChart
                data={{
                  labels: chartData.labels,
                  datasets: [
                    {
                      data: chartData.data,
                      color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                      strokeWidth: 3,
                    },
                  ],
                }}
                width={screenWidth - 80}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                }}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                withDots={true}
                withShadow={false}
                onDataPointClick={(data) => {
                  const dayIndex = data.index;
                  const dayDate = formatDate(subDays(new Date(), 6 - dayIndex), 'MMM d');
                  Alert.alert(
                    'Steps Details',
                    `${dayDate}: ${Math.round(data.value).toLocaleString()} steps`,
                    [{ text: 'OK' }]
                  );
                }}
              />
            )}
            {selectedChart === 'calories' && (
              <LineChart
                data={{
                  labels: chartData.labels,
                  datasets: [
                    {
                      data: chartData.consumedData,
                      color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
                      strokeWidth: 3,
                    },
                    {
                      data: chartData.burnedData,
                      color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                      strokeWidth: 3,
                    },
                  ],
                }}
                width={screenWidth - 80}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
                }}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                withDots={true}
                withShadow={false}
                onDataPointClick={(data) => {
                  const dayIndex = data.index;
                  const dayDate = formatDate(subDays(new Date(), 6 - dayIndex), 'MMM d');
                  const consumed = chartData.consumedData[dayIndex];
                  const burned = chartData.burnedData[dayIndex];
                  Alert.alert(
                    'Calories Details',
                    `${dayDate}\nConsumed: ${Math.round(consumed)} kcal\nBurned: ${Math.round(burned)} kcal\nNet: ${Math.round(consumed - burned)} kcal`,
                    [{ text: 'OK' }]
                  );
                }}
              />
            )}
            {selectedChart === 'water' && (
              <BarChart
                data={{
                  labels: chartData.labels,
                  datasets: [
                    {
                      data: chartData.data,
                    },
                  ],
                }}
                width={screenWidth - 80}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                }}
                showValuesOnTopOfBars
                fromZero
                style={styles.chart}
                onDataPointClick={(data) => {
                  const dayIndex = data.index;
                  const dayDate = formatDate(subDays(new Date(), 6 - dayIndex), 'MMM d');
                  Alert.alert(
                    'Water Intake',
                    `${dayDate}: ${Math.round(data.value)} glasses`,
                    [{ text: 'OK' }]
                  );
                }}
              />
            )}
            <View style={styles.chartLegend}>
              {selectedChart === 'calories' && (
                <>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF6B35' }]} />
                    <Text style={styles.legendText}>Consumed</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.legendText}>Burned</Text>
                  </View>
                </>
              )}
            </View>
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
              <PieChart
                data={mealTypeData}
                width={screenWidth - 80}
                height={220}
                chartConfig={chartConfig}
                accessor="calories"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
                absolute
              />
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
    backgroundColor: '#f5f5f5',
  },
  personalizedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  userNameText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  mainMetricContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
  },
  mainMetricValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  mainMetricLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  activityMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  activityCircle: {
    alignItems: 'center',
    position: 'relative',
  },
  activityDot: {
    position: 'absolute',
    bottom: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    zIndex: 1,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  activityLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  // Calories Section
  caloriesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
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
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  waterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  waterContent: {
    flex: 1,
  },
  waterProgressContainer: {
    marginBottom: 8,
  },
  waterProgressBar: {
    height: 20,
    backgroundColor: '#E8E8E8',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  waterProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  waterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  waterGoalAchieved: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  checkIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  addButton: {
    marginLeft: 16,
  },
  addButtonInner: {
    position: 'relative',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  // Chart Styles
  chartSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  chartTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  chartTabActive: {
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
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
  pieChartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  pieChartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
});

