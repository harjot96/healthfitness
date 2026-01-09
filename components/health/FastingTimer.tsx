import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Dimensions, TextInput, Alert, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import Constants from 'expo-constants';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { CircularProgress } from '../common/CircularProgress';
import { format, differenceInHours, differenceInMinutes, startOfWeek, endOfWeek, eachDayOfInterval, getDate, subDays } from 'date-fns';
import { getWeeklyFastingData, getMonthlyFastingData } from '../../services/storage/firestore';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration } from '../../utils/formatDuration';
import { GraphContainer } from '../common/GraphContainer';
import { graphColors, graphGradients } from '../../utils/graphConfig';
import { prepareWeeklyPoints, prepareMonthlyPoints } from '../../utils/graphHelpers';

const screenWidth = Dimensions.get('window').width;

export const FastingTimer: React.FC = () => {
  const { todayData, startFasting, stopFasting } = useHealth();
  const { user } = useAuth();
  const [LineGraphComponent, setLineGraphComponent] = useState<any>(null);
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
  const [showCustomEatingWindow, setShowCustomEatingWindow] = useState(false);
  const [customEatingWindowStart, setCustomEatingWindowStart] = useState('');
  const [customEatingWindowEnd, setCustomEatingWindowEnd] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<{ date: string; value: number } | null>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  const isExpoGo = Constants.appOwnership === 'expo';
  const canUseGraph = Platform.OS !== 'web' && !isExpoGo;

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
    // Initialize elapsed time immediately when active session is detected
    if (isFasting && activeSession) {
      const now = new Date();
      const elapsed = differenceInHours(now, activeSession.startTime);
      const minutes = differenceInMinutes(now, activeSession.startTime) % 60;
      setElapsedTime(elapsed * 60 + minutes);
    } else {
      setElapsedTime(0);
    }

    // Update elapsed time every second
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
    let cancelled = false;

    if (!canUseGraph) {
      setLineGraphComponent(null);
      return undefined;
    }

    (async () => {
      try {
        const Graph = await import('react-native-graph');
        if (!cancelled) setLineGraphComponent(() => Graph.LineGraph);
      } catch (error) {
        if (!cancelled) {
          console.warn('react-native-graph is not available. Graph features will be disabled.');
          setLineGraphComponent(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canUseGraph]);

  useEffect(() => {
    if (user) {
      loadWeeklyData();
      loadMonthlyData();
    }
  }, [user, selectedMonth]);

  const loadWeeklyData = async () => {
    if (!user) return;
    setLoadingWeekly(true);
    setWeeklyError(null);
    try {
      const data = await getWeeklyFastingData(user.uid);
      setWeeklyData(data);
    } catch (error: any) {
      console.error('Error loading weekly fasting data:', error);
      setWeeklyError(error.message || 'Failed to load weekly data');
    } finally {
      setLoadingWeekly(false);
    }
  };

  const loadMonthlyData = async () => {
    if (!user) return;
    setLoadingMonthly(true);
    setMonthlyError(null);
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      const data = await getMonthlyFastingData(user.uid, year, month);
      setMonthlyData(data);
    } catch (error: any) {
      console.error('Error loading monthly fasting data:', error);
      setMonthlyError(error.message || 'Failed to load monthly data');
    } finally {
      setLoadingMonthly(false);
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
              startFasting('custom', fastingHours, undefined);
              setShowCustomInputs(false);
              setCustomEatingHours('');
              setCustomFastingHours('');
            },
          },
        ]
      );
      return;
    }

    // Start fasting with custom hours (no eating window for custom fasting type)
    startFasting('custom', fastingHours, undefined);
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
    if (window === 'custom') {
      setShowCustomEatingWindow(true);
      return;
    }
    
    setSelectedEatingWindow(window);
    setShowEatingWindow(false);
    
    // Calculate eating window times
    const [startHour, endHour] = window.split('-').map(Number);
    const eatingWindow: { startHour: number; endHour: number; value: string } = {
      startHour,
      endHour,
      value: window,
    };
    
    // After selecting eating window, proceed to start fasting
    const selected = fastingTypes.find(t => t.value === selectedType);
    startFasting(selectedType, selected?.hours, eatingWindow);
  };

  const handleCustomEatingWindowConfirm = () => {
    const startHour = parseInt(customEatingWindowStart, 10);
    const endHour = parseInt(customEatingWindowEnd, 10);

    // Validation
    if (isNaN(startHour) || isNaN(endHour)) {
      Alert.alert('Error', 'Please enter valid hours (0-23)');
      return;
    }

    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
      Alert.alert('Error', 'Hours must be between 0 and 23');
      return;
    }

    if (startHour === endHour) {
      Alert.alert('Error', 'Start and end hours cannot be the same');
      return;
    }

    setShowCustomEatingWindow(false);
    setShowEatingWindow(false);
    
    const eatingWindow: { startHour: number; endHour: number; value: string } = {
      startHour,
      endHour,
      value: `custom-${startHour}-${endHour}`,
    };
    
    const selected = fastingTypes.find(t => t.value === selectedType);
    startFasting(selectedType, selected?.hours, eatingWindow);
    
    // Reset custom inputs
    setCustomEatingWindowStart('');
    setCustomEatingWindowEnd('');
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

  // Prepare weekly graph points for Skia-based LineGraph
  const prepareWeeklyGraphPoints = (): any[] => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    const dataMap = new Map(weeklyData.map(d => [d.date, d.duration]));
    
    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const hours = dataMap.get(dateStr) || 0;
      // Convert hours to minutes for better granularity
      return {
        date: day,
        value: hours * 60,
      };
    });
  };

  // Prepare monthly graph points for Skia-based LineGraph
  const prepareMonthlyGraphPoints = (): any[] => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const days = eachDayOfInterval({ start, end });
    
    const dataMap = new Map(monthlyData.map(d => [d.date, d.duration]));
    
    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const hours = dataMap.get(dateStr) || 0;
      // Convert hours to minutes for better granularity
      return {
        date: day,
        value: hours * 60,
      };
    });
  };

  const weeklyGraphPoints = prepareWeeklyGraphPoints();
  const monthlyGraphPoints = prepareMonthlyGraphPoints();

  // Format value for display (minutes to hours)
  const formatValue = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
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

  const calculateStreak = (): number => {
    // Combine weekly and monthly data, remove duplicates
    const allSessions = [...weeklyData, ...monthlyData];
    const uniqueSessions = Array.from(
      new Map(allSessions.map(s => [s.date, s])).values()
    ).filter(s => s.duration > 0); // Only count completed sessions
    
    if (uniqueSessions.length === 0) return 0;
    
    // Sort by date descending (most recent first)
    uniqueSessions.sort((a, b) => b.date.localeCompare(a.date));
    
    let streak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    let currentDate = new Date(today);
    
    // Check today first
    const todaySession = uniqueSessions.find(s => s.date === today);
    if (todaySession || isFasting) {
      streak = 1;
      currentDate = subDays(currentDate, 1);
    } else {
      return 0; // No streak if today doesn't have a session
    }
    
    // Check previous days
    for (let i = 0; i < 365; i++) { // Max streak check of 1 year
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const session = uniqueSessions.find(s => s.date === dateStr);
      
      if (session) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break; // Streak broken
      }
    }
    
    return streak;
  };

  const weeklyStats = getWeeklyStats();
  const monthlyStats = getMonthlyStats();
  const progress = getProgress();
  const streak = calculateStreak();

  const handleRefresh = async () => {
    await Promise.all([loadWeeklyData(), loadMonthlyData()]);
  };

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loadingWeekly || loadingMonthly}
          onRefresh={handleRefresh}
          tintColor="#9B59B6"
          colors={['#9B59B6']}
        />
      }
    >
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
            {activeSession.eatingWindow && (
              <View style={styles.eatingWindowInfo}>
                <Ionicons name="time-outline" size={16} color="#9B59B6" />
                <Text style={styles.eatingWindowInfoText}>
                  Eating Window: {activeSession.eatingWindow.startHour}:00 - {activeSession.eatingWindow.endHour}:00
                </Text>
              </View>
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
      ) : showCustomEatingWindow ? (
        <View style={styles.customContainer}>
          <Text style={styles.customTitle}>Custom Eating Window</Text>
          <Text style={styles.customSubtitle}>
            Enter your custom eating window hours (0-23)
          </Text>

          <View style={styles.customInputContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Hour</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.customInput}
                  placeholder="e.g., 12"
                  placeholderTextColor="#999"
                  value={customEatingWindowStart}
                  onChangeText={setCustomEatingWindowStart}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.inputUnit}>:00</Text>
              </View>
              <Text style={styles.inputHint}>Hour when eating window starts (0-23)</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End Hour</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.customInput}
                  placeholder="e.g., 20"
                  placeholderTextColor="#999"
                  value={customEatingWindowEnd}
                  onChangeText={setCustomEatingWindowEnd}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.inputUnit}>:00</Text>
              </View>
              <Text style={styles.inputHint}>Hour when eating window ends (0-23)</Text>
            </View>
          </View>

          <View style={styles.customActions}>
            <TouchableOpacity
              style={styles.cancelCustomButton}
              onPress={() => {
                setShowCustomEatingWindow(false);
                setCustomEatingWindowStart('');
                setCustomEatingWindowEnd('');
              }}
            >
              <Text style={styles.cancelCustomButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.startCustomButton,
                (!customEatingWindowStart || !customEatingWindowEnd) && styles.startCustomButtonDisabled
              ]}
              onPress={handleCustomEatingWindowConfirm}
              disabled={!customEatingWindowStart || !customEatingWindowEnd}
            >
              <Text style={styles.startCustomButtonText}>Confirm</Text>
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
            <Ionicons name="flame" size={20} color="#FF6B35" />
          </View>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
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
            {loadingWeekly ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9B59B6" />
                <Text style={styles.loadingText}>Loading weekly data...</Text>
              </View>
            ) : weeklyError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
                <Text style={styles.errorText}>{weeklyError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadWeeklyData}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
            <View style={styles.graphWrapper}>
              {LineGraphComponent ? (
                <>
                  <LineGraphComponent
                    style={styles.graph}
                    points={weeklyGraphPoints}
                    animated={true}
                    color={graphColors.fasting}
                    gradientFillColors={graphGradients.fasting}
                    enablePanGesture={true}
                    enableIndicator={true}
                    indicatorPulsating={true}
                    onGestureStart={() => setSelectedPoint(null)}
                    onPointSelected={(point) => {
                      const dayDate = format(point.date, 'MMM d');
                      setSelectedPoint({
                        date: dayDate,
                        value: point.value,
                      });
                    }}
                    onGestureEnd={() => {
                      // Keep selected point visible
                    }}
                    lineThickness={3}
                    enableFadeInMask={true}
                    panGestureDelay={0}
                    horizontalPadding={16}
                    verticalPadding={16}
                  />
                  
                  {/* Selected Point Info */}
                  {selectedPoint && (
                    <View style={styles.selectedPointInfo}>
                      <View style={styles.selectedPointCard}>
                        <Text style={styles.selectedPointDate}>{selectedPoint.date}</Text>
                        <Text style={styles.selectedPointValue}>
                          {formatValue(selectedPoint.value)}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.graphFallback}>
                  <Ionicons name="bar-chart-outline" size={64} color="#999" />
                  <Text style={styles.graphFallbackText}>Graph unavailable</Text>
                  <Text style={styles.graphFallbackSubtext}>
                    Weekly data: {weeklyData.length} sessions recorded
                  </Text>
                  {weeklyData.length > 0 && (
                    <View style={styles.dataList}>
                      {weeklyData.slice(0, 7).map((item, index) => (
                        <View key={index} style={styles.dataItem}>
                          <Text style={styles.dataDate}>{format(new Date(item.date), 'MMM d')}</Text>
                          <Text style={styles.dataValue}>{formatValue(item.duration * 60)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
            )}
            {LineGraphComponent && !loadingWeekly && !weeklyError && (
              <Text style={styles.graphHelperText}>
                Touch and drag to explore weekly fasting data
              </Text>
            )}
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
            {loadingMonthly ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9B59B6" />
                <Text style={styles.loadingText}>Loading monthly data...</Text>
              </View>
            ) : monthlyError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
                <Text style={styles.errorText}>{monthlyError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadMonthlyData}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
            <View style={styles.graphWrapper}>
              {LineGraphComponent ? (
                <>
                  <LineGraphComponent
                    style={styles.graph}
                    points={monthlyGraphPoints}
                    animated={true}
                    color={graphColors.fasting}
                    gradientFillColors={graphGradients.fasting}
                    enablePanGesture={true}
                    enableIndicator={true}
                    indicatorPulsating={true}
                    onGestureStart={() => setSelectedPoint(null)}
                    onPointSelected={(point) => {
                      const dayDate = format(point.date, 'MMM d');
                      setSelectedPoint({
                        date: dayDate,
                        value: point.value,
                      });
                    }}
                    onGestureEnd={() => {
                      // Keep selected point visible
                    }}
                    lineThickness={3}
                    enableFadeInMask={true}
                    panGestureDelay={0}
                    horizontalPadding={16}
                    verticalPadding={16}
                  />
                  
                  {/* Selected Point Info */}
                  {selectedPoint && (
                    <View style={styles.selectedPointInfo}>
                      <View style={styles.selectedPointCard}>
                        <Text style={styles.selectedPointDate}>{selectedPoint.date}</Text>
                        <Text style={styles.selectedPointValue}>
                          {formatValue(selectedPoint.value)}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.graphFallback}>
                  <Ionicons name="bar-chart-outline" size={64} color="#999" />
                  <Text style={styles.graphFallbackText}>Graph unavailable</Text>
                  <Text style={styles.graphFallbackSubtext}>
                    Monthly data: {monthlyData.length} sessions recorded
                  </Text>
                  {monthlyData.length > 0 && (
                    <ScrollView style={styles.dataList}>
                      {monthlyData.slice(0, 15).map((item, index) => (
                        <View key={index} style={styles.dataItem}>
                          <Text style={styles.dataDate}>{format(new Date(item.date), 'MMM d')}</Text>
                          <Text style={styles.dataValue}>{formatValue(item.duration * 60)}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
            )}
            {LineGraphComponent && !loadingMonthly && !monthlyError && (
              <Text style={styles.graphHelperText}>
                Touch and drag to explore monthly fasting data
              </Text>
            )}
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
  eatingWindowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5E6FF',
    borderRadius: 8,
  },
  eatingWindowInfoText: {
    fontSize: 14,
    color: '#9B59B6',
    fontWeight: '600',
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
  graphWrapper: {
    width: screenWidth - 40,
    height: 250,
    position: 'relative',
    marginVertical: 8,
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
    borderColor: 'rgba(155, 89, 182, 0.2)',
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
    color: '#9B59B6',
  },
  graphHelperText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
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
  dataList: {
    marginTop: 20,
    width: '100%',
  },
  dataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
  },
  dataDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 16,
    color: '#9B59B6',
    fontWeight: '600',
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#9B59B6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
