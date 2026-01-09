import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Notification } from '../../types';

export const getNotifications = async (uid: string, maxResults: number = 50): Promise<Notification[]> => {
  const notificationsRef = collection(db, 'notifications', uid, 'items');
  const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(maxResults));
  const notificationsSnap = await getDocs(q);
  
  return notificationsSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data || {},
      read: data.read || false,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
};

export const subscribeToNotifications = (
  uid: string,
  callback: (notifications: Notification[]) => void,
  maxResults: number = 50
): Unsubscribe => {
  const notificationsRef = collection(db, 'notifications', uid, 'items');
  const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(maxResults));
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data || {},
        read: data.read || false,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });
    callback(notifications);
  });
};

export const markNotificationAsRead = async (uid: string, notificationId: string): Promise<void> => {
  const notificationRef = doc(db, 'notifications', uid, 'items', notificationId);
  await updateDoc(notificationRef, { read: true });
};

export const markAllNotificationsAsRead = async (uid: string): Promise<void> => {
  const notificationsRef = collection(db, 'notifications', uid, 'items');
  const q = query(notificationsRef, where('read', '==', false));
  const notificationsSnap = await getDocs(q);
  
  const updatePromises = notificationsSnap.docs.map(doc =>
    updateDoc(doc.ref, { read: true })
  );
  
  await Promise.all(updatePromises);
};

export const getUnreadNotificationCount = async (uid: string): Promise<number> => {
  const notificationsRef = collection(db, 'notifications', uid, 'items');
  const q = query(notificationsRef, where('read', '==', false));
  const notificationsSnap = await getDocs(q);
  return notificationsSnap.size;
};

export const subscribeToUnreadCount = (
  uid: string,
  callback: (count: number) => void
): Unsubscribe => {
  const notificationsRef = collection(db, 'notifications', uid, 'items');
  const q = query(notificationsRef, where('read', '==', false));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
};

