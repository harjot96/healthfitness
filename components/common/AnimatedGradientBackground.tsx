import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface AnimatedGradientBackgroundProps {
  children?: React.ReactNode;
}

export const AnimatedGradientBackground: React.FC<AnimatedGradientBackgroundProps> = ({
  children,
}) => {
  const animatedValue1 = useRef(new Animated.Value(0)).current;
  const animatedValue2 = useRef(new Animated.Value(0)).current;
  const animatedValue3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create continuous animations for smooth gradient movement
    const animate1 = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue1, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue1, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: false,
        }),
      ])
    );

    const animate2 = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue2, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue2, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: false,
        }),
      ])
    );

    const animate3 = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue3, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue3, {
          toValue: 0,
          duration: 12000,
          useNativeDriver: false,
        }),
      ])
    );

    Animated.parallel([animate1, animate2, animate3]).start();
  }, []);

  const translateX1 = animatedValue1.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  const translateY1 = animatedValue1.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 50],
  });

  const translateX2 = animatedValue2.interpolate({
    inputRange: [0, 1],
    outputRange: [100, -100],
  });

  const translateY2 = animatedValue2.interpolate({
    inputRange: [0, 1],
    outputRange: [50, -50],
  });

  const translateX3 = animatedValue3.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 50],
  });

  const translateY3 = animatedValue3.interpolate({
    inputRange: [0, 1],
    outputRange: [100, -100],
  });

  const opacity1 = animatedValue1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  const opacity2 = animatedValue2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 0.7, 0.4],
  });

  const opacity3 = animatedValue3.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.5, 0.2],
  });

  return (
    <View style={styles.container}>
      {/* Animated gradient orbs */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          {
            transform: [{ translateX: translateX1 }, { translateY: translateY1 }],
            opacity: opacity1,
          },
        ]}
      >
        <LinearGradient
          colors={['#4CAF50', '#8BC34A', '#66BB6A']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          {
            transform: [{ translateX: translateX2 }, { translateY: translateY2 }],
            opacity: opacity2,
          },
        ]}
      >
        <LinearGradient
          colors={['#2196F3', '#42A5F5', '#64B5F6']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          {
            transform: [{ translateX: translateX3 }, { translateY: translateY3 }],
            opacity: opacity3,
          },
        ]}
      >
        <LinearGradient
          colors={['#9B59B6', '#BA68C8', '#CE93D8']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Dark overlay for better text visibility */}
      <View style={styles.overlay} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0a0a0a',
  },
  orb: {
    position: 'absolute',
    borderRadius: 200,
  },
  orb1: {
    width: 300,
    height: 300,
    top: -100,
    left: -50,
  },
  orb2: {
    width: 250,
    height: 250,
    bottom: -80,
    right: -40,
  },
  orb3: {
    width: 200,
    height: 200,
    top: '40%',
    right: -30,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
});

