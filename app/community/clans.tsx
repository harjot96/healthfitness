import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCommunity } from '../../context/CommunityContext';
import { ClanCard } from '../../components/community/ClanCard';
import { useState, useEffect } from 'react';
import * as clansService from '../../services/community/clans';

export default function ClansScreen() {
  const router = useRouter();
  const { clans, loadingClans } = useCommunity();
  const [clansWithMembers, setClansWithMembers] = useState<any[]>([]);

  useEffect(() => {
    const loadClanMembers = async () => {
      const clansData = await Promise.all(
        clans.map(async (clan) => {
          const members = await clansService.getClanMembers(clan.id);
          const userMember = members.find(m => m.uid === clan.ownerUid);
          return {
            ...clan,
            memberCount: members.length,
            userRole: userMember?.role || 'member',
          };
        })
      );
      setClansWithMembers(clansData);
    };

    if (clans.length > 0) {
      loadClanMembers();
    } else {
      setClansWithMembers([]);
    }
  }, [clans]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clans</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/community/clan/create')}
        >
          <Ionicons name="add" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {clansWithMembers.map((clan) => (
          <ClanCard
            key={clan.id}
            clan={clan}
            memberCount={clan.memberCount}
            userRole={clan.userRole}
            onPress={() => router.push(`/community/clan/${clan.id}`)}
          />
        ))}

        {clans.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No clans yet</Text>
            <TouchableOpacity
              style={styles.createButtonLarge}
              onPress={() => router.push('/community/clan/create')}
            >
              <Text style={styles.createButtonText}>Create a Clan</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
  },
  createButtonLarge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

