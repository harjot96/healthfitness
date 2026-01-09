import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../common/Button';
import { FriendRequest } from '../../types';

interface FriendRequestCardProps {
  request: FriendRequest;
  userInfo?: {
    displayName: string;
    photoURL?: string;
    email?: string;
  };
  isReceived?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onPress?: () => void;
}

export const FriendRequestCard: React.FC<FriendRequestCardProps> = ({
  request,
  userInfo,
  isReceived = true,
  onAccept,
  onReject,
  onCancel,
  onPress,
}) => {
  const displayName = userInfo?.displayName || 'Unknown User';
  const photoURL = userInfo?.photoURL;
  const email = userInfo?.email;

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
          <Text style={styles.time}>
            {isReceived ? 'sent you' : 'you sent'} a friend request
          </Text>
        </View>
      </View>
      
      {isReceived ? (
        <View style={styles.buttonRow}>
          <Button
            title="Accept"
            onPress={onAccept}
            variant="primary"
            style={[styles.button, styles.acceptButton]}
          />
          <Button
            title="Reject"
            onPress={onReject}
            variant="outline"
            style={[styles.button, styles.rejectButton]}
          />
        </View>
      ) : (
        <Button
          title="Cancel"
          onPress={onCancel}
          variant="outline"
          style={styles.button}
        />
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
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
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
});

