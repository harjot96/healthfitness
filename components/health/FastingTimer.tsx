import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Dimensions, TextInput, Alert } from 'react-native';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { CircularProgress } from '../common/CircularProgress';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { format, differenceInHours, differenceInMinutes, startOfWeek, endOfWeek, eachDayOfInterval, getDate, subDays } from 'date-fns';
import { getWeeklyFastingData, getMonthlyFastingData } from '../../services/storage/firestore';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration } from '../../utils/formatDuration';

const screenWidth = Dimensions.get('window').width;

export const FastingTimer: React.FC = () => {
  const { todayData, startFasting, stopFasting } = useHealth();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState('16:8');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ date: string; duration: number; type: string }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ date: string; duration: number; type: string }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showChart, setShowChart] = useState<'weekly' | 'monthly'>('weekly');
  const [showEatingWindow, setShowEatingWindow] = useState(false);
  const [selectedEatingWindow, setSelectedEatingWindow] = useState<string>('');
  const [showCustomInputs, setShowCustomInputs] = useState(false);
  const [customEatingHours, setCustomEatingHours] = useState('');
  const [customFastingHours, setCustomFastingHours] = useState('');

  const fastingTypes = [
    { label: '16:8', value: '16:8', hours: 16 },
    { label: '18:6', value: '18:6', hours: 18 },
    { label: '20:4', value: '20:4', hours: 20 },
    { label: '24:0', value: '24:0', hours: 24 },
    { label: 'Custom', value: 'custom', hours: 0 },
  ];

  const eatingWindows = [
    { label: '12:00 PM - 8:00 PM', value: '12-20', description: 'Lunch to Dinner' },
    { label: '1:00 PM - 9:00 PM', value: '13-21', description: 'Afternoon to Evening' },
    { label: '2:00 PM - 10:00 PM', value: '14-22', description: 'Late Lunch to Night' },
    { label: '10:00 AM - 6:00 PM', value: '10-18', description: 'Morning to Evening' },
    { label: '11:00 AM - 7:00 PM', value: '11-19', description: 'Brunch to Dinner' },
    { label: 'Custom', value: 'custom', description: 'Set your own window' },
  ];

  const activeSession = todayData?.fastingSession;
  const isFasting = activeSession && !activeSession.endTime;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isFasting && activeSession) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = differenceInHours(now, activeSession.startTime);
        const minutes = differenceInMinutes(now, activeSession.startTime) % 60;
        setElapsedTime(elapsed * 60 + minutes);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFasting, activeSession]);

  useEffect(() => {
    if (user) {
      loadWeeklyData();
      loadMonthlyData();
    }
  }, [user, selectedMonth]);

  const loadWeeklyData = async () => {
    if (!user) return;
    try {
      const data = await getWeeklyFastingData(user.uid);
      setWeeklyData(data);
    } catch (error) {
      console.error('Error loading weekly fasting data:', error);
    }
  };

  const loadMonthlyData = async () => {
    if (!user) return;
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      const data = await getMonthlyFastingData(user.uid, year, month);
      setMonthlyData(data);
    } catch (error) {
      console.error('Error loading monthly fasting data:', error);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const handleStartFasting = () => {
    // For custom, show input fields
    if (selectedType === 'custom') {
      setShowCustomInputs(true);
      return;
    }
    // For other types, show eating window selection
    setShowEatingWindow(true);
  };

  const handleCustomFastingStart = () => {
    const eatingHours = parseFloat(customEatingHours);
    const fastingHours = parseFloat(customFastingHours);

    // Validation
    if (!customEatingHours || !customFastingHours) {
      Alert.alert('Error', 'Please enter both eating and fasting hours');
      return;
    }

    if (eatingHours <= 0 || fastingHours <= 0) {
      Alert.alert('Error', 'Hours must be greater than 0');
      return;
    }

    if (eatingHours + fastingHours !== 24) {
      Alert.alert(
        'Warning',
        `Total hours (${eatingHours + fastingHours}) should equal 24 hours. Do you want to continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              startFasting('custom', fastingHours);
              setShowCustomInputs(false);
              setCustomEatingHours('');
              setCustomFastingHours('');
            },
          },
        ]
      );
      return;
    }

    // Start fasting with custom hours
    startFasting('custom', fastingHours);
    setShowCustomInputs(false);
    setCustomEatingHours('');
    setCustomFastingHours('');
  };

  const handleCancelCustom = () => {
    setShowCustomInputs(false);
    setCustomEatingHours('');
    setCustomFastingHours('');
  };

  const handleEatingWindowSelected = (window: string) => {
    setSelectedEatingWindow(window);
    setShowEatingWindow(false);
    // After selecting eating window, proceed to start fasting
    const selected = fastingTypes.find(t => t.value === selectedType);
    startFasting(selectedType, selected?.hours);
  };

  const handleCancelFasting = () => {
    setShowEatingWindow(false);
    setSelectedEatingWindow('');
  };

  const handleStopFasting = () => {
    stopFasting();
    setElapsedTime(0);
  };

  const getProgress = () => {
    if (!activeSession || !activeSession.targetDuration) return 0;
    const targetMinutes = activeSession.targetDuration * 60;
    return Math.min((elapsedTime / targetMinutes) * 100, 100);
  };

  const prepareWeeklyChartData = () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    const dataMap = new Map(weeklyData.map(d => [d.date, d.duration]));
    
    const labels = days.map(day => {
      const dayName = format(day, 'EEE');
      return dayName.substring(0, 1);
    });
    
    const data = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return dataMap.get(dateStr) || 0;
    });

    return { labels, data };
  };

  const prepareMonthlyChartData = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const days = eachDayOfInterval({ start, end });
    
    const dataMap = new Map(monthlyData.map(d => [d.date, d.duration]));
    
    // Show first 7 days for readability
    const labels = days.slice(0, 7).map(day => getDate(day).toString());
    const data = days.slice(0, 7).map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return dataMap.get(dateStr) || 0;
    });

    return { labels, data };
  };

  const getWeeklyStats = () => {
    const totalHours = weeklyData.reduce((sum, d) => sum + d.duration, 0);
    const avgHours = weeklyData.length > 0 ? totalHours / weeklyData.length : 0;
    const longestFast = weeklyData.length > 0 ? Math.max(...weeklyData.map(d => d.duration)) : 0;
    const completedSessions = weeklyData.length;
    
    return { totalHours, avgHours, longestFast, completedSessions };
  };

  const getMonthlyStats = () => {
    const totalHours = monthlyData.reduce((sum, d) => sum + d.duration, 0);
    const avgHours = monthlyData.length > 0 ? totalHours / monthlyData.length : 0;
    const longestFast = monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.duration), 0) : 0;
    const completedSessions = monthlyData.length;
    
    return { totalHours, avgHours, longestFast, completedSessions };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(selectedMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setSelectedMonth(newMonth);
  };

  const weeklyChartData = prepareWeeklyChartData();
  const monthlyChartData = prepareMonthlyChartData();
  const weeklyStats = getWeeklyStats();
  const monthlyStats = getMonthlyStats();
  const progress = getProgress();

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
    },
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Fasting Timer</Text>
      </View>

      {isFasting && activeSession ? (
        <View style={styles.activeContainer}>
          {/* Circular Progress */}
          <View style={styles.circularProgressContainer}>
            <CircularProgress
              size={220}
              strokeWidth={16}
              progress={progress}
              color="#9B59B6"
              backgroundColor="#E8E8E8"
            >
              <Ionicons name="moon" size={50} color="#9B59B6" />
            </CircularProgress>
            <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
            <Text style={styles.timerLabel}>Fasting Time</Text>
            {activeSession.targetDuration && (
              <Text style={styles.targetText}>
                Target: {activeSession.targetDuration}h • {progress.toFixed(1)}% Complete
              </Text>
            )}
          </View>

          {/* Progress Bar */}
          {activeSession.targetDuration && (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
            </View>
          )}

          <Button
            title="End Fast"
            onPress={handleStopFasting}
            variant="secondary"
            style={styles.stopButton}
          />
        </View>
      ) : showCustomInputs ? (
        <View style={styles.customContainer}>
          <Text style={styles.customTitle}>Custom Fasting Schedule</Text>
          <Text style={styles.customSubtitle}>
            Set your eating and fasting hours (should total 24 hours)
          </Text>

          <View style={styles.customInputContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Eating Hours</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.customInput}
                  placeholder="e.g., 8"
                  placeholderTextColor="#999"
                  value={customEatingHours}
                  onChangeText={setCustomEatingHours}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.inputUnit}>hours</Text>
              </View>
              <Text style={styles.inputHint}>Time window for eating</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fasting Hours</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.customInput}
                  placeholder="e.g., 16"
                  placeholderTextColor="#999"
                  value={customFastingHours}
                  onChangeText={setCustomFastingHours}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.inputUnit}>hours</Text>
              </View>
              <Text style={styles.inputHint}>Time window for fasting</Text>
            </View>

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={[
                styles.totalValue,
                parseFloat(customEatingHours || '0') + parseFloat(customFastingHours || '0') === 24
                  ? styles.totalValueCorrect
                  : styles.totalValueWarning
              ]}>
                {parseFloat(customEatingHours || '0') + parseFloat(customFastingHours || '0')} hours
              </Text>
            </View>

            {parseFloat(customEatingHours || '0') + parseFloat(customFastingHours || '0') !== 24 && 
             (customEatingHours || customFastingHours) && (
              <View style={styles.warningBox}>
                <Ionicons name="information-circle" size={20} color="#FF9800" />
                <Text style={styles.warningText}>
                  Total should be 24 hours for a complete day cycle
                </Text>
              </View>
            )}
          </View>

          <View style={styles.customActions}>
            <TouchableOpacity
              style={styles.cancelCustomButton}
              onPress={handleCancelCustom}
            >
              <Text style={styles.cancelCustomButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.startCustomButton,
                (!customEatingHours || !customFastingHours) && styles.startCustomButtonDisabled
              ]}
              onPress={handleCustomFastingStart}
              disabled={!customEatingHours || !customFastingHours}
            >
              <Text style={styles.startCustomButtonText}>Start Fasting</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : showEatingWindow ? (
        <View style={styles.eatingWindowContainer}>
          <Text style={styles.eatingWindowTitle}>Choose Your Eating Window</Text>
          <Text style={styles.eatingWindowSubtitle}>
            When would you like to eat during your {selectedType} fast?
          </Text>
          
          <ScrollView style={styles.eatingWindowList} showsVerticalScrollIndicator={false}>
            {eatingWindows.map(window => (
              <TouchableOpacity
                key={window.value}
                style={[
                  styles.eatingWindowCard,
                  selectedEatingWindow === window.value && styles.eatingWindowCardActive,
                ]}
                onPress={() => handleEatingWindowSelected(window.value)}
                activeOpacity={0.7}
              >
                <View style={styles.eatingWindowContent}>
                  <Text
                    style={[
                      styles.eatingWindowLabel,
                      selectedEatingWindow === window.value && styles.eatingWindowLabelActive,
                    ]}
                  >
                    {window.label}
                  </Text>
                  <Text
                    style={[
                      styles.eatingWindowDescription,
                      selectedEatingWindow === window.value && styles.eatingWindowDescriptionActive,
                    ]}
                  >
                    {window.description}
                  </Text>
                </View>
                {selectedEatingWindow === window.value && (
                  <Ionicons name="checkmark-circle" size={24} color="#9B59B6" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.eatingWindowActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelFasting}
            >
              <Text style={styles.cancelButtonText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.typeSelector}>
            <Text style={styles.sectionTitle}>Select Fasting Type</Text>
            <View style={styles.typeGrid}>
              {fastingTypes.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    selectedType === type.value && styles.typeButtonActive,
                  ]}
                  onPress={() => setSelectedType(type.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      selectedType === type.value && styles.typeButtonTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                  {type.hours > 0 && (
                    <Text
                      style={[
                        styles.typeButtonSubtext,
                        selectedType === type.value && styles.typeButtonSubtextActive,
                      ]}
                    >
                      {type.hours}h
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button
            title="Start Fasting"
            onPress={handleStartFasting}
            style={styles.startButton}
          />
        </>
      )}

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="calendar" size={20} color="#9B59B6" />
          </View>
          <Text style={styles.statValue}>{weeklyStats.completedSessions}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="time" size={20} color="#9B59B6" />
          </View>
          <Text style={styles.statValue}>{formatDuration(weeklyStats.totalHours)}</Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="trending-up" size={20} color="#9B59B6" />
          </View>
          <Text style={styles.statValue}>{formatDuration(weeklyStats.avgHours)}</Text>
          <Text style={styles.statLabel}>Avg Duration</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="trophy" size={20} color="#9B59B6" />
          </View>
          <Text style={styles.statValue}>{formatDuration(weeklyStats.longestFast)}</Text>
          <Text style={styles.statLabel}>Longest Fast</Text>
        </View>
      </View>

      {/* Chart Section */}
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <TouchableOpacity
            style={[styles.chartTab, showChart === 'weekly' && styles.chartTabActive]}
            onPress={() => setShowChart('weekly')}
          >
            <Text style={[styles.chartTabText, showChart === 'weekly' && styles.chartTabTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chartTab, showChart === 'monthly' && styles.chartTabActive]}
            onPress={() => setShowChart('monthly')}
          >
            <Text style={[styles.chartTabText, showChart === 'monthly' && styles.chartTabTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        {showChart === 'weekly' ? (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Weekly Progress</Text>
            <LineChart
              data={{
                labels: weeklyChartData.labels,
                datasets: [
                  {
                    data: weeklyChartData.data.map(h => h * 60), // Convert hours to minutes for better display
                    color: (opacity = 1) => `rgba(155, 89, 182, ${opacity})`,
                    strokeWidth: 3,
                  },
                ],
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(155, 89, 182, ${opacity})`,
                formatYLabel: (value) => {
                  const minutes = Math.round(parseFloat(value));
                  if (minutes < 60) return `${minutes}m`;
                  const hours = Math.floor(minutes / 60);
                  const mins = minutes % 60;
                  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                },
              }}
              bezier
              style={styles.chart}
              yAxisSuffix=""
            />
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={() => navigateMonth('prev')}>
                <Ionicons name="chevron-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.chartTitle}>
                {format(selectedMonth, 'MMMM yyyy')}
              </Text>
              <TouchableOpacity onPress={() => navigateMonth('next')}>
                <Ionicons name="chevron-forward" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <BarChart
              data={{
                labels: monthlyChartData.labels,
                datasets: [
                  {
                    data: monthlyChartData.data.map(h => h * 60), // Convert hours to minutes
                  },
                ],
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(155, 89, 182, ${opacity})`,
                formatTopBarValue: (value) => {
                  const minutes = Math.round(parseFloat(value));
                  if (minutes < 60) return `${minutes}m`;
                  const hours = Math.floor(minutes / 60);
                  const mins = minutes % 60;
                  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                },
              }}
              showValuesOnTopOfBars
              fromZero
              style={styles.chart}
            />
            <View style={styles.monthlyStats}>
              <View style={styles.monthlyStat}>
                <Text style={styles.monthlyStatValue}>{monthlyStats.completedSessions}</Text>
                <Text style={styles.monthlyStatLabel}>Sessions</Text>
              </View>
              <View style={styles.monthlyStat}>
                <Text style={styles.monthlyStatValue}>{formatDuration(monthlyStats.totalHours)}</Text>
                <Text style={styles.monthlyStatLabel}>Total Hours</Text>
              </View>
              <View style={styles.monthlyStat}>
                <Text style={styles.monthlyStatValue}>{formatDuration(monthlyStats.avgHours)}</Text>
                <Text style={styles.monthlyStatLabel}>Average</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Recent Sessions */}
      {weeklyData.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {weeklyData.slice(-5).reverse().map((session, index) => (
            <View key={index} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyDate}>{format(new Date(session.date), 'MMM dd')}</Text>
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>{session.type}</Text>
                </View>
              </View>
              <View style={styles.historyContent}>
                <Ionicons name="time-outline" size={20} color="#9B59B6" />
                <Text style={styles.historyDuration}>{formatDuration(session.duration)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {activeSession && activeSession.endTime && (
        <View style={styles.completedSession}>
          <View style={styles.completedHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.completedTitle}>Last Completed Session</Text>
          </View>
          <View style={styles.completedDetails}>
            <View style={styles.completedRow}>
              <Text style={styles.completedLabel}>Duration:</Text>
              <Text style={styles.completedValue}>{formatDuration(activeSession.duration)}</Text>
            </View>
            <View style={styles.completedRow}>
              <Text style={styles.completedLabel}>Type:</Text>
              <Text style={styles.completedValue}>{activeSession.type}</Text>
            </View>
            <View style={styles.completedRow}>
              <Text style={styles.completedLabel}>Completed:</Text>
              <Text style={styles.completedValue}>
                {format(activeSession.endTime, 'MMM dd, yyyy HH:mm')}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  activeContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
  },
  circularProgressContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timer: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  timerLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  targetText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  progressSection: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#E8E8E8',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9B59B6',
    borderRadius: 6,
  },
  stopButton: {
    width: '100%',
  },
  typeSelector: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    minWidth: '30%',
    padding: 18,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    backgroundColor: '#fff',
    justifyContent: 'center',
    minHeight: 80,
  },
  typeButtonActive: {
    backgroundColor: '#9B59B6',
    borderColor: '#9B59B6',
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  typeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  typeButtonSubtext: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  typeButtonSubtextActive: {
    color: '#fff',
    opacity: 0.95,
  },
  startButton: {
    margin: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5E6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  chartSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  chartTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  chartTabActive: {
    backgroundColor: '#9B59B6',
  },
  chartTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  chartTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  monthlyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  monthlyStat: {
    alignItems: 'center',
  },
  monthlyStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9B59B6',
    marginBottom: 4,
  },
  monthlyStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  historySection: {
    padding: 20,
  },
  historyCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9B59B6',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  historyBadge: {
    backgroundColor: '#f0e6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyBadgeText: {
    fontSize: 12,
    color: '#9B59B6',
    fontWeight: '600',
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDuration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9B59B6',
  },
  completedSession: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  completedDetails: {
    gap: 12,
  },
  completedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedLabel: {
    fontSize: 14,
    color: '#666',
  },
  completedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  eatingWindowContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    maxHeight: '80%',
  },
  eatingWindowTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  eatingWindowSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  eatingWindowList: {
    maxHeight: 400,
  },
  eatingWindowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  eatingWindowCardActive: {
    backgroundColor: '#F5E6FF',
    borderColor: '#9B59B6',
  },
  eatingWindowContent: {
    flex: 1,
  },
  eatingWindowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eatingWindowLabelActive: {
    color: '#9B59B6',
  },
  eatingWindowDescription: {
    fontSize: 13,
    color: '#666',
  },
  eatingWindowDescriptionActive: {
    color: '#9B59B6',
  },
  eatingWindowActions: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  cancelButton: {
    padding: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  customContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  customTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  customSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  customInputContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 14,
  },
  inputUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  inputHint: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalValueCorrect: {
    color: '#4CAF50',
  },
  totalValueWarning: {
    color: '#FF9800',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FF9800',
  },
  customActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelCustomButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cancelCustomButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  startCustomButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#9B59B6',
  },
  startCustomButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  startCustomButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

