import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';
import { Workout, Exercise, LocationPoint } from '../../types';
import { format } from 'date-fns';
import { Button } from '../common/Button';
import { formatDurationFromMinutes } from '../../utils/formatDuration';
import { predefinedWorkouts, PredefinedWorkout } from '../../utils/predefinedWorkouts';
import { calculateWorkoutCalories, calculateTotalWorkoutCalories } from '../../utils/calculations';

// Mapbox imports
let Mapbox: any = null;
let MapboxGL: any = null;
let MapViewComponent: any = null;
let MapMarkerComponent: any = null;
let MapPolylineComponent: any = null;

try {
  Mapbox = require('@rnmapbox/maps');
  MapboxGL = Mapbox;
  
  // Set Mapbox access token
  // Token is also set in app/_layout.tsx at startup
  const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiZGFyam90IiwiYSI6ImNtYTJqdGF6MzE5YjYya29rdGdlNmZqNmoifQ.beVEa-CdojkfoT9G3XVeng';
  
  if (MAPBOX_TOKEN && MapboxGL.setAccessToken) {
    MapboxGL.setAccessToken(MAPBOX_TOKEN);
    console.log('[Mapbox] Access token configured in WorkoutTracker');
  } else {
    console.warn('[Mapbox] Access token not set or setAccessToken not available');
  }
  
  // Verify Mapbox components are available
  if (!MapboxGL.MapView) {
    console.warn('[Mapbox] MapView component not available');
    MapboxGL = null;
  }
} catch (error) {
  console.warn('[Mapbox] @rnmapbox/maps is not available. Map features will be disabled.', error);
  MapboxGL = null;
}

try {
  const Maps = require('react-native-maps');
  MapViewComponent = Maps.default || Maps;
  MapMarkerComponent = Maps.Marker;
  MapPolylineComponent = Maps.Polyline;
} catch (error) {
  console.warn('[Maps] react-native-maps is not available. Fallback map will be disabled.', error);
}

