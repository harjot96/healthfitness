import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './config';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerFCMToken = async (userId: string): Promise<void> => {
  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return;
    }

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '72b13bcf-08f4-459f-982c-2614e1adac20', // Expo project ID from app.json
    });

    // Save token to Firestore
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        fcmToken: tokenData.data,
        fcmTokenUpdatedAt: new Date(),
      },
      { merge: true }
    );

    console.log('FCM token registered:', tokenData.data);
  } catch (error) {
    console.error('Error registering FCM token:', error);
  }
};

export const setupNotificationListeners = (
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationTapped: (response: Notifications.NotificationResponse) => void
) => {
  // Listener for notifications received while app is foregrounded
  const receivedListener = Notifications.addNotificationReceivedListener(onNotificationReceived);

  // Listener for when user taps on a notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationTapped);

  return () => {
    receivedListener.remove();
    responseListener.remove();
  };
};

