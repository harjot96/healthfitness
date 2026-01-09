import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import * as clansService from '../../../services/community/clans';
import * as ringStatsService from '../../../services/community/ringStats';
import * as userSearchService from '../../../services/community/userSearch';
import { ClanMember } from '../../../types';
import { format } from 'date-fns';
import { FitnessRings } from '../../../components/community/FitnessRings';

export default function ClanDetailScreen() {
  const { clanId } = useLocalSearchParams<{ clanId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [clan, setClan] = useState<any>(null);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [membersInfo, setMembersInfo] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);

  useEffect(() => {
    const loadClanData = async () => {
      if (!clanId) return;

      try {
        const [clanData, membersData] = await Promise.all([
          clansService.getClan(clanId),
          clansService.getClanMembers(clanId),
        ]);

        setClan(clanData);
        setMembers(membersData);

        const userMember = membersData.find(m => m.uid === user?.uid);
        setUserRole(userMember?.role || null);

        // Load member info
        const info = await Promise.all(
          membersData.map(async (member) => {
            const userInfo = await userSearchService.getUserById(member.uid);
            return userInfo ? { ...member, ...userInfo } : null;
          })
        );
        setMembersInfo(info.filter(Boolean));

        // Load leaderboard (today's ring stats)
        const today = format(new Date(), 'yyyyMMdd');
        const stats = await ringStatsService.getClanRingStats(clanId, today);
        setLeaderboard(stats.sort((a, b) => b.stats.caloriesBurned - a.stats.caloriesBurned));
      } catch (error) {
        console.error('Error loading clan data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClanData();
  }, [clanId, user]);

  const handleLeaveClan = async () => {
    if (!clanId) return;
    try {
      await clansService.leaveClan(clanId);
      router.back();
    } catch (error) {
      console.error('Error leaving clan:', error);
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!clanId) return;
    try {
      await clansService.removeClanMember(clanId, memberUid);
      // Reload data
      const membersData = await clansService.getClanMembers(clanId);
      setMembers(membersData);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!clan) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Clan not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {clan.photoURL ? (
          <Image source={{ uri: clan.photoURL }} style={styles.clanImage} />
        ) : (
          <View style={styles.clanImagePlaceholder}>
            <Ionicons name="people" size={48} color="#4CAF50" />
          </View>
        )}
        <Text style={styles.clanName}>{clan.name}</Text>
        {clan.description && <Text style={styles.description}>{clan.description}</Text>}
        <View style={styles.meta}>
          <Text style={styles.metaText}>{members.length} members</Text>
          <Text style={styles.metaText}>•</Text>
          <Text style={styles.metaText}>
            {clan.privacy === 'inviteOnly' ? 'Invite Only' : 'Friends Only'}
          </Text>
        </View>
      </View>

      {userRole && (
        <View style={styles.actions}>
          {(userRole === 'owner' || userRole === 'admin') && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/community/clan/${clanId}/invite`)}
            >
              <Ionicons name="person-add" size={20} color="#4CAF50" />
              <Text style={styles.actionText}>Invite Members</Text>
            </TouchableOpacity>
          )}
          {userRole !== 'owner' && (
            <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveClan}>
              <Text style={styles.leaveText}>Leave Clan</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members</Text>
        {membersInfo.map((member) => (
          <View key={member.uid} style={styles.memberCard}>
            <View style={styles.memberInfo}>
              {member.photoURL ? (
                <Image source={{ uri: member.photoURL }} style={styles.memberAvatar} />
              ) : (
                <View style={styles.memberAvatarPlaceholder}>
                  <Text style={styles.memberAvatarText}>
                    {member.displayName?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.memberDetails}>
                <Text style={styles.memberName}>{member.displayName}</Text>
                <View style={styles.memberRole}>
                  {member.role === 'owner' && (
                    <View style={styles.ownerBadge}>
                      <Text style={styles.ownerText}>Owner</Text>
                    </View>
                  )}
                  {member.role === 'admin' && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminText}>Admin</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            {(userRole === 'owner' || (userRole === 'admin' && member.role === 'member')) &&
              member.uid !== user?.uid && (
                <TouchableOpacity onPress={() => handleRemoveMember(member.uid)}>
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              )}
          </View>
        ))}
      </View>

      {leaderboard.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Leaderboard</Text>
          {leaderboard.map((entry, index) => (
            <View key={entry.uid} style={styles.leaderboardItem}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <View style={styles.leaderboardInfo}>
                <Text style={styles.leaderboardName}>
                  {membersInfo.find(m => m.uid === entry.uid)?.displayName || 'Unknown'}
                </Text>
                <FitnessRings stats={entry.stats} size={80} showLabels={false} />
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  clanImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  clanImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clanName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  leaveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  leaveText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF6B6B',
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  memberRole: {
    flexDirection: 'row',
  },
  ownerBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  adminBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rank: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    width: 40,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
});

