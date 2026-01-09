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

  async scheduleEatingWindowNotifications(
    startTime: Date,
    eatingWindow: { startHour: number; endHour: number; value: string }
  ): Promise<void> {
    if (!eatingWindow) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate eating window start time (today at startHour)
    const eatingWindowStart = new Date(today);
    eatingWindowStart.setHours(eatingWindow.startHour, 0, 0, 0);
    
    // If eating window has already passed today, schedule for tomorrow
    if (eatingWindowStart <= now) {
      eatingWindowStart.setDate(eatingWindowStart.getDate() + 1);
    }

    // Calculate eating window end time (same day at endHour)
    const eatingWindowEnd = new Date(eatingWindowStart);
    eatingWindowEnd.setHours(eatingWindow.endHour, 0, 0, 0);
    
    // If end is before start, it means it spans midnight (next day)
    if (eatingWindowEnd <= eatingWindowStart) {
      eatingWindowEnd.setDate(eatingWindowEnd.getDate() + 1);
    }

    const notificationIds: string[] = [];

    // Schedule eating window start notification
    const secondsUntilStart = Math.max(1, Math.round((eatingWindowStart.getTime() - now.getTime()) / 1000));
    if (secondsUntilStart > 0 && secondsUntilStart < 86400 * 2) { // Within 2 days
      const startId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Eating Window Opens! 🍽️',
          body: `Your eating window is now open (${eatingWindow.startHour}:00 - ${eatingWindow.endHour}:00)`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: 'timeInterval',
          seconds: secondsUntilStart,
          repeats: false,
          channelId: Platform.OS === 'android' ? 'fasting-milestones' : undefined,
        },
      });
      notificationIds.push(startId);
    }

    // Schedule eating window end notification
    const secondsUntilEnd = Math.max(1, Math.round((eatingWindowEnd.getTime() - now.getTime()) / 1000));
    if (secondsUntilEnd > 0 && secondsUntilEnd < 86400 * 2) { // Within 2 days
      const endId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Eating Window Closes 🔒',
          body: 'Your eating window has closed. Fasting continues!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: 'timeInterval',
          seconds: secondsUntilEnd,
          repeats: false,
          channelId: Platform.OS === 'android' ? 'fasting-milestones' : undefined,
        },
      });
      notificationIds.push(endId);
    }

    this.notificationIds.push(...notificationIds);
    const allIds = [...this.notificationIds];
    await AsyncStorage.setItem(FASTING_NOTIFICATION_IDS_KEY, JSON.stringify(allIds));
  }

  async scheduleCompletionNotification(
    remainingMinutes: number,
    targetDuration: number
  ): Promise<void> {
    try {
      if (remainingMinutes <= 0) return;

      const secondsUntil = Math.max(1, remainingMinutes * 60);

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Fasting Complete!',
          body: `Congratulations! You've completed your ${targetDuration}-hour fast!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: 'fasting_complete',
            targetDuration,
          },
        },
        trigger: {
          type: 'timeInterval',
          seconds: secondsUntil,
          repeats: false,
          channelId: Platform.OS === 'android' ? 'fasting-milestones' : undefined,
        },
      });

      this.notificationIds.push(id);
      const allIds = [...this.notificationIds];
      await AsyncStorage.setItem(FASTING_NOTIFICATION_IDS_KEY, JSON.stringify(allIds));
    } catch (error) {
      console.error('Error scheduling completion notification:', error);
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
