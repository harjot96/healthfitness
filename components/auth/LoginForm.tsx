import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, TouchableOpacity, Platform } from 'react-native';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface LoginFormProps {
  onNavigateToSignUp: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onNavigateToSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Google Sign-In Failed', error.message || 'An error occurred');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (error: any) {
      Alert.alert('Apple Sign-In Failed', error.message || 'An error occurred');
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background orbs removed - video background handles this now */}

      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="fitness" size={22} color="#0f6b53" />
        </View>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Your health stats are waiting.</Text>
      </View>

      <View style={styles.card}>
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

        <Button
          title="Sign In"
          onPress={handleLogin}
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
          onPress={handleGoogleLogin}
          disabled={googleLoading || loading}
        >
          <Ionicons name="logo-google" size={20} color="#fff" />
          <Text style={styles.socialButtonText}>
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={handleAppleLogin}
            disabled={appleLoading || loading}
          >
            <Ionicons name="logo-apple" size={20} color="#fff" />
            <Text style={styles.socialButtonText}>
              {appleLoading ? 'Signing in...' : 'Continue with Apple'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don&apos;t have an account? </Text>
        <Text style={styles.link} onPress={onNavigateToSignUp}>
          Sign Up
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    backgroundColor: 'transparent',
  },
  header: {
    marginBottom: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#e0f3ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0f3d2e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  link: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e7e5',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#8a9793',
    fontWeight: '600',
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
    backgroundColor: '#2f6fe5',
  },
  appleButton: {
    backgroundColor: '#101314',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
