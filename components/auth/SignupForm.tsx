import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, TouchableOpacity, Platform } from 'react-native';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface SignupFormProps {
  onNavigateToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onNavigateToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    displayName?: string;
  }>({});
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!displayName) {
      newErrors.displayName = 'Name is required';
    }
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      await signUp(email, password, displayName);
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Google Sign-Up Failed', error.message || 'An error occurred');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (error: any) {
      Alert.alert('Apple Sign-Up Failed', error.message || 'An error occurred');
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Sign up to get started</Text>
      
      <Input
        label="Full Name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Enter your name"
        error={errors.displayName}
      />
      
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        keyboardType="email-address"
        error={errors.email}
      />
      
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        secureTextEntry
        error={errors.password}
      />
      
      <Input
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm your password"
        secureTextEntry
        error={errors.confirmPassword}
      />
      
      <Button
        title="Sign Up"
        onPress={handleSignUp}
        loading={loading}
        style={styles.button}
      />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.socialButton, styles.googleButton]}
        onPress={handleGoogleSignUp}
        disabled={googleLoading || loading}
      >
        <Ionicons name="logo-google" size={20} color="#fff" />
        <Text style={styles.socialButtonText}>
          {googleLoading ? 'Signing up...' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.socialButton, styles.appleButton]}
          onPress={handleAppleSignUp}
          disabled={appleLoading || loading}
        >
          <Ionicons name="logo-apple" size={20} color="#fff" />
          <Text style={styles.socialButtonText}>
            {appleLoading ? 'Signing up...' : 'Continue with Apple'}
          </Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Text style={styles.link} onPress={onNavigateToLogin}>
          Sign In
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  button: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  link: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#999',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

