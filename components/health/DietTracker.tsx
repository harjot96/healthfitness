import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Platform, Image, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';
import { Meal, MealSuggestion } from '../../types';
import { Button } from '../common/Button';
import { getMealSuggestions, saveMealSuggestion, getWeeklyHealthData } from '../../services/storage/firestore';
import { GraphContainer } from '../common/GraphContainer';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { graphColors, pieChartColors, getChartKitConfig, formatLargeNumber } from '../../utils/graphConfig';
import { prepareLastNDaysPoints, preparePieChartData } from '../../utils/graphHelpers';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { analyzeFoodImage } from '../../services/food/foodRecognition';

const screenWidth = Dimensions.get('window').width;

export const DietTracker: React.FC = () => {
  const { todayData, addMeal } = useHealth();
  const { user } = useAuth();
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ date: string; caloriesConsumed: number }[]>([]);
  const [LineGraphComponent, setLineGraphComponent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Image upload states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  const mealTypes = [
    { label: 'Breakfast', value: 'breakfast' as const },
    { label: 'Lunch', value: 'lunch' as const },
    { label: 'Dinner', value: 'dinner' as const },
    { label: 'Snack', value: 'snack' as const },
  ];

  useEffect(() => {
    if (!user) return;
    loadMealSuggestions();
    loadWeeklyData();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const isExpoGo = Constants.appOwnership === 'expo';
    const canUseGraph = Platform.OS !== 'web' && !isExpoGo;
    
    if (!canUseGraph) {
      setLineGraphComponent(null);
      return;
    }

    (async () => {
      try {
        const Graph = await import('react-native-graph');
        if (!cancelled) setLineGraphComponent(() => Graph.LineGraph);
      } catch (error) {
        if (!cancelled) {
          console.warn('react-native-graph is not available');
          setLineGraphComponent(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadMealSuggestions = async () => {
    if (!user) return;
    try {
      const suggestions = await getMealSuggestions(user.uid);
      setMealSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading meal suggestions:', error);
    }
  };

  const loadWeeklyData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getWeeklyHealthData(user.uid);
      setWeeklyData(data.map(d => ({ date: d.date, caloriesConsumed: d.caloriesConsumed })));
    } catch (error) {
      console.error('Error loading weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const suggestionsForType = useMemo(() => {
    const query = mealName.trim().toLowerCase();
    const filtered = mealSuggestions.filter((suggestion) => suggestion.type === mealType);
    const searched = query
      ? filtered.filter((suggestion) => suggestion.name.toLowerCase().includes(query))
      : filtered;
    return searched.slice(0, 6);
  }, [mealSuggestions, mealType, mealName]);

  const handleSelectSuggestion = (suggestion: MealSuggestion) => {
    setMealName(suggestion.name);
    setCalories(String(suggestion.calories || 0));
    setCarbs(String(suggestion.macros?.carbs || 0));
    setProtein(String(suggestion.macros?.protein || 0));
    setFat(String(suggestion.macros?.fat || 0));
  };

  // Request image picker permissions
  const requestImagePermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload food images!'
        );
        return false;
      }
      return true;
    }
    return true;
  };

  // Request camera permissions
  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera permissions to take food photos!'
        );
        return false;
      }
      return true;
    }
    return true;
  };

  // Handle image picker from gallery
  const handlePickImage = async () => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        await analyzeImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Handle camera capture
  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        await analyzeImage(imageUri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Analyze the selected image
  const analyzeImage = async (imageUri: string) => {
    setAnalyzingImage(true);
    try {
      const result = await analyzeFoodImage(imageUri);
      
      // Auto-fill the form with detected values
      setMealName(result.name);
      setCalories(String(result.calories));
      setProtein(String(result.protein));
      setCarbs(String(result.carbs));
      setFat(String(result.fat));

      Alert.alert(
        'Food Detected! 🎉',
        `Detected: ${result.name}\n\nCalories: ${result.calories} kcal\nProtein: ${result.protein}g\nCarbs: ${result.carbs}g\nFat: ${result.fat}g\n\nValues have been filled in automatically. You can edit them if needed.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      Alert.alert(
        'Analysis Failed',
        error.message || 'Could not analyze the food image. Please enter the details manually.'
      );
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleAddMeal = async () => {
    if (!mealName || !calories) {
      Alert.alert('Error', 'Please fill in meal name and calories');
      return;
    }

    const meal: Meal = {
      id: Date.now().toString(),
      type: mealType,
      name: mealName,
      calories: parseInt(calories) || 0,
      macros: {
        carbs: parseInt(carbs) || 0,
        protein: parseInt(protein) || 0,
        fat: parseInt(fat) || 0,
      },
      timestamp: new Date(),
    };

    await addMeal(meal);

    if (user) {
      try {
        const suggestionId = await saveMealSuggestion(user.uid, {
          type: meal.type,
          name: meal.name,
          calories: meal.calories,
          macros: meal.macros,
        });
        setMealSuggestions((prev) => {
          const next = prev.filter((item) => item.id !== suggestionId);
          return [
            {
              id: suggestionId,
              type: meal.type,
              name: meal.name,
              calories: meal.calories,
              macros: meal.macros,
              updatedAt: new Date(),
            },
            ...next,
          ];
        });
      } catch (error) {
        console.error('Error saving meal suggestion:', error);
      }
    }

    setShowAddMeal(false);
    setMealName('');
    setCalories('');
    setCarbs('');
    setProtein('');
    setFat('');
    setSelectedImage(null);
  };

  const getMealsByType = (type: string) => {
    return todayData?.meals.filter(meal => meal.type === type) || [];
  };

  const getTotalCalories = () => {
    return todayData?.caloriesConsumed || 0;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Diet Tracker</Text>
        <Text style={styles.calories}>Total: {getTotalCalories()} kcal</Text>
      </View>

      {!showAddMeal ? (
        <>
          {mealTypes.map(({ label, value }) => {
            const meals = getMealsByType(value);
            return (
              <View key={value} style={styles.section}>
                <Text style={styles.sectionTitle}>{label}</Text>
                {meals.length === 0 ? (
                  <Text style={styles.emptyText}>No meals logged</Text>
                ) : (
                  meals.map(meal => (
                    <View key={meal.id} style={styles.mealItem}>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName}>{meal.name}</Text>
                        <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                      </View>
                      {meal.macros.carbs > 0 && (
                        <Text style={styles.macros}>
                          C: {meal.macros.carbs}g P: {meal.macros.protein}g F: {meal.macros.fat}g
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            );
          })}

          {/* Macros Pie Chart */}
          {todayData && todayData.meals.length > 0 && (() => {
            const totalCarbs = todayData.meals.reduce((sum, m) => sum + (m.macros?.carbs || 0), 0);
            const totalProtein = todayData.meals.reduce((sum, m) => sum + (m.macros?.protein || 0), 0);
            const totalFat = todayData.meals.reduce((sum, m) => sum + (m.macros?.fat || 0), 0);
            
            if (totalCarbs === 0 && totalProtein === 0 && totalFat === 0) return null;

            const macrosData = preparePieChartData(
              {
                Carbs: totalCarbs,
                Protein: totalProtein,
                Fat: totalFat,
              },
              [graphColors.macros.carbs, graphColors.macros.protein, graphColors.macros.fat]
            );

            return (
              <GraphContainer title="Today's Macros Breakdown" style={styles.graphSection}>
                <PieChart
                  data={macrosData}
                  width={screenWidth - 80}
                  height={220}
                  chartConfig={getChartKitConfig(graphColors.macros.carbs)}
                  accessor="value"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </GraphContainer>
            );
          })()}

          {/* Daily Calories Trend */}
          {weeklyData.length > 0 && (
            <GraphContainer
              title="Weekly Calories Trend"
              loading={loading}
              style={styles.graphSection}
            >
              {LineGraphComponent ? (
                <View style={styles.graphWrapper}>
                  {(() => {
                    const graphPoints = prepareLastNDaysPoints(weeklyData, 7, 0);
                    return (
                      <LineGraphComponent
                        style={styles.graph}
                        points={graphPoints}
                        animated={true}
                        color={graphColors.caloriesConsumed}
                        gradientFillColors={['#FF6B35', '#FF8A65']}
                        enablePanGesture={true}
                        enableIndicator={true}
                        lineThickness={3}
                        enableFadeInMask={true}
                        horizontalPadding={16}
                        verticalPadding={16}
                      />
                    );
                  })()}
                </View>
              ) : (
                <View style={styles.graphFallback}>
                  <Text style={styles.graphFallbackText}>Graph unavailable</Text>
                </View>
              )}
            </GraphContainer>
          )}

          <Button
            title="Add Meal"
            onPress={() => setShowAddMeal(true)}
            style={styles.addButton}
          />
        </>
      ) : (
        <View style={styles.addMealForm}>
          <Text style={styles.formTitle}>Add Meal</Text>
          
          {/* Image Upload Section */}
          <View style={styles.imageUploadSection}>
            <Text style={styles.imageUploadLabel}>Upload Food Image (Optional)</Text>
            <Text style={styles.imageUploadHint}>
              Take a photo or upload an image to automatically detect calories and macros
            </Text>
            <View style={styles.imageButtons}>
              <TouchableOpacity
                style={[styles.imageButton, analyzingImage && styles.imageButtonDisabled]}
                onPress={handleTakePhoto}
                disabled={analyzingImage}
              >
                <Ionicons name="camera" size={24} color="#4CAF50" />
                <Text style={styles.imageButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imageButton, analyzingImage && styles.imageButtonDisabled]}
                onPress={handlePickImage}
                disabled={analyzingImage}
              >
                <Ionicons name="images" size={24} color="#4CAF50" />
                <Text style={styles.imageButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            {analyzingImage && (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.analyzingText}>Analyzing food image...</Text>
                <Text style={styles.analyzingSubtext}>This may take a few seconds</Text>
              </View>
            )}

            {selectedImage && !analyzingImage && (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => {
                    setSelectedImage(null);
                    // Optionally clear form fields when removing image
                  }}
                >
                  <Ionicons name="close-circle" size={28} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.mealTypeSelector}>
            {mealTypes.map(({ label, value }) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.mealTypeButton,
                  mealType === value && styles.mealTypeButtonActive,
                ]}
                onPress={() => setMealType(value)}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    mealType === value && styles.mealTypeTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Meal name"
            value={mealName}
            onChangeText={setMealName}
          />
          {suggestionsForType.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggestions</Text>
              <View style={styles.suggestionsList}>
                {suggestionsForType.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(suggestion)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionName}>{suggestion.name}</Text>
                    <Text style={styles.suggestionMeta}>{suggestion.calories} kcal</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Calories"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Carbs (g)"
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Protein (g)"
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Fat (g)"
            value={fat}
            onChangeText={setFat}
            keyboardType="numeric"
          />

          <View style={styles.formButtons}>
            <Button
              title="Cancel"
              onPress={() => setShowAddMeal(false)}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title="Add"
              onPress={handleAddMeal}
              style={styles.submitButton}
            />
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
    marginBottom: 4,
  },
  calories: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
  },
  mealItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mealInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mealName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  macros: {
    fontSize: 12,
    color: '#666',
  },
  addButton: {
    margin: 20,
  },
  addMealForm: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  mealTypeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  mealTypeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  mealTypeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  mealTypeText: {
    fontSize: 14,
    color: '#666',
  },
  mealTypeTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  suggestionsContainer: {
    marginBottom: 12,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f3f7f6',
    borderWidth: 1,
    borderColor: '#e0e7e5',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14332b',
  },
  suggestionMeta: {
    fontSize: 11,
    color: '#5f6f6a',
    marginTop: 2,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
  graphSection: {
    marginTop: 12,
  },
  graphWrapper: {
    height: 220,
    width: '100%',
  },
  graph: {
    flex: 1,
    borderRadius: 16,
  },
  graphFallback: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
  },
  graphFallbackText: {
    fontSize: 14,
    color: '#999',
  },
  imageUploadSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  imageUploadLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  imageUploadHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#F0FDF4',
    gap: 8,
  },
  imageButtonDisabled: {
    opacity: 0.5,
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  analyzingContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    marginTop: 8,
  },
  analyzingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  analyzingSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  selectedImageContainer: {
    position: 'relative',
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#F5F5F5',
  },
  selectedImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
