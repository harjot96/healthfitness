import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../common/Button';

interface UserCardProps {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  friendStatus?: 'none' | 'friend' | 'sent' | 'received' | 'self';
  onPress?: () => void;
  onAddFriend?: () => void;
  onAcceptRequest?: () => void;
  onRejectRequest?: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  displayName,
  photoURL,
  email,
  friendStatus = 'none',
  onPress,
  onAddFriend,
  onAcceptRequest,
  onRejectRequest,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color="#999" />
          </View>
        )}
        
        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          {email && <Text style={styles.email}>{email}</Text>}
        </View>
      </View>
      
      {friendStatus === 'none' && onAddFriend && (
        <Button title="Add Friend" onPress={onAddFriend} variant="primary" style={styles.button} />
      )}
      
      {friendStatus === 'sent' && (
        <View style={styles.statusContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={styles.statusText}>Request Sent</Text>
        </View>
      )}
      
      {friendStatus === 'received' && (
        <View style={styles.buttonRow}>
          <Button
            title="Accept"
            onPress={onAcceptRequest}
            variant="primary"
            style={[styles.button, styles.acceptButton]}
          />
          <Button
            title="Reject"
            onPress={onRejectRequest}
            variant="outline"
            style={[styles.button, styles.rejectButton]}
          />
        </View>
      )}
      
      {friendStatus === 'friend' && (
        <View style={styles.statusContainer}>
          <Ionicons name="people" size={20} color="#4CAF50" />
          <Text style={styles.statusText}>Friends</Text>
        </View>
      )}
      
      {friendStatus === 'self' && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>You</Text>
        </View>
      )}
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
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#999',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    marginRight: 4,
  },
  rejectButton: {
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
});