export const WorkoutTracker: React.FC = () => {
  const { todayData, addWorkout } = useHealth();
  const { user, userProfile } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState<Workout['type']>('strength');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState<Partial<Exercise>>({
    name: '',
    category: 'strength',
  });
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showPredefinedWorkouts, setShowPredefinedWorkouts] = useState(false);
  const [locationTrack, setLocationTrack] = useState<LocationPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const [distance, setDistance] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [isZooming, setIsZooming] = useState(false);

  const workoutTypes = [
    { label: 'Strength', value: 'strength' as const, icon: 'barbell' },
    { label: 'Cardio', value: 'cardio' as const, icon: 'heart' },
    { label: 'HIIT', value: 'hiit' as const, icon: 'flash' },
    { label: 'Yoga', value: 'yoga' as const, icon: 'leaf' },
    { label: 'Running', value: 'running' as const, icon: 'footsteps' },
    { label: 'Cycling', value: 'cycling' as const, icon: 'bicycle' },
  ];

  const exerciseCategories = [
    { label: 'Strength', value: 'strength' as const },
    { label: 'Cardio', value: 'cardio' as const },
    { label: 'Flexibility', value: 'flexibility' as const },
    { label: 'Sports', value: 'sports' as const },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && workoutStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - workoutStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, workoutStartTime]);

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationSubscription]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getFallbackRegion = () => {
    if (currentLocation?.coords) {
      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    if (locationTrack.length > 0) {
      return {
        latitude: locationTrack[0].latitude,
        longitude: locationTrack[0].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  };

  const handleZoomIn = () => {
    if (isZooming) return;
    
    try {
      setIsZooming(true);
      const newZoom = Math.min(zoomLevel + 1, 20);
      setZoomLevel(newZoom);
      
      // For Mapbox
      if (cameraRef.current && cameraRef.current.setZoomLevel) {
        cameraRef.current.setZoomLevel(newZoom, 300);
      } 
      // For react-native-maps
      else if (mapRef.current && mapRef.current.animateToRegion) {
        const region = getFallbackRegion();
        if (region && region.latitudeDelta && region.longitudeDelta) {
          mapRef.current.animateToRegion({
            latitude: region.latitude,
            longitude: region.longitude,
            latitudeDelta: Math.max(region.latitudeDelta / 2, 0.0001),
            longitudeDelta: Math.max(region.longitudeDelta / 2, 0.0001),
          }, 300);
        }
      }
    } catch (error) {
      console.warn('Zoom in error:', error);
    } finally {
      setTimeout(() => setIsZooming(false), 350);
    }
  };

  const handleZoomOut = () => {
    if (isZooming) return;
    
    try {
      setIsZooming(true);
      const newZoom = Math.max(zoomLevel - 1, 3);
      setZoomLevel(newZoom);
      
      // For Mapbox
      if (cameraRef.current && cameraRef.current.setZoomLevel) {
        cameraRef.current.setZoomLevel(newZoom, 300);
      } 
      // For react-native-maps
      else if (mapRef.current && mapRef.current.animateToRegion) {
        const region = getFallbackRegion();
        if (region && region.latitudeDelta && region.longitudeDelta) {
          mapRef.current.animateToRegion({
            latitude: region.latitude,
            longitude: region.longitude,
            latitudeDelta: Math.min(region.latitudeDelta * 2, 180),
            longitudeDelta: Math.min(region.longitudeDelta * 2, 360),
          }, 300);
        }
      }
    } catch (error) {
      console.warn('Zoom out error:', error);
    } finally {
      setTimeout(() => setIsZooming(false), 350);
    }
  };

  const startWorkout = async (predefinedWorkout?: PredefinedWorkout) => {
    let workoutNameValue = workoutName;
    let workoutTypeValue = workoutType;
    let exercisesValue: Exercise[] = [];

    // If predefined workout is selected, use its data
    if (predefinedWorkout) {
      workoutNameValue = predefinedWorkout.name;
      workoutTypeValue = predefinedWorkout.type;
      const userWeight = userProfile?.weight || 70; // Default to 70kg if profile not available
      exercisesValue = predefinedWorkout.exercises.map((ex, index) => {
        // Calculate calories using standard MET formula for each exercise
        const exerciseCalories = ex.duration
          ? calculateWorkoutCalories(
              userWeight,
              ex.duration,
              predefinedWorkout.type,
              ex.category,
              ex.name
            )
          : undefined;
        
        return {
          ...ex,
          id: `${Date.now()}-${index}`,
          caloriesBurned: exerciseCalories,
        };
      });
      setWorkoutName(workoutNameValue);
      setWorkoutType(workoutTypeValue);
      setExercises(exercisesValue);
    } else {
      if (!workoutName.trim()) {
        Alert.alert('Error', 'Please enter a workout name');
        return;
      }
    }

    // Start location tracking for running/walking/cycling
    if (predefinedWorkout?.requiresLocation || workoutTypeValue === 'running' || workoutTypeValue === 'walking' || workoutTypeValue === 'cycling') {
      try {
        await startLocationTracking();
      } catch (error) {
        // Location tracking failed, but allow workout to continue
        console.warn('Location tracking failed, continuing workout without GPS:', error);
        // Don't show another alert here as startLocationTracking already shows one
      }
    }

    setIsActive(true);
    setWorkoutStartTime(new Date());
    setElapsedTime(0);
    setLocationTrack([]);
    setDistance(0);
    setShowMap(true);
    setShowPredefinedWorkouts(false);
  };

  const startLocationTracking = async () => {
    try {
      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to track workouts.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required for tracking workouts. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Try to get current position with timeout and fallback
      // If we can't get initial position, we'll start watching and get it from the first update
      let location: Location.LocationObject | null = null;
      let gotInitialPosition = false;
      
      try {
        // Try with a timeout - if GPS signal is weak, this might fail
        const positionPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Location request timeout')), 10000)
        );
        
        location = await Promise.race([positionPromise, timeoutPromise]);
        gotInitialPosition = true;
      } catch (error: any) {
        console.warn('BestForNavigation failed, trying High accuracy:', error);
        try {
          const positionPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Location request timeout')), 8000)
          );
          location = await Promise.race([positionPromise, timeoutPromise]);
          gotInitialPosition = true;
        } catch (fallbackError: any) {
          console.warn('High accuracy failed, trying Balanced accuracy:', fallbackError);
          try {
            const positionPromise = Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Location request timeout')), 5000)
            );
            location = await Promise.race([positionPromise, timeoutPromise]);
            gotInitialPosition = true;
          } catch (finalError: any) {
            // Can't get initial position - this is OK, we'll start watching and get it from updates
            console.warn('Could not get initial position, will start watching for location updates:', finalError);
            // Don't throw - we'll start watching and get location from first update
          }
        }
      }
      
      // If we got initial position, set it up
      if (location && gotInitialPosition) {
        setCurrentLocation(location);
        const initialPoint: LocationPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date(),
          altitude: location.coords.altitude || undefined,
          speed: location.coords.speed || undefined,
          accuracy: location.coords.accuracy || undefined,
        };
        setLocationTrack([initialPoint]);
      } else {
        // No initial position - we'll get it from the first watchPositionAsync update
        console.log('Starting location tracking without initial position - waiting for GPS signal...');
      }

      // Start watching location with fallback accuracy levels
      let subscription: Location.LocationSubscription;
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 5000, // Update every 5 seconds
            distanceInterval: 5, // Update every 5 meters
          },
          (newLocation) => {
            setCurrentLocation(newLocation);
            const point: LocationPoint = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              timestamp: new Date(),
              altitude: newLocation.coords.altitude || undefined,
              speed: newLocation.coords.speed || undefined,
              accuracy: newLocation.coords.accuracy || undefined,
            };
            setLocationTrack((prev) => {
              // If this is the first location and we didn't have an initial position, start fresh
              const updated = prev.length === 0 ? [point] : [...prev, point];
              // Calculate distance
              let totalDistance = 0;
              for (let i = 1; i < updated.length; i++) {
                totalDistance += calculateDistance(
                  updated[i - 1].latitude,
                  updated[i - 1].longitude,
                  updated[i].latitude,
                  updated[i].longitude
                );
              }
              setDistance(totalDistance);
              return updated;
            });
          }
        );
      } catch (watchError) {
        // Fallback to High accuracy for watchPositionAsync
        console.warn('BestForNavigation watch failed, trying High accuracy:', watchError);
        try {
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 5000,
              distanceInterval: 5,
            },
            (newLocation) => {
              setCurrentLocation(newLocation);
              const point: LocationPoint = {
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                timestamp: new Date(),
                altitude: newLocation.coords.altitude || undefined,
                speed: newLocation.coords.speed || undefined,
                accuracy: newLocation.coords.accuracy || undefined,
              };
              setLocationTrack((prev) => {
                const updated = [...prev, point];
                let totalDistance = 0;
                for (let i = 1; i < updated.length; i++) {
                  totalDistance += calculateDistance(
                    updated[i - 1].latitude,
                    updated[i - 1].longitude,
                    updated[i].latitude,
                    updated[i].longitude
                  );
                }
                setDistance(totalDistance);
                return updated;
              });
            }
          );
        } catch (fallbackWatchError) {
          // Final fallback to Balanced accuracy
          console.warn('High accuracy watch failed, trying Balanced accuracy:', fallbackWatchError);
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 5000,
              distanceInterval: 10,
            },
            (newLocation) => {
              setCurrentLocation(newLocation);
              const point: LocationPoint = {
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                timestamp: new Date(),
                altitude: newLocation.coords.altitude || undefined,
                speed: newLocation.coords.speed || undefined,
                accuracy: newLocation.coords.accuracy || undefined,
              };
              setLocationTrack((prev) => {
                const updated = [...prev, point];
                let totalDistance = 0;
                for (let i = 1; i < updated.length; i++) {
                  totalDistance += calculateDistance(
                    updated[i - 1].latitude,
                    updated[i - 1].longitude,
                    updated[i].latitude,
                    updated[i].longitude
                  );
                }
                setDistance(totalDistance);
                return updated;
              });
            }
          );
        }
      }

      setLocationSubscription(subscription);
      
      // If we didn't get initial position, show a helpful message
      if (!gotInitialPosition) {
        Alert.alert(
          'Waiting for GPS Signal',
          'Location tracking has started, but GPS signal is weak. The app will begin tracking once a signal is acquired. Your workout can continue normally.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error starting location tracking:', error);
      
      // Check for specific error types
      let errorMessage = 'Unable to start location tracking. ';
      const errorStr = error?.message || error?.toString() || '';
      
      if (errorStr.includes('kCLErrorDomain') || errorStr.includes('Cannot obtain current location')) {
        errorMessage += 'GPS signal is currently unavailable. This may be due to being indoors or poor signal strength. Your workout can continue without location tracking.';
      } else if (errorStr.includes('timeout')) {
        errorMessage += 'Location request timed out. The app will try to get your location as you move. Your workout can continue normally.';
      } else {
        errorMessage += `Error: ${errorStr}. Your workout can continue without location tracking.`;
      }
      
      Alert.alert(
        'Location Tracking',
        errorMessage,
        [{ text: 'Continue Without GPS', style: 'default' }]
      );
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  };

  // Calculate distance between two points in meters using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const stopWorkout = async () => {
    // Stop location tracking
    stopLocationTracking();
    
    if (exercises.length === 0) {
      Alert.alert('Warning', 'No exercises added. Are you sure you want to end the workout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End', onPress: () => { void handleEndWorkout(); } },
      ]);
      return;
    }
    void handleEndWorkout();
  };

  const handleEndWorkout = async () => {
    if (!workoutStartTime) return;

    let workout: Workout | null = null;

    try {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - workoutStartTime.getTime()) / 60000); // minutes

      // Calculate average and max speed from location track
      let averageSpeed = 0;
      let maxSpeed = 0;
      if (locationTrack.length > 0) {
        const speeds = locationTrack.filter(p => p.speed !== undefined).map(p => p.speed!);
        if (speeds.length > 0) {
          averageSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
          maxSpeed = Math.max(...speeds);
        }
      }

      // Calculate calories using standard MET formula
      const userWeight = userProfile?.weight || 70; // Default to 70kg if profile not available
      const totalCalories = calculateTotalWorkoutCalories(
        userWeight,
        duration,
        workoutType,
        exercises,
        averageSpeed > 0 ? averageSpeed : undefined
      );

      workout = {
        id: Date.now().toString(),
        name: workoutName,
        type: workoutType,
        exercises,
        startTime: workoutStartTime,
        endTime,
        duration,
        totalCaloriesBurned: totalCalories,
        date: format(new Date(), 'yyyy-MM-dd'),
        locationTrack: locationTrack.length > 0 ? locationTrack : undefined,
        distance: distance > 0 ? distance : undefined,
        averageSpeed: averageSpeed > 0 ? averageSpeed : undefined,
        maxSpeed: maxSpeed > 0 ? maxSpeed : undefined,
      };

      await addWorkout(workout);
      Alert.alert('Success', 'Workout saved successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save workout');
    } finally {
      if (workout) {
        // Reset state even if saving fails so the user can move on.
        setIsActive(false);
        setWorkoutStartTime(null);
        setWorkoutName('');
        setExercises([]);
        setElapsedTime(0);
        setShowAddExercise(false);
        setLocationTrack([]);
        setDistance(0);
        setCurrentLocation(null);
        setShowMap(false);
      }
    }
  };

  const addExercise = () => {
    if (!currentExercise.name?.trim()) {
      Alert.alert('Error', 'Please enter exercise name');
      return;
    }

    // Calculate calories if not provided, using standard MET formula
    let calculatedCalories = currentExercise.caloriesBurned;
    if (!calculatedCalories && currentExercise.duration) {
      const userWeight = userProfile?.weight || 70; // Default to 70kg if profile not available
      calculatedCalories = calculateWorkoutCalories(
        userWeight,
        currentExercise.duration,
        workoutType,
        currentExercise.category || 'strength',
        currentExercise.name
      );
    }

    const exercise: Exercise = {
      id: Date.now().toString(),
      name: currentExercise.name,
      category: currentExercise.category || 'strength',
      duration: currentExercise.duration,
      sets: currentExercise.sets,
      reps: currentExercise.reps,
      weight: currentExercise.weight,
      caloriesBurned: calculatedCalories,
      notes: currentExercise.notes,
    };

    setExercises([...exercises, exercise]);
    setCurrentExercise({ name: '', category: 'strength' });
    setShowAddExercise(false);
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const todayWorkouts = todayData?.workouts || [];
  const totalWorkoutCalories = todayWorkouts.reduce((sum, w) => sum + w.totalCaloriesBurned, 0);
  const routeCoordinates = locationTrack.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Today's Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today's Workouts</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{todayWorkouts.length}</Text>
            <Text style={styles.summaryLabel}>Workouts</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{totalWorkoutCalories}</Text>
            <Text style={styles.summaryLabel}>Calories</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>
              {formatDurationFromMinutes(todayWorkouts.reduce((sum, w) => sum + w.duration, 0))}
            </Text>
            <Text style={styles.summaryLabel}>Total Time</Text>
          </View>
        </View>
      </View>

      {/* Active Workout */}
      {isActive ? (
        <View style={styles.activeWorkoutCard}>
          <View style={styles.workoutHeader}>
            <Text style={styles.workoutName}>{workoutName}</Text>
            <TouchableOpacity onPress={stopWorkout}>
              <Ionicons name="stop-circle" size={32} color="#f44336" />
            </TouchableOpacity>
          </View>

          <View style={styles.timerContainer}>
            <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
            <Text style={styles.timerLabel}>Duration</Text>
          </View>

          <View style={styles.workoutTypeContainer}>
            <Text style={styles.sectionLabel}>Workout Type</Text>
            <View style={styles.typeButtons}>
              {workoutTypes.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    workoutType === type.value && styles.typeButtonActive,
                  ]}
                  onPress={() => setWorkoutType(type.value)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={20}
                    color={workoutType === type.value ? '#fff' : '#666'}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      workoutType === type.value && styles.typeButtonTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Exercises List */}
          <View style={styles.exercisesSection}>
            <View style={styles.exercisesHeader}>
              <Text style={styles.sectionLabel}>Exercises ({exercises.length})</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddExercise(true)}
              >
                <Ionicons name="add-circle" size={24} color="#4CAF50" />
                <Text style={styles.addButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>

            {exercises.map(exercise => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <TouchableOpacity onPress={() => removeExercise(exercise.id)}>
                    <Ionicons name="close-circle" size={24} color="#f44336" />
                  </TouchableOpacity>
                </View>
                <View style={styles.exerciseDetails}>
                  {exercise.sets && exercise.reps && (
                    <Text style={styles.exerciseDetail}>
                      {exercise.sets} sets × {exercise.reps} reps
                    </Text>
                  )}
                  {exercise.weight && (
                    <Text style={styles.exerciseDetail}>{exercise.weight} kg</Text>
                  )}
                  {exercise.duration && (
                    <Text style={styles.exerciseDetail}>{formatDurationFromMinutes(exercise.duration)}</Text>
                  )}
                  {exercise.caloriesBurned && (
                    <Text style={styles.exerciseDetail}>{exercise.caloriesBurned} kcal</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.startWorkoutCard}>
          <Text style={styles.startTitle}>Start New Workout</Text>
          
          {/* Predefined Workouts */}
          <TouchableOpacity
            style={styles.predefinedButton}
            onPress={() => setShowPredefinedWorkouts(true)}
          >
            <Ionicons name="list" size={20} color="#4CAF50" />
            <Text style={styles.predefinedButtonText}>Choose Predefined Workout</Text>
          </TouchableOpacity>
          
          <Text style={styles.dividerText}>OR</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Workout name (e.g., Morning Run, Gym Session)"
            value={workoutName}
            onChangeText={setWorkoutName}
          />
          <Button
            title="Start Custom Workout"
            onPress={() => startWorkout()}
            style={styles.startButton}
          />
          
          {/* Open Map Button */}
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => setShowMap(true)}
          >
            <Ionicons name="map" size={20} color="#fff" />
            <Text style={styles.mapButtonText}>Open Map</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Predefined Workouts Modal */}
      <Modal
        visible={showPredefinedWorkouts}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPredefinedWorkouts(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.predefinedModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Workout</Text>
              <TouchableOpacity onPress={() => setShowPredefinedWorkouts(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.predefinedList}>
              {predefinedWorkouts.map((workout) => (
                <TouchableOpacity
                  key={workout.id}
                  style={styles.predefinedItem}
                  onPress={() => startWorkout(workout)}
                >
                  <View style={styles.predefinedIcon}>
                    <Ionicons name={workout.icon as any} size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.predefinedInfo}>
                    <Text style={styles.predefinedName}>{workout.name}</Text>
                    <Text style={styles.predefinedDescription}>{workout.description}</Text>
                    <View style={styles.predefinedMeta}>
                      <Text style={styles.predefinedMetaText}>
                        <Ionicons name="time" size={14} color="#666" /> {workout.duration} min
                      </Text>
                      <Text style={styles.predefinedMetaText}>
                        <Ionicons name="flame" size={14} color="#f44336" /> ~{workout.estimatedCalories} kcal
                      </Text>
                      {workout.requiresLocation && (
                        <Text style={styles.predefinedMetaText}>
                          <Ionicons name="location" size={14} color="#2196F3" /> GPS Tracked
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Map View Modal - Can be shown even when workout is not active */}
      {showMap && (
        <Modal
          visible={showMap}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowMap(false)}
        >
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>
                {isActive ? workoutName : 'Map View'}
              </Text>
              <TouchableOpacity onPress={() => setShowMap(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {/* Start Workout Button - Show when workout is not active */}
            {!isActive && (
              <View style={styles.mapStartWorkoutContainer}>
                <TouchableOpacity
                  style={styles.mapStartButton}
                  onPress={() => {
                    if (!workoutName.trim()) {
                      Alert.alert('Error', 'Please enter a workout name first');
                      setShowMap(false);
                      return;
                    }
                    startWorkout();
                  }}
                >
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.mapStartButtonText}>Start Workout</Text>
                </TouchableOpacity>
              </View>
            )}
            {MapboxGL && MapboxGL.MapView ? (
              <MapboxGL.MapView
                ref={mapRef}
                style={styles.map}
                styleURL={MapboxGL.StyleURL?.Street || MapboxGL.StyleURL?.Default}
                logoEnabled={false}
                attributionEnabled={false}
                onDidFinishLoadingMap={() => {
                  console.log('[Mapbox] Map loaded successfully');
                }}
                onDidFailLoadingMap={(error: any) => {
                  console.error('[Mapbox] Map failed to load:', error);
                }}
              >
                <MapboxGL.Camera
                  ref={cameraRef}
                  zoomLevel={zoomLevel}
                  centerCoordinate={
                    currentLocation
                      ? [currentLocation.coords.longitude, currentLocation.coords.latitude]
                      : locationTrack.length > 0
                      ? [locationTrack[0].longitude, locationTrack[0].latitude]
                      : undefined
                  }
                  animationMode="flyTo"
                  animationDuration={1000}
                />
                
                {/* User location */}
                {currentLocation && (
                  <MapboxGL.UserLocation
                    visible={true}
                    animated={true}
                  />
                )}

                {/* Route line */}
                {locationTrack.length > 1 && (
                  <MapboxGL.ShapeSource
                    id="route"
                    shape={{
                      type: 'Feature',
                      geometry: {
                        type: 'LineString',
                        coordinates: locationTrack.map((p) => [p.longitude, p.latitude]),
                      },
                    }}
                  >
                    <MapboxGL.LineLayer
                      id="routeLine"
                      style={{
                        lineColor: '#4CAF50',
                        lineWidth: 4,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                  </MapboxGL.ShapeSource>
                )}

                {/* Start marker */}
                {locationTrack.length > 0 && (
                  <MapboxGL.PointAnnotation
                    id="start"
                    coordinate={[locationTrack[0].longitude, locationTrack[0].latitude]}
                  >
                    <View style={styles.markerContainer}>
                      <View style={[styles.marker, { backgroundColor: '#4CAF50' }]}>
                        <Ionicons name="flag" size={16} color="#fff" />
                      </View>
                    </View>
                  </MapboxGL.PointAnnotation>
                )}

                {/* Current location marker */}
                {currentLocation && (
                  <MapboxGL.PointAnnotation
                    id="current"
                    coordinate={[currentLocation.coords.longitude, currentLocation.coords.latitude]}
                  >
                    <View style={styles.markerContainer}>
                      <View style={[styles.marker, { backgroundColor: '#2196F3' }]}>
                        <Ionicons name="location" size={16} color="#fff" />
                      </View>
                    </View>
                  </MapboxGL.PointAnnotation>
                )}
              </MapboxGL.MapView>
            ) : MapViewComponent ? (
              <MapViewComponent
                ref={mapRef}
                style={styles.map}
                initialRegion={getFallbackRegion()}
                showsUserLocation={true}
                followsUserLocation={true}
                zoomEnabled={true}
                zoomControlEnabled={false}
                showsCompass={true}
                showsMyLocationButton={true}
              >
                {MapPolylineComponent && routeCoordinates.length > 1 && (
                  <MapPolylineComponent
                    coordinates={routeCoordinates}
                    strokeColor="#4CAF50"
                    strokeWidth={4}
                  />
                )}
                {MapMarkerComponent && routeCoordinates.length > 0 && (
                  <MapMarkerComponent coordinate={routeCoordinates[0]} pinColor="#4CAF50" />
                )}
                {MapMarkerComponent && routeCoordinates.length > 1 && (
                  <MapMarkerComponent
                    coordinate={routeCoordinates[routeCoordinates.length - 1]}
                    pinColor="#f44336"
                  />
                )}
              </MapViewComponent>
            ) : (
              <View style={[styles.map, styles.mapFallback]}>
                <Ionicons name="map-outline" size={64} color="#999" />
                <Text style={styles.mapFallbackText}>Map view is not available</Text>
                <Text style={styles.mapFallbackSubtext}>
                  Install react-native-maps or rebuild with Mapbox to enable maps.
                </Text>
              </View>
            )}
            
            {/* Zoom Controls */}
            <View style={styles.zoomControls}>
              <TouchableOpacity
                style={[styles.zoomButton, isZooming && styles.zoomButtonDisabled]}
                onPress={handleZoomIn}
                disabled={isZooming || zoomLevel >= 20}
              >
                <Ionicons name="add" size={24} color={zoomLevel >= 20 ? "#ccc" : "#333"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.zoomButton, styles.zoomButtonLast, isZooming && styles.zoomButtonDisabled]}
                onPress={handleZoomOut}
                disabled={isZooming || zoomLevel <= 3}
              >
                <Ionicons name="remove" size={24} color={zoomLevel <= 3 ? "#ccc" : "#333"} />
              </TouchableOpacity>
            </View>
            
            {/* Map Stats - Only show when workout is active */}
            {isActive && (
              <View style={styles.mapStats}>
                <View style={styles.mapStat}>
                  <Ionicons name="footsteps" size={20} color="#4CAF50" />
                  <Text style={styles.mapStatValue}>
                    {distance > 0 ? `${(distance / 1000).toFixed(2)} km` : '0.00 km'}
                  </Text>
                  <Text style={styles.mapStatLabel}>Distance</Text>
                </View>
                <View style={styles.mapStat}>
                  <Ionicons name="time" size={20} color="#2196F3" />
                  <Text style={styles.mapStatValue}>{formatTime(elapsedTime)}</Text>
                  <Text style={styles.mapStatLabel}>Time</Text>
                </View>
                <View style={styles.mapStat}>
                  <Ionicons name="speedometer" size={20} color="#FF6B35" />
                  <Text style={styles.mapStatValue}>
                    {currentLocation?.coords.speed
                      ? `${(currentLocation.coords.speed * 3.6).toFixed(1)} km/h`
                      : '0 km/h'}
                  </Text>
                  <Text style={styles.mapStatLabel}>Speed</Text>
                </View>
              </View>
            )}
            
            {/* Zoom Controls for Completed Workout Map */}
            <View style={styles.zoomControls}>
              <TouchableOpacity
                style={[styles.zoomButton, isZooming && styles.zoomButtonDisabled]}
                onPress={handleZoomIn}
                disabled={isZooming || zoomLevel >= 20}
              >
                <Ionicons name="add" size={24} color={zoomLevel >= 20 ? "#ccc" : "#333"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.zoomButton, styles.zoomButtonLast, isZooming && styles.zoomButtonDisabled]}
                onPress={handleZoomOut}
                disabled={isZooming || zoomLevel <= 3}
              >
                <Ionicons name="remove" size={24} color={zoomLevel <= 3 ? "#ccc" : "#333"} />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <TouchableOpacity onPress={() => setShowAddExercise(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Exercise name"
              value={currentExercise.name}
              onChangeText={(text) => setCurrentExercise({ ...currentExercise, name: text })}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryButtons}>
              {exerciseCategories.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryButton,
                    currentExercise.category === cat.value && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCurrentExercise({ ...currentExercise, category: cat.value })}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      currentExercise.category === cat.value && styles.categoryButtonTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Sets</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={currentExercise.sets?.toString()}
                  onChangeText={(text) =>
                    setCurrentExercise({ ...currentExercise, sets: parseInt(text) || undefined })
                  }
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Reps</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={currentExercise.reps?.toString()}
                  onChangeText={(text) =>
                    setCurrentExercise({ ...currentExercise, reps: parseInt(text) || undefined })
                  }
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={currentExercise.weight?.toString()}
                  onChangeText={(text) =>
                    setCurrentExercise({ ...currentExercise, weight: parseFloat(text) || undefined })
                  }
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Duration (min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={currentExercise.duration?.toString()}
                  onChangeText={(text) =>
                    setCurrentExercise({ ...currentExercise, duration: parseInt(text) || undefined })
                  }
                />
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Calories burned (optional)"
              keyboardType="numeric"
              value={currentExercise.caloriesBurned?.toString()}
              onChangeText={(text) =>
                setCurrentExercise({ ...currentExercise, caloriesBurned: parseInt(text) || undefined })
              }
            />

            <Button title="Add Exercise" onPress={addExercise} style={styles.addExerciseButton} />
          </View>
        </View>
      )}

      {/* Today's Workouts History */}
      {todayWorkouts.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Today's Workouts</Text>
          {todayWorkouts.map(workout => (
            <View key={workout.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyName}>{workout.name}</Text>
                <Text style={styles.historyType}>{workout.type}</Text>
              </View>
              <View style={styles.historyDetails}>
                <Text style={styles.historyDetail}>
                  <Ionicons name="time" size={16} color="#666" /> {formatDurationFromMinutes(workout.duration)}
                </Text>
                <Text style={styles.historyDetail}>
                  <Ionicons name="flame" size={16} color="#f44336" /> {workout.totalCaloriesBurned} kcal
                </Text>
                {workout.distance && (
                  <Text style={styles.historyDetail}>
                    <Ionicons name="footsteps" size={16} color="#4CAF50" /> {(workout.distance / 1000).toFixed(2)} km
                  </Text>
                )}
                {!workout.distance && (
                  <Text style={styles.historyDetail}>
                    <Ionicons name="barbell" size={16} color="#4CAF50" /> {workout.exercises.length} exercises
                  </Text>
                )}
              </View>
              {workout.locationTrack && workout.locationTrack.length > 1 && (
                <TouchableOpacity
                  style={styles.viewRouteButton}
                  onPress={() => {
                    setShowMap(true);
                    setLocationTrack(workout.locationTrack!);
                  }}
                >
                  <Ionicons name="map" size={20} color="#2196F3" />
                  <Text style={styles.viewRouteText}>View Route</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.historyTime}>
                {format(workout.startTime, 'HH:mm')} - {workout.endTime ? format(workout.endTime, 'HH:mm') : 'Ongoing'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Map View Modal for Completed Workouts */}
      {!isActive && showMap && locationTrack.length > 0 && (
        <Modal
          visible={showMap}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            setShowMap(false);
            setLocationTrack([]);
          }}
        >
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>Workout Route</Text>
              <TouchableOpacity onPress={() => {
                setShowMap(false);
                setLocationTrack([]);
              }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {MapboxGL && MapboxGL.MapView ? (
              <MapboxGL.MapView
                ref={mapRef}
                style={styles.map}
                styleURL={MapboxGL.StyleURL?.Street || MapboxGL.StyleURL?.Default}
                logoEnabled={false}
                attributionEnabled={false}
                onDidFinishLoadingMap={() => {
                  console.log('[Mapbox] Map loaded successfully for completed workout');
                  if (mapRef.current && locationTrack.length > 0) {
                    try {
                      const coordinates = locationTrack.map((p) => [p.longitude, p.latitude] as [number, number]);
                      // Fit camera to show all route points
                      if (mapRef.current.fitBounds) {
                        mapRef.current.fitBounds(
                          coordinates[0],
                          coordinates[coordinates.length - 1],
                          [50, 50, 50, 50], // padding: top, right, bottom, left
                          1000 // animation duration
                        );
                      }
                    } catch (error) {
                      console.warn('[Mapbox] Error fitting bounds:', error);
                    }
                  }
                }}
                onDidFailLoadingMap={(error: any) => {
                  console.error('[Mapbox] Map failed to load:', error);
                }}
              >
                <MapboxGL.Camera
                  ref={cameraRef}
                  zoomLevel={zoomLevel}
                  centerCoordinate={[locationTrack[0].longitude, locationTrack[0].latitude]}
                  animationMode="flyTo"
                  animationDuration={1000}
                />
                
                {/* Route line */}
                {locationTrack.length > 1 && (
                  <MapboxGL.ShapeSource
                    id="route"
                    shape={{
                      type: 'Feature',
                      geometry: {
                        type: 'LineString',
                        coordinates: locationTrack.map((p) => [p.longitude, p.latitude]),
                      },
                    }}
                  >
                    <MapboxGL.LineLayer
                      id="routeLine"
                      style={{
                        lineColor: '#4CAF50',
                        lineWidth: 4,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                  </MapboxGL.ShapeSource>
                )}

                {/* Start marker */}
                {locationTrack.length > 0 && (
                  <>
                    <MapboxGL.PointAnnotation
                      id="start"
                      coordinate={[locationTrack[0].longitude, locationTrack[0].latitude]}
                    >
                      <View style={styles.markerContainer}>
                        <View style={[styles.marker, { backgroundColor: '#4CAF50' }]}>
                          <Ionicons name="flag" size={16} color="#fff" />
                        </View>
                      </View>
                    </MapboxGL.PointAnnotation>
                    {/* End marker */}
                    {locationTrack.length > 1 && (
                      <MapboxGL.PointAnnotation
                        id="end"
                        coordinate={[locationTrack[locationTrack.length - 1].longitude, locationTrack[locationTrack.length - 1].latitude]}
                      >
                        <View style={styles.markerContainer}>
                          <View style={[styles.marker, { backgroundColor: '#f44336' }]}>
                            <Ionicons name="flag" size={16} color="#fff" />
                          </View>
                        </View>
                      </MapboxGL.PointAnnotation>
                    )}
                  </>
                )}
              </MapboxGL.MapView>
            ) : MapViewComponent ? (
              <MapViewComponent
                ref={mapRef}
                style={styles.map}
                initialRegion={getFallbackRegion()}
                showsCompass={true}
              >
                {MapPolylineComponent && routeCoordinates.length > 1 && (
                  <MapPolylineComponent
                    coordinates={routeCoordinates}
                    strokeColor="#4CAF50"
                    strokeWidth={4}
                  />
                )}
                {MapMarkerComponent && routeCoordinates.length > 0 && (
                  <MapMarkerComponent coordinate={routeCoordinates[0]} pinColor="#4CAF50" />
                )}
                {MapMarkerComponent && routeCoordinates.length > 1 && (
                  <MapMarkerComponent
                    coordinate={routeCoordinates[routeCoordinates.length - 1]}
                    pinColor="#f44336"
                  />
                )}
              </MapViewComponent>
            ) : (
              <View style={[styles.map, styles.mapFallback]}>
                <Ionicons name="map-outline" size={64} color="#999" />
                <Text style={styles.mapFallbackText}>Map view is not available</Text>
                <Text style={styles.mapFallbackSubtext}>
                  Install react-native-maps or rebuild with Mapbox to enable maps.
                </Text>
              </View>
            )}
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
  activeWorkoutCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
  },
  workoutTypeContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  exercisesSection: {
    marginTop: 20,
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  exerciseCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  exerciseDetail: {
    fontSize: 14,
    color: '#666',
  },
  startWorkoutCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
  },
  startTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  startButton: {
    marginTop: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputHalf: {
    flex: 1,
  },
  addExerciseButton: {
    marginTop: 8,
  },
  historySection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  historyType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  historyDetail: {
    fontSize: 14,
    color: '#666',
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
  },
  predefinedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  predefinedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  dividerText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    marginVertical: 8,
    fontWeight: '600',
  },
  predefinedModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  predefinedList: {
    marginTop: 10,
  },
  predefinedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  predefinedIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  predefinedInfo: {
    flex: 1,
  },
  predefinedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  predefinedDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  predefinedMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  predefinedMetaText: {
    fontSize: 12,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  map: {
    flex: 1,
  },
  mapFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  mapFallbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  mapFallbackSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  mapFallbackInfo: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 16,
    fontWeight: '600',
  },
  mapStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  mapStat: {
    alignItems: 'center',
  },
  mapStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  mapStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapStartWorkoutContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mapStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  mapStartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  zoomControls: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -50 }],
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  zoomButtonLast: {
    borderBottomWidth: 0,
  },
  zoomButtonDisabled: {
    opacity: 0.5,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  viewRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  viewRouteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
});
