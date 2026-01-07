import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';
import { Meal, MealSuggestion } from '../../types';
import { Button } from '../common/Button';
import { getMealSuggestions, saveMealSuggestion } from '../../services/storage/firestore';

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

  const mealTypes = [
    { label: 'Breakfast', value: 'breakfast' as const },
    { label: 'Lunch', value: 'lunch' as const },
    { label: 'Dinner', value: 'dinner' as const },
    { label: 'Snack', value: 'snack' as const },
  ];

  useEffect(() => {
    if (!user) return;
    loadMealSuggestions();
  }, [user]);

  const loadMealSuggestions = async () => {
    if (!user) return;
    try {
      const suggestions = await getMealSuggestions(user.uid);
      setMealSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading meal suggestions:', error);
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
          <Button
            title="Add Meal"
            onPress={() => setShowAddMeal(true)}
            style={styles.addButton}
          />
        </>
      ) : (
        <View style={styles.addMealForm}>
          <Text style={styles.formTitle}>Add Meal</Text>
          
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
});
