import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { getUserProfile } from '../../services/firebase/auth';

export default function ProfileScreen() {
  const { user, userProfile, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Refresh profile data from Firebase when screen mounts
  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).catch(console.error);
    }
  }, [user]);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color="#4CAF50" />
        </View>
        <Text style={styles.name}>{user?.email?.split('@')[0] || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {userProfile && (
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{userProfile.age} years</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Weight</Text>
            <Text style={styles.infoValue}>{userProfile.weight} kg</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Height</Text>
            <Text style={styles.infoValue}>{userProfile.height} cm</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoValue}>
              {userProfile.gender.charAt(0).toUpperCase() + userProfile.gender.slice(1)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Activity Level</Text>
            <Text style={styles.infoValue}>
              {userProfile.activityLevel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => router.push('/(tabs)/calories')}
        >
          <Ionicons name="calculator" size={24} color="#4CAF50" />
          <Text style={styles.actionText}>Update Profile</Text>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      <Button
        title="Sign Out"
        onPress={handleSignOut}
        variant="outline"
        style={styles.signOutButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  profileSection: {
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionsSection: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  signOutButton: {
    margin: 20,
    marginTop: 40,
  },
});

