import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as communityService from '../services/api/community';
import { Friend, FriendRequest, Clan, ClanInvite, Notification } from '../types';

interface CommunityContextType {
  // Friends
  friends: Friend[];
  sentRequests: FriendRequest[];
  receivedRequests: FriendRequest[];
  loadingFriends: boolean;
  
  // Clans
  clans: Clan[];
  clanInvites: ClanInvite[];
  loadingClans: boolean;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  loadingNotifications: boolean;
  
  // Actions
  refreshFriends: () => Promise<void>;
  refreshClans: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  
  // Clans state
  const [clans, setClans] = useState<Clan[]>([]);
  const [clanInvites, setClanInvites] = useState<ClanInvite[]>([]);
  const [loadingClans, setLoadingClans] = useState(true);
  
  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  
  // Refresh functions
  const refreshFriends = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoadingFriends(true);
      const [friendsList, requests] = await Promise.all([
        communityService.getFriends(),
        communityService.getFriendRequests(),
      ]);
      
      setFriends(friendsList);
      setSentRequests(requests.sent);
      setReceivedRequests(requests.received);
    } catch (error) {
      console.error('Error refreshing friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  }, [user]);
  
  const refreshClans = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoadingClans(true);
      const [userClans, invites] = await Promise.all([
        communityService.getClans(),
        communityService.getClanInvites(),
      ]);
      
      setClans(userClans);
      setClanInvites(invites);
    } catch (error) {
      console.error('Error refreshing clans:', error);
    } finally {
      setLoadingClans(false);
    }
  }, [user]);
  
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoadingNotifications(true);
      const [notifs, count] = await Promise.all([
        communityService.getNotifications(),
        communityService.getUnreadNotificationCount(),
      ]);
      
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user]);
  
  const markNotificationRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    
    try {
      await communityService.markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user]);
  
  const markAllNotificationsRead = useCallback(async () => {
    if (!user) return;
    
    try {
      await communityService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user]);
  
  // TODO: Set up notification listeners for push notifications
  // This will need to be implemented with the new backend
  useEffect(() => {
    if (!user) return;
    // Notification listeners can be set up here when push notification service is ready
  }, [user, refreshNotifications, markNotificationRead]);

  // Set up real-time listeners
  useEffect(() => {
    if (!user) {
      setFriends([]);
      setSentRequests([]);
      setReceivedRequests([]);
      setClans([]);
      setClanInvites([]);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    
    // Initial load
    refreshFriends();
    refreshClans();
    refreshNotifications();
    
    // TODO: Set up GraphQL subscriptions for real-time updates
    // For now, we'll use polling or manual refresh
    // GraphQL subscriptions can be added when backend supports them
  }, [user, refreshFriends, refreshClans, refreshNotifications]);
  
  return (
    <CommunityContext.Provider
      value={{
        friends,
        sentRequests,
        receivedRequests,
        loadingFriends,
        clans,
        clanInvites,
        loadingClans,
        notifications,
        unreadCount,
        loadingNotifications,
        refreshFriends,
        refreshClans,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  if (context === undefined) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};

