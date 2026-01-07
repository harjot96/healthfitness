import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const WATER_NOTIFICATION_KEY = 'water_notification_settings';
const WATER_NOTIFICATION_IDS_KEY = 'water_notification_ids';
const DEFAULT_INTERVAL = 60; // minutes

export interface WaterNotificationSettings {
  enabled: boolean;
  interval: number; // in minutes
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

class WaterTrackingService {
  private notificationIds: string[] = [];

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('water-reminders', {
          name: 'Water Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
        });
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async getNotificationSettings(): Promise<WaterNotificationSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(WATER_NOTIFICATION_KEY);
      if (settingsJson) {
        return JSON.parse(settingsJson);
      }
      return {
        enabled: false,
        interval: DEFAULT_INTERVAL,
        startTime: '08:00',
        endTime: '22:00',
      };
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return {
        enabled: false,
        interval: DEFAULT_INTERVAL,
        startTime: '08:00',
        endTime: '22:00',
      };
    }
  }

  async saveNotificationSettings(settings: WaterNotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(WATER_NOTIFICATION_KEY, JSON.stringify(settings));
      if (settings.enabled) {
        await this.scheduleNotifications(settings);
      } else {
        await this.cancelAllNotifications();
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  async scheduleNotifications(settings: WaterNotificationSettings): Promise<void> {
    await this.cancelAllNotifications();
    
    if (!settings.enabled) return;

    const [startHour, startMinute] = settings.startTime.split(':').map(Number);
    const [endHour, endMinute] = settings.endTime.split(':').map(Number);
    
    const notificationIds: string[] = [];
    const intervalHours = settings.interval / 60;
    
    // Schedule recurring notifications for each interval
    for (let hour = startHour; hour < endHour; hour += intervalHours) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Time to Hydrate!',
          body: 'Remember to drink a glass of water to stay hydrated.',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          hour: Math.floor(hour),
          minute: hour === startHour ? startMinute : 0,
          repeats: true,
          channelId: Platform.OS === 'android' ? 'water-reminders' : undefined,
        },
      });
      
      notificationIds.push(id);
    }
    
    this.notificationIds = notificationIds;
    await AsyncStorage.setItem(WATER_NOTIFICATION_IDS_KEY, JSON.stringify(notificationIds));
  }

  private async loadStoredIds(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(WATER_NOTIFICATION_IDS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading water notification IDs:', error);
      return [];
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      const storedIds = await this.loadStoredIds();
      const ids = Array.from(new Set([...storedIds, ...this.notificationIds]));

      await Promise.all(
        ids.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch((error) => {
            console.error('Error canceling water notification:', error);
          })
        )
      );

      this.notificationIds = [];
      await AsyncStorage.removeItem(WATER_NOTIFICATION_IDS_KEY);
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }
}

export const waterTrackingService = new WaterTrackingService();
