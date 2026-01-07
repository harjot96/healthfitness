import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FASTING_NOTIFICATION_IDS_KEY = 'fasting_notification_ids';
const DEFAULT_MAX_HOURS = 24;

class FastingNotificationService {
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
        await Notifications.setNotificationChannelAsync('fasting-milestones', {
          name: 'Fasting Milestones',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#9B59B6',
        });
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting fasting notification permissions:', error);
      return false;
    }
  }

  async scheduleHourlyNotifications(startTime: Date, targetDuration?: number): Promise<void> {
    await this.cancelAllNotifications();

    const totalHours = targetDuration && targetDuration > 0
      ? Math.floor(targetDuration)
      : DEFAULT_MAX_HOURS;

    if (totalHours <= 0) return;

    const now = new Date();
    const elapsedHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const nextHour = Math.max(1, Math.floor(elapsedHours) + 1);

    if (nextHour > totalHours) return;

    const notificationIds: string[] = [];

    for (let hour = nextHour; hour <= totalHours; hour += 1) {
      const secondsUntil = Math.max(1, Math.round((hour - elapsedHours) * 3600));

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Hour ${hour} complete`,
          body: 'Nice work! Keep the fast going strong.',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: 'timeInterval',
          seconds: secondsUntil,
          repeats: false,
          channelId: Platform.OS === 'android' ? 'fasting-milestones' : undefined,
        },
      });

      notificationIds.push(id);
    }

    this.notificationIds = notificationIds;
    await AsyncStorage.setItem(FASTING_NOTIFICATION_IDS_KEY, JSON.stringify(notificationIds));
  }

  private async loadStoredIds(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(FASTING_NOTIFICATION_IDS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading fasting notification IDs:', error);
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
            console.error('Error canceling fasting notification:', error);
          })
        )
      );

      this.notificationIds = [];
      await AsyncStorage.removeItem(FASTING_NOTIFICATION_IDS_KEY);
    } catch (error) {
      console.error('Error canceling fasting notifications:', error);
    }
  }
}

export const fastingNotificationService = new FastingNotificationService();
