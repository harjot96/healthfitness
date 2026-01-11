import { apiClient } from './client';
import { Friend, FriendRequest, Clan, ClanInvite, Notification } from '../../types';

/**
 * Get friends list
 */
export const getFriends = async (): Promise<Friend[]> => {
  try {
    const friends = await apiClient.get<any[]>('/community/friends');

    return friends.map((f: any) => ({
      friendUid: f.friendUid || f.friend?.id,
      createdAt: new Date(f.createdAt),
      ringsShare: f.ringsShare || false,
      friend: f.friend ? {
        uid: f.friend.id,
        email: f.friend.email,
        displayName: f.friend.displayName,
        photoURL: f.friend.photoURL || '',
      } : undefined,
    }));
  } catch (error: any) {
    const message = error.message || 'Failed to get friends';
    throw new Error(message);
  }
};

/**
 * Get friend requests (sent and received)
 */
export const getFriendRequests = async (): Promise<{
  sent: FriendRequest[];
  received: FriendRequest[];
}> => {
  try {
    const requests = await apiClient.get<{
      sent: any[];
      received: any[];
    }>('/community/friend-requests');

    return {
      sent: (requests.sent || []).map((req: any) => ({
        fromUid: req.fromUid,
        toUid: req.toUid,
        status: req.status,
        createdAt: new Date(req.createdAt),
        updatedAt: new Date(req.updatedAt || req.createdAt),
        toUser: req.toUser ? {
          uid: req.toUser.id,
          email: req.toUser.email,
          displayName: req.toUser.displayName,
          photoURL: req.toUser.photoURL || '',
        } : undefined,
      })),
      received: (requests.received || []).map((req: any) => ({
        fromUid: req.fromUid,
        toUid: req.toUid,
        status: req.status,
        createdAt: new Date(req.createdAt),
        updatedAt: new Date(req.updatedAt || req.createdAt),
        fromUser: req.fromUser ? {
          uid: req.fromUser.id,
          email: req.fromUser.email,
          displayName: req.fromUser.displayName,
          photoURL: req.fromUser.photoURL || '',
        } : undefined,
      })),
    };
  } catch (error: any) {
    const message = error.message || 'Failed to get friend requests';
    throw new Error(message);
  }
};

/**
 * Send friend request
 */
export const sendFriendRequest = async (toUid: string): Promise<FriendRequest> => {
  try {
    const req = await apiClient.post<any>('/community/friend-requests', {
      toUid,
    });

    return {
      fromUid: req.fromUid,
      toUid: req.toUid,
      status: req.status,
      createdAt: new Date(req.createdAt),
      updatedAt: new Date(req.updatedAt || req.createdAt),
    };
  } catch (error: any) {
    const message = error.message || 'Failed to send friend request';
    throw new Error(message);
  }
};

/**
 * Accept friend request
 */
export const acceptFriendRequest = async (fromUid: string): Promise<Friend> => {
  try {
    const friend = await apiClient.post<any>(`/community/friend-requests/${fromUid}/accept`);

    return {
      friendUid: friend.friendUid || friend.friend?.id,
      createdAt: new Date(friend.createdAt),
      ringsShare: friend.ringsShare || false,
      friend: friend.friend ? {
        uid: friend.friend.id,
        email: friend.friend.email,
        displayName: friend.friend.displayName,
        photoURL: friend.friend.photoURL || '',
      } : undefined,
    };
  } catch (error: any) {
    const message = error.message || 'Failed to accept friend request';
    throw new Error(message);
  }
};

/**
 * Reject friend request
 */
export const rejectFriendRequest = async (fromUid: string): Promise<void> => {
  try {
    await apiClient.post(`/community/friend-requests/${fromUid}/reject`);
  } catch (error: any) {
    const message = error.message || 'Failed to reject friend request';
    throw new Error(message);
  }
};

/**
 * Cancel friend request
 */
export const cancelFriendRequest = async (toUid: string): Promise<void> => {
  try {
    await apiClient.delete(`/community/friend-requests/${toUid}`);
  } catch (error: any) {
    const message = error.message || 'Failed to cancel friend request';
    throw new Error(message);
  }
};

/**
 * Remove friend
 */
export const removeFriend = async (friendUid: string): Promise<void> => {
  try {
    await apiClient.delete(`/community/friends/${friendUid}`);
  } catch (error: any) {
    const message = error.message || 'Failed to remove friend';
    throw new Error(message);
  }
};

/**
 * Get clans
 */
