import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useHealth } from '../../context/HealthContext';
import { useRouter } from 'expo-router';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { getUserProfile } from '../../services/api/auth';
import { useWatchConnection } from '../../context/WatchConnectionContext';
import { format } from 'date-fns';

export default function ProfileScreen() {
  const { user, userProfile, signOut } = useAuth();
  const { flushTodayData } = useHealth();
  const { isConnected, disconnectWatch, lastConnectedAt } = useWatchConnection();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Refresh profile data from Firebase when screen mounts
  useEffect(() => {
    if (user) {
      getUserProfile().catch(console.error);
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
            await flushTodayData();
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleDisconnectWatch = async () => {
    Alert.alert(
      'Disconnect Watch',
      'Are you sure you want to disconnect your Apple Watch? You will need to reconnect to track workouts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnectWatch();
            Alert.alert('Watch Disconnected', 'Your Apple Watch has been disconnected.');
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

      {Platform.OS === 'ios' && (
        <View style={styles.watchSection}>
          <Text style={styles.sectionTitle}>Apple Watch</Text>
          <View style={styles.watchCard}>
            <View style={styles.watchHeader}>
              <View style={styles.watchIconContainer}>
                <Ionicons 
                  name={isConnected ? "watch" : "watch-outline"} 
                  size={32} 
                  color={isConnected ? "#4CAF50" : "#999"} 
                />
              </View>
              <View style={styles.watchInfo}>
                <Text style={styles.watchStatus}>
                  {isConnected ? 'Connected' : 'Not Connected'}
                </Text>
                {isConnected && lastConnectedAt && (
                  <Text style={styles.watchDate}>
                    Connected on {format(lastConnectedAt, 'MMM d, yyyy')}
                  </Text>
                )}
              </View>
              <View style={styles.watchStatusIndicator}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? '#4CAF50' : '#999' }
                ]} />
              </View>
            </View>
            {isConnected ? (
              <TouchableOpacity
                style={styles.watchAction}
                onPress={handleDisconnectWatch}
              >
                <Ionicons name="close-circle" size={20} color="#FF6B35" />
                <Text style={[styles.watchActionText, { color: '#FF6B35' }]}>
                  Disconnect Watch
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.watchAction}
                onPress={() => router.push('/(tabs)/watch-connection')}
              >
                <Ionicons name="add-circle" size={20} color="#4CAF50" />
                <Text style={[styles.watchActionText, { color: '#4CAF50' }]}>
                  Connect Watch
                </Text>
              </TouchableOpacity>
            )}
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
  watchSection: {
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 20,
  },
  watchCard: {
    marginTop: 12,
  },
  watchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  watchIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  watchInfo: {
    flex: 1,
  },
  watchStatus: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  watchDate: {
    fontSize: 14,
    color: '#666',
  },
  watchStatusIndicator: {
    marginLeft: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  watchAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginTop: 8,
  },
  watchActionText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
