import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/common/Button';
import * as clansService from '../../../services/community/clans';

export default function CreateClanScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'inviteOnly' | 'friendsOnly'>('inviteOnly');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Clan name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await clansService.createClan(name.trim(), description.trim(), privacy);
      router.replace(`/community/clan/${result.clanId}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create clan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Clan</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Clan Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter clan name"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter clan description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={200}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Privacy</Text>
          <View style={styles.privacyOptions}>
            <TouchableOpacity
              style={[styles.privacyOption, privacy === 'inviteOnly' && styles.privacyOptionActive]}
              onPress={() => setPrivacy('inviteOnly')}
            >
              <Text
                style={[
                  styles.privacyOptionText,
                  privacy === 'inviteOnly' && styles.privacyOptionTextActive,
                ]}
              >
                Invite Only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.privacyOption, privacy === 'friendsOnly' && styles.privacyOptionActive]}
              onPress={() => setPrivacy('friendsOnly')}
            >
              <Text
                style={[
                  styles.privacyOptionText,
                  privacy === 'friendsOnly' && styles.privacyOptionTextActive,
                ]}
              >
                Friends Only
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Button
          title="Create Clan"
          onPress={handleCreate}
          loading={loading}
          disabled={!name.trim()}
          style={styles.createButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
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
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  privacyOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyOption: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  privacyOptionActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0F9F0',
  },
  privacyOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  privacyOptionTextActive: {
    color: '#4CAF50',
  },
  createButton: {
    marginTop: 8,
  },
});