export const getClans = async (): Promise<Clan[]> => {
  try {
    const clans = await apiClient.get<any[]>('/community/clans');

    return clans.map((clan: any) => ({
      id: clan.id,
      name: clan.name,
      description: clan.description || '',
      photoURL: clan.photoURL || '',
      ownerUid: clan.ownerUid,
      privacy: (clan.privacy as 'public' | 'private') || 'public',
      createdAt: new Date(clan.createdAt),
      members: (clan.members || []).map((member: any) => ({
        uid: member.uid || member.user?.id,
        role: (member.role as 'owner' | 'admin' | 'member') || 'member',
        status: (member.status as 'active' | 'pending' | 'inactive') || 'active',
        user: member.user ? {
          uid: member.user.id,
          email: member.user.email,
          displayName: member.user.displayName,
          photoURL: member.user.photoURL || '',
        } : undefined,
      })),
    }));
  } catch (error: any) {
    const message = error.message || 'Failed to get clans';
    throw new Error(message);
  }
};

/**
 * Get clan invites
 */
export const getClanInvites = async (): Promise<ClanInvite[]> => {
  try {
    const invites = await apiClient.get<any[]>('/community/clans/invites');

    return invites.map((invite: any) => ({
      id: invite.id,
      clanId: invite.clanId,
      fromUid: invite.fromUid,
      toUid: invite.toUid,
      status: (invite.status as 'pending' | 'accepted' | 'rejected') || 'pending',
      createdAt: new Date(invite.createdAt),
      clan: invite.clan ? {
        id: invite.clan.id,
        name: invite.clan.name,
        description: invite.clan.description || '',
      } : undefined,
      fromUser: invite.fromUser ? {
        uid: invite.fromUser.id,
        email: invite.fromUser.email,
        displayName: invite.fromUser.displayName,
        photoURL: invite.fromUser.photoURL || '',
      } : undefined,
    }));
  } catch (error: any) {
    const message = error.message || 'Failed to get clan invites';
    throw new Error(message);
  }
};

/**
 * Create clan
 */
export const createClan = async (name: string, description?: string, privacy?: string): Promise<Clan> => {
  try {
    const clan = await apiClient.post<any>('/community/clans', {
      name,
      description,
      privacy,
    });

    return {
      id: clan.id,
      name: clan.name,
      description: clan.description || '',
      photoURL: clan.photoURL || '',
      ownerUid: clan.ownerUid,
      privacy: (clan.privacy as 'public' | 'private') || 'public',
      createdAt: new Date(),
      members: [],
    };
  } catch (error: any) {
    const message = error.message || 'Failed to create clan';
    throw new Error(message);
  }
};

/**
 * Invite to clan
 */
export const inviteToClan = async (clanId: string, toUid: string): Promise<ClanInvite> => {
  try {
    const invite = await apiClient.post<any>(`/community/clans/${clanId}/invite`, {
      toUid,
    });

    return {
      id: invite.id,
      clanId: invite.clanId,
      fromUid: invite.fromUid,
      toUid: invite.toUid,
      status: (invite.status as 'pending' | 'accepted' | 'rejected') || 'pending',
      createdAt: new Date(invite.createdAt),
    };
  } catch (error: any) {
    const message = error.message || 'Failed to invite to clan';
    throw new Error(message);
  }
};

/**
 * Respond to clan invite
 */
export const respondClanInvite = async (clanId: string, action: 'accept' | 'reject'): Promise<void> => {
  try {
    // First get the invite ID
    const invites = await getClanInvites();
    const invite = invites.find(inv => inv.clanId === clanId && inv.status === 'pending');
    
    if (!invite) {
      throw new Error('Clan invite not found');
    }

    await apiClient.post(`/community/clans/${clanId}/invites/${invite.id}/respond`, {
      action,
    });
  } catch (error: any) {
    const message = error.message || 'Failed to respond to clan invite';
    throw new Error(message);
  }
};

/**
 * Leave clan
 */
export const leaveClan = async (clanId: string): Promise<void> => {
  try {
    await apiClient.delete(`/community/clans/${clanId}/leave`);
  } catch (error: any) {
    const message = error.message || 'Failed to leave clan';
    throw new Error(message);
  }
};

/**
 * Get notifications
 */
export const getNotifications = async (limit?: number, offset?: number): Promise<Notification[]> => {
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const queryString = params.toString();
    const endpoint = `/community/notifications${queryString ? `?${queryString}` : ''}`;
    
    const notifications = await apiClient.get<any[]>(endpoint);

    return notifications.map((notif: any) => ({
      id: notif.id,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      data: notif.data || {},
      read: notif.read || false,
      createdAt: new Date(notif.createdAt),
    }));
  } catch (error: any) {
    const message = error.message || 'Failed to get notifications';
    throw new Error(message);
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  try {
    const count = await apiClient.get<number>('/community/notifications/unread-count');
    return count || 0;
  } catch (error: any) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (notificationId: string): Promise<void> => {
  try {
    await apiClient.put(`/community/notifications/${notificationId}/read`);
  } catch (error: any) {
    const message = error.message || 'Failed to mark notification as read';
    throw new Error(message);
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async (): Promise<void> => {
  try {
    await apiClient.put('/community/notifications/read-all');
  } catch (error: any) {
    const message = error.message || 'Failed to mark all notifications as read';
    throw new Error(message);
  }
};
