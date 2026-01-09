import { apolloClient } from './client';
import {
  GET_FRIENDS,
  GET_FRIEND_REQUESTS,
  GET_CLANS,
  GET_CLAN_INVITES,
  GET_NOTIFICATIONS,
  GET_UNREAD_NOTIFICATION_COUNT,
} from './queries';
import {
  SEND_FRIEND_REQUEST,
  ACCEPT_FRIEND_REQUEST,
  REJECT_FRIEND_REQUEST,
  CANCEL_FRIEND_REQUEST,
  REMOVE_FRIEND,
  CREATE_CLAN,
  INVITE_TO_CLAN,
  RESPOND_CLAN_INVITE,
  LEAVE_CLAN,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from './mutations';
import { Friend, FriendRequest, Clan, ClanInvite, Notification } from '../../types';

/**
 * Get friends list
 */
export const getFriends = async (): Promise<Friend[]> => {
  try {
    const { data } = await apolloClient.query({
      query: GET_FRIENDS,
      fetchPolicy: 'network-only',
    });

    if (!data?.friends) {
      return [];
    }

    return data.friends.map((f: any) => ({
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
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to get friends';
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
    const { data } = await apolloClient.query({
      query: GET_FRIEND_REQUESTS,
      fetchPolicy: 'network-only',
    });

    if (!data?.friendRequests) {
      return { sent: [], received: [] };
    }

    return {
      sent: (data.friendRequests.sent || []).map((req: any) => ({
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
      received: (data.friendRequests.received || []).map((req: any) => ({
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
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to get friend requests';
    throw new Error(message);
  }
};

/**
 * Send friend request
 */
export const sendFriendRequest = async (toUid: string): Promise<FriendRequest> => {
  try {
    const { data } = await apolloClient.mutate({
      mutation: SEND_FRIEND_REQUEST,
      variables: { toUid },
    });

    if (!data?.sendFriendRequest) {
      throw new Error('Failed to send friend request');
    }

    const req = data.sendFriendRequest;
    return {
      fromUid: req.fromUid,
      toUid: req.toUid,
      status: req.status,
      createdAt: new Date(req.createdAt),
      updatedAt: new Date(req.updatedAt || req.createdAt),
    };
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to send friend request';
    throw new Error(message);
  }
};

/**
 * Accept friend request
 */
export const acceptFriendRequest = async (fromUid: string): Promise<Friend> => {
  try {
    const { data } = await apolloClient.mutate({
      mutation: ACCEPT_FRIEND_REQUEST,
      variables: { fromUid },
    });

    if (!data?.acceptFriendRequest) {
      throw new Error('Failed to accept friend request');
    }

    const friend = data.acceptFriendRequest;
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
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to accept friend request';
    throw new Error(message);
  }
};

/**
 * Reject friend request
 */
export const rejectFriendRequest = async (fromUid: string): Promise<void> => {
  try {
    await apolloClient.mutate({
      mutation: REJECT_FRIEND_REQUEST,
      variables: { fromUid },
    });
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to reject friend request';
    throw new Error(message);
  }
};

/**
 * Cancel friend request
 */
export const cancelFriendRequest = async (toUid: string): Promise<void> => {
  try {
    await apolloClient.mutate({
      mutation: CANCEL_FRIEND_REQUEST,
      variables: { toUid },
    });
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to cancel friend request';
    throw new Error(message);
  }
};

/**
 * Remove friend
 */
export const removeFriend = async (friendUid: string): Promise<void> => {
  try {
    await apolloClient.mutate({
      mutation: REMOVE_FRIEND,
      variables: { friendUid },
    });
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to remove friend';
    throw new Error(message);
  }
};

/**
 * Get clans
 */
export const getClans = async (): Promise<Clan[]> => {
  try {
    const { data } = await apolloClient.query({
      query: GET_CLANS,
      fetchPolicy: 'network-only',
    });

    if (!data?.clans) {
      return [];
    }

    return data.clans.map((clan: any) => ({
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
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to get clans';
    throw new Error(message);
  }
};

/**
 * Get clan invites
 */
export const getClanInvites = async (): Promise<ClanInvite[]> => {
  try {
    const { data } = await apolloClient.query({
      query: GET_CLAN_INVITES,
      fetchPolicy: 'network-only',
    });

    if (!data?.clanInvites) {
      return [];
    }

    return data.clanInvites.map((invite: any) => ({
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
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to get clan invites';
    throw new Error(message);
  }
};

/**
 * Create clan
 */
export const createClan = async (name: string, description?: string, privacy?: string): Promise<Clan> => {
  try {
    const { data } = await apolloClient.mutate({
      mutation: CREATE_CLAN,
      variables: { name, description, privacy },
    });

    if (!data?.createClan) {
      throw new Error('Failed to create clan');
    }

    const clan = data.createClan;
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
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to create clan';
    throw new Error(message);
  }
};

/**
 * Invite to clan
 */
export const inviteToClan = async (clanId: string, toUid: string): Promise<ClanInvite> => {
  try {
    const { data } = await apolloClient.mutate({
      mutation: INVITE_TO_CLAN,
      variables: { clanId, toUid },
    });

    if (!data?.inviteToClan) {
      throw new Error('Failed to invite to clan');
    }

    const invite = data.inviteToClan;
    return {
      id: invite.id,
      clanId: invite.clanId,
      fromUid: invite.fromUid,
      toUid: invite.toUid,
      status: (invite.status as 'pending' | 'accepted' | 'rejected') || 'pending',
      createdAt: new Date(invite.createdAt),
    };
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to invite to clan';
    throw new Error(message);
  }
};

/**
 * Respond to clan invite
 */
export const respondClanInvite = async (clanId: string, action: 'accept' | 'reject'): Promise<void> => {
  try {
    await apolloClient.mutate({
      mutation: RESPOND_CLAN_INVITE,
      variables: { clanId, action },
    });
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to respond to clan invite';
    throw new Error(message);
  }
};

/**
 * Leave clan
 */
export const leaveClan = async (clanId: string): Promise<void> => {
  try {
    await apolloClient.mutate({
      mutation: LEAVE_CLAN,
      variables: { clanId },
    });
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to leave clan';
    throw new Error(message);
  }
};

/**
 * Get notifications
 */
export const getNotifications = async (limit?: number, offset?: number): Promise<Notification[]> => {
  try {
    const { data } = await apolloClient.query({
      query: GET_NOTIFICATIONS,
      variables: { limit, offset },
      fetchPolicy: 'network-only',
    });

    if (!data?.notifications) {
      return [];
    }

    return data.notifications.map((notif: any) => ({
      id: notif.id,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      data: notif.data || {},
      read: notif.read || false,
      createdAt: new Date(notif.createdAt),
    }));
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to get notifications';
    throw new Error(message);
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  try {
    const { data } = await apolloClient.query({
      query: GET_UNREAD_NOTIFICATION_COUNT,
      fetchPolicy: 'network-only',
    });

    return data?.unreadNotificationCount || 0;
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
    await apolloClient.mutate({
      mutation: MARK_NOTIFICATION_READ,
      variables: { notificationId },
    });
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to mark notification as read';
    throw new Error(message);
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async (): Promise<void> => {
  try {
    await apolloClient.mutate({
      mutation: MARK_ALL_NOTIFICATIONS_READ,
    });
  } catch (error: any) {
    const message = error.graphQLErrors?.[0]?.message || error.message || 'Failed to mark all notifications as read';
    throw new Error(message);
  }
};

