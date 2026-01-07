import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { calculateBMR, calculateTDEE, calculateCalorieGoal } from '../../utils/calculations';
import { UserProfile } from '../../types';
import { Button } from '../common/Button';

export const CalorieCalculator: React.FC = () => {
  const { userProfile, updateProfile } = useAuth();
  const [age, setAge] = useState(userProfile?.age?.toString() || '');
  const [weight, setWeight] = useState(userProfile?.weight?.toString() || '');
  const [height, setHeight] = useState(userProfile?.height?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(userProfile?.gender || 'male');
  const [activityLevel, setActivityLevel] = useState(userProfile?.activityLevel || 'moderate');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');
  const [bmr, setBmr] = useState(0);
  const [tdee, setTdee] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(0);

  const activityLevels = [
    { label: 'Sedentary', value: 'sedentary' as const },
    { label: 'Light Activity', value: 'light' as const },
    { label: 'Moderate Activity', value: 'moderate' as const },
    { label: 'Active', value: 'active' as const },
    { label: 'Very Active', value: 'very_active' as const },
  ];

  useEffect(() => {
    calculate();
  }, [age, weight, height, gender, activityLevel, goal]);

  const calculate = () => {
    if (!age || !weight || !height) return;

    const profile: UserProfile = {
      age: parseInt(age),
      weight: parseFloat(weight),
      height: parseFloat(height),
      gender,
      activityLevel,
    };

    const calculatedBMR = calculateBMR(profile);
    const calculatedTDEE = calculateTDEE(profile);
    const calculatedGoal = calculateCalorieGoal(calculatedTDEE, goal);

    setBmr(Math.round(calculatedBMR));
    setTdee(Math.round(calculatedTDEE));
    setCalorieGoal(calculatedGoal);
  };

  const handleSaveProfile = async () => {
    if (!age || !weight || !height) {
      return;
    }

    const profile: UserProfile = {
      age: parseInt(age),
      weight: parseFloat(weight),
      height: parseFloat(height),
      gender,
      activityLevel,
    };

    await updateProfile(profile);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calorie Calculator</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          placeholder="Enter your age"
        />

        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          placeholder="Enter your weight"
        />

        <Text style={styles.label}>Height (cm)</Text>
        <TextInput
          style={styles.input}
          value={height}
          onChangeText={setHeight}
          keyboardType="numeric"
          placeholder="Enter your height"
        />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderSelector}>
          {(['male', 'female', 'other'] as const).map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.genderButton, gender === g && styles.genderButtonActive]}
              onPress={() => setGender(g)}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  gender === g && styles.genderButtonTextActive,
                ]}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Activity Level</Text>
        {activityLevels.map(level => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.activityButton,
              activityLevel === level.value && styles.activityButtonActive,
            ]}
            onPress={() => setActivityLevel(level.value)}
          >
            <Text
              style={[
                styles.activityButtonText,
                activityLevel === level.value && styles.activityButtonTextActive,
              ]}
            >
              {level.label}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Goal</Text>
        <View style={styles.goalSelector}>
          {(['lose', 'maintain', 'gain'] as const).map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.goalButton, goal === g && styles.goalButtonActive]}
              onPress={() => setGoal(g)}
            >
              <Text
                style={[
                  styles.goalButtonText,
                  goal === g && styles.goalButtonTextActive,
                ]}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {bmr > 0 && (
          <View style={styles.results}>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>BMR</Text>
              <Text style={styles.resultValue}>{bmr} kcal</Text>
              <Text style={styles.resultDescription}>
                Basal Metabolic Rate (calories burned at rest)
              </Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>TDEE</Text>
              <Text style={styles.resultValue}>{tdee} kcal</Text>
              <Text style={styles.resultDescription}>
                Total Daily Energy Expenditure
              </Text>
            </View>

            <View style={[styles.resultCard, styles.resultCardHighlight]}>
              <Text style={styles.resultLabel}>Daily Goal</Text>
              <Text style={[styles.resultValue, styles.resultValueHighlight]}>
                {calorieGoal} kcal
              </Text>
              <Text style={styles.resultDescription}>
                Recommended daily calorie intake to {goal} weight
              </Text>
            </View>
          </View>
        )}

        <Button
          title="Save Profile"
          onPress={handleSaveProfile}
          style={styles.saveButton}
        />
      </View>
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
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  genderSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  genderButtonText: {
    fontSize: 16,
    color: '#333',
  },
  genderButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  activityButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  activityButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  activityButtonText: {
    fontSize: 16,
    color: '#333',
  },
  activityButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  goalSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  goalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  goalButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  goalButtonText: {
    fontSize: 16,
    color: '#333',
  },
  goalButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  results: {
    marginTop: 24,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultCardHighlight: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  resultValueHighlight: {
    color: '#4CAF50',
  },
  resultDescription: {
    fontSize: 12,
    color: '#999',
  },
  saveButton: {
    marginTop: 24,
  },
});

