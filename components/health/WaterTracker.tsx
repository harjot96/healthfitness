import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Alert, Dimensions, Platform } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate } from 'date-fns';
import { getMonthlyWaterData } from '../../services/storage/firestore';

const screenWidth = Dimensions.get('window').width;

export const WaterTracker: React.FC = () => {
  const { todayData, addWaterEntry } = useHealth();
  const { user } = useAuth();
  const [LineGraphComponent, setLineGraphComponent] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<{ date: string; waterIntake: number }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedPoint, setSelectedPoint] = useState<{ date: string; value: number } | null>(null);
  const isExpoGo = Constants.appOwnership === 'expo';
  const canUseGraph = Platform.OS !== 'web' && !isExpoGo;

  const currentWater = todayData?.waterIntake || 0;
  const goal = 8; // 8 glasses per day (64oz)
  const progress = Math.min((currentWater / goal) * 100, 100);

  useEffect(() => {
    loadMonthlyData();
  }, [selectedMonth, user]);

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

  const loadMonthlyData = async () => {
    if (!user) return;
    
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      const data = await getMonthlyWaterData(user.uid, year, month);
      setMonthlyData(data);
    } catch (error) {
      console.error('Error loading monthly water data:', error);
    }
  };

  const handleAddWater = async (glasses: number) => {
    try {
      // Check if adding water would exceed the goal
      const newTotal = currentWater + glasses;
      if (newTotal > goal) {
        const remaining = goal - currentWater;
        if (remaining > 0) {
          Alert.alert(
            'Water Limit Reached',
            `You can only add ${remaining.toFixed(1)} more glass${remaining === 1 ? '' : 'es'} to reach your daily goal of ${goal} glasses.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: `Add ${remaining.toFixed(1)}`,
                onPress: async () => {
                  await addWaterEntry(remaining);
                  await loadMonthlyData();
                },
              },
            ]
          );
        } else {
          Alert.alert('Water Goal Achieved', `You've already reached your daily goal of ${goal} glasses! 🎉`);
        }
        return;
      }
      
      await addWaterEntry(glasses);
      await loadMonthlyData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add water entry');
    }
  };

  // Prepare graph points for Skia-based LineGraph
  const prepareGraphPoints = (): any[] => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const days = eachDayOfInterval({ start, end });
    
    const dataMap = new Map(monthlyData.map(d => [d.date, d.waterIntake]));
    
    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const value = dataMap.get(dateStr) || 0;
      return {
        date: day,
        value: value,
      };
    });
  };

  const graphPoints = prepareGraphPoints();

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
    propsForBackgroundLines: {
      strokeDasharray: '',
    },
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Today's Water Intake */}
      <View style={styles.todaySection}>
        <Text style={styles.sectionTitle}>Today's Water Intake</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentWater} / {goal} glasses
          </Text>
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.quickAddContainer}>
          <Text style={styles.quickAddLabel}>Quick Add:</Text>
          <View style={styles.quickAddButtons}>
            <TouchableOpacity
              style={[
                styles.quickAddButton,
                currentWater >= goal && styles.quickAddButtonDisabled
              ]}
              onPress={() => handleAddWater(1)}
              disabled={currentWater >= goal}
            >
              <Ionicons 
                name="water" 
                size={24} 
                color={currentWater >= goal ? "#ccc" : "#4CAF50"} 
              />
              <Text style={[
                styles.quickAddText,
                currentWater >= goal && styles.quickAddTextDisabled
              ]}>
                +1
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickAddButton,
                currentWater >= goal && styles.quickAddButtonDisabled
              ]}
              onPress={() => handleAddWater(2)}
              disabled={currentWater >= goal}
            >
              <Ionicons 
                name="water" 
                size={24} 
                color={currentWater >= goal ? "#ccc" : "#4CAF50"} 
              />
              <Text style={[
                styles.quickAddText,
                currentWater >= goal && styles.quickAddTextDisabled
              ]}>
                +2
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickAddButton,
                currentWater >= goal && styles.quickAddButtonDisabled
              ]}
              onPress={() => handleAddWater(0.5)}
              disabled={currentWater >= goal}
            >
              <Ionicons 
                name="water-outline" 
                size={24} 
                color={currentWater >= goal ? "#ccc" : "#4CAF50"} 
              />
              <Text style={[
                styles.quickAddText,
                currentWater >= goal && styles.quickAddTextDisabled
              ]}>
                +0.5
              </Text>
            </TouchableOpacity>
          </View>
          {currentWater >= goal && (
            <Text style={styles.limitReachedText}>
              🎉 Daily goal achieved! ({goal} glasses)
            </Text>
          )}
        </View>
      </View>

      {/* Monthly Chart */}
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
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

        <View style={styles.chartContainer}>
          <View style={styles.graphWrapper}>
            {LineGraphComponent ? (
              <>
                <LineGraphComponent
                  style={styles.graph}
                  points={graphPoints}
                  animated={true}
                  color="#2196F3"
                  gradientFillColors={['#2196F3', '#42A5F5']}
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
                        {Math.round(selectedPoint.value)} glasses
                      </Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.graphFallback}>
                <Ionicons name="water-outline" size={64} color="#999" />
                <Text style={styles.graphFallbackText}>Graph unavailable</Text>
                <Text style={styles.graphFallbackSubtext}>
                  Monthly data: {monthlyData.length} days recorded
                </Text>
                {monthlyData.length > 0 && (
                  <ScrollView style={styles.dataList}>
                    {monthlyData.slice(0, 15).map((item, index) => (
                      <View key={index} style={styles.dataItem}>
                        <Text style={styles.dataDate}>{format(new Date(item.date), 'MMM d')}</Text>
                        <Text style={styles.dataValue}>{Math.round(item.waterIntake)} glasses</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
          
          {/* Helper Text */}
          {LineGraphComponent && (
            <Text style={styles.graphHelperText}>
              Touch and drag to explore daily water intake
            </Text>
          )}
        </View>

        {/* Full Month Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Monthly Summary</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>
                {monthlyData.reduce((sum, d) => sum + d.waterIntake, 0).toFixed(0)}
              </Text>
              <Text style={styles.summaryLabel}>Total Glasses</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>
                {(monthlyData.reduce((sum, d) => sum + d.waterIntake, 0) / monthlyData.length || 0).toFixed(1)}
              </Text>
              <Text style={styles.summaryLabel}>Daily Average</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>
                {monthlyData.filter(d => d.waterIntake >= goal).length}
              </Text>
              <Text style={styles.summaryLabel}>Goal Days</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  todaySection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 24,
    backgroundColor: '#E8E8E8',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  quickAddContainer: {
    marginTop: 8,
  },
  quickAddLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  quickAddButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAddButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  quickAddButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
    opacity: 0.5,
  },
  quickAddTextDisabled: {
    color: '#999',
  },
  limitReachedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  chartSection: {
    backgroundColor: '#fff',
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
    borderColor: 'rgba(33, 150, 243, 0.2)',
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
    color: '#2196F3',
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
    maxHeight: 200,
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
    color: '#2196F3',
    fontWeight: '600',
  },
  summaryContainer: {
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
});
