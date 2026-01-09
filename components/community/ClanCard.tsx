import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Clan } from '../../types';

interface ClanCardProps {
  clan: Clan;
  memberCount?: number;
  userRole?: 'owner' | 'admin' | 'member';
  onPress?: () => void;
}

export const ClanCard: React.FC<ClanCardProps> = ({
  clan,
  memberCount,
  userRole,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        {clan.photoURL ? (
          <Image source={{ uri: clan.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="people" size={24} color="#4CAF50" />
          </View>
        )}
        
        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={styles.name}>{clan.name}</Text>
            {userRole === 'owner' && (
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerText}>Owner</Text>
              </View>
            )}
            {userRole === 'admin' && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
          </View>
          {clan.description && (
            <Text style={styles.description} numberOfLines={2}>
              {clan.description}
            </Text>
          )}
          <View style={styles.meta}>
            {memberCount !== undefined && (
              <View style={styles.metaItem}>
                <Ionicons name="people" size={14} color="#999" />
                <Text style={styles.metaText}>{memberCount} members</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons
                name={clan.privacy === 'inviteOnly' ? 'lock-closed' : 'people'}
                size={14}
                color="#999"
              />
              <Text style={styles.metaText}>
                {clan.privacy === 'inviteOnly' ? 'Invite Only' : 'Friends Only'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
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
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
});

