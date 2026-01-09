import {onCall, HttpsError} from "firebase-functions/v2/https";
import {
  onDocumentUpdated,
  onDocumentCreated,
} from "firebase-functions/v2/firestore";
import {setGlobalOptions, logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

interface FastingCompletionData {
  userId: string;
  sessionId: string;
  duration?: number;
  type?: string;
  targetDuration?: number;
  completedAt?: string;
}

// Cloud Function to send fasting completion notification
// This function can be called via HTTP or triggered by Firestore events
export const sendFastingCompletionNotification = onCall(
  {
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const {
      userId,
      sessionId,
      duration,
      type,
      targetDuration,
      completedAt,
    } = request.data as FastingCompletionData;

    if (!userId || !sessionId) {
      throw new HttpsError(
        "invalid-argument",
        "userId and sessionId are required."
      );
    }

    // Verify the userId matches the authenticated user
    if (request.auth.uid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "User can only trigger notifications for their own " +
          "fasting sessions."
      );
    }

    try {
      // Get user's FCM token from Firestore
      const userRef = admin.firestore().collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found.");
      }

      const userData = userDoc.data();
      const fcmToken = userData?.fcmToken;

      if (!fcmToken) {
        logger.log(
          `No FCM token found for user ${userId}. Skipping notification.`
        );
        return {success: false, message: "No FCM token found"};
      }

      // Prepare notification message
      const hourText = targetDuration ? `${targetDuration}-hour` : "";
      const fastType = type || "fast";
      const completionText =
        "Congratulations! You've completed your " +
        `${hourText} ${fastType}!`;

      const message = {
        notification: {
          title: "🎉 Fasting Complete!",
          body: completionText,
        },
        data: {
          type: "fasting_complete",
          sessionId: sessionId,
          duration: duration?.toString() || "0",
          completedAt: completedAt || new Date().toISOString(),
        },
        token: fcmToken as string,
        android: {
          priority: "high" as const,
          notification: {
            channelId: "fasting-milestones",
            sound: "default",
            priority: "high" as const,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              alert: {
                title: "🎉 Fasting Complete!",
                body: completionText,
              },
            },
          },
        },
      };

      // Send notification
      const response = await admin.messaging().send(message);
      logger.log(
        "Successfully sent fasting completion notification to user " +
          `${userId}:`,
        {messageId: response}
      );

      return {
        success: true,
        messageId: response,
      };
    } catch (error: unknown) {
      logger.error(
        "Error sending fasting completion notification:",
        error
      );
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new HttpsError(
        "internal",
        "An error occurred while sending the notification.",
        errorMessage
      );
    }
  }
);

// Firestore trigger to automatically send notification when fasting completes
// This listens to changes in the health collection and triggers when a
// fasting session is completed
export const onFastingCompleted = onDocumentUpdated(
  {
    document: "users/{userId}/health/{date}",
    region: "us-central1",
    database: "(default)",
  },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const userId = event.params.userId;

    // Check if fasting session was just completed
    const beforeSession = beforeData?.fastingSession;
    const afterSession = afterData?.fastingSession;

    // If session didn't exist before or already had endTime, skip
    if (!beforeSession || beforeSession.endTime) {
      return null;
    }

    // If session now has endTime, it was completed
    if (afterSession && afterSession.endTime && !beforeSession.endTime) {
      // Check if target duration was reached (within 5% tolerance)
      const hasTarget = afterSession.targetDuration;
      const durationReached =
        hasTarget &&
        afterSession.duration >= (afterSession.targetDuration * 0.95);

      if (durationReached) {
        // Call the notification function
        try {
          const notificationsRef = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("notifications");
          await notificationsRef.add({
            type: "fasting_complete",
            sessionId: afterSession.id,
            duration: afterSession.duration,
            typeName: afterSession.type,
            targetDuration: afterSession.targetDuration,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });

          // Get user's FCM token
          const userRef = admin.firestore().collection("users").doc(userId);
          const userDoc = await userRef.get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            const fcmToken = userData?.fcmToken;

            if (fcmToken) {
              const endTime = afterSession.endTime;
              const targetHours = afterSession.targetDuration;
              const fastType = afterSession.type;
              const completionBody =
                "Congratulations! You've completed your " +
                `${targetHours}-hour ${fastType} fast!`;

              const endTimeDate = endTime ?
                (endTime as admin.firestore.Timestamp).toDate() :
                new Date();

              const message = {
                notification: {
                  title: "🎉 Fasting Complete!",
                  body: completionBody,
                },
                data: {
                  type: "fasting_complete",
                  sessionId: afterSession.id,
                  duration: afterSession.duration.toString(),
                  completedAt: endTimeDate.toISOString(),
                },
                token: fcmToken as string,
                android: {
                  priority: "high" as const,
                  notification: {
                    channelId: "fasting-milestones",
                    sound: "default",
                    priority: "high" as const,
                  },
                },
                apns: {
                  payload: {
                    aps: {
                      sound: "default",
                      badge: 1,
                      alert: {
                        title: "🎉 Fasting Complete!",
                        body: completionBody,
                      },
                    },
                  },
                },
              };

              await admin.messaging().send(message);
              logger.log(
                `Auto-sent fasting completion notification to user ${userId}`
              );
            }
          }
        } catch (error) {
          logger.error("Error in onFastingCompleted trigger:", error);
        }
      }
    }

    return null;
  }
);

// ==================== COMMUNITY FUNCTIONS ====================

/**
 * Helper function to send FCM notification
 * @param {string} userId - User ID to send notification to
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Record<string, string>} data - Additional data payload
 * @return {Promise<void>}
 */
async function sendFCMNotification(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<void> {
  try {
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;
    if (!fcmToken) {
      logger.log(`No FCM token for user ${userId}`);
      return;
    }

    await admin.messaging().send({
      notification: {title, body},
      data: {...data, type: data.type || "community"},
      token: fcmToken as string,
      android: {
        priority: "high" as const,
        notification: {
          channelId: "community",
          sound: "default",
          priority: "high" as const,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            alert: {title, body},
          },
        },
      },
    });
  } catch (error) {
    logger.error(`Error sending FCM to ${userId}:`, error);
  }
}

/**
 * Helper function to create notification document
 * @param {string} userId - User ID to create notification for
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Record<string, string>} data - Additional data payload
 * @return {Promise<void>}
 */
async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<void> {
  try {
    await admin
      .firestore()
      .collection("notifications")
      .doc(userId)
      .collection("items")
      .add({
        type,
        title,
        body,
        data,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    logger.error(`Error creating notification for ${userId}:`, error);
  }
}

/**
 * Helper function to check if users are friends
 * @param {string} uid1 - First user ID
 * @param {string} uid2 - Second user ID
 * @return {Promise<boolean>} Promise resolving to true if users are friends
 */
async function areFriends(uid1: string, uid2: string): Promise<boolean> {
  const friend1Ref = admin
    .firestore()
    .collection("friends")
    .doc(uid1)
    .collection("list")
    .doc(uid2);
  const friend1Doc = await friend1Ref.get();
  return friend1Doc.exists;
}

/**
 * Helper function to check if user is blocked
 * @param {string} blockerUid - User ID who may have blocked
 * @param {string} blockedUid - User ID who may be blocked
 * @return {Promise<boolean>} Promise resolving to true if user is blocked
 */
async function isBlocked(
  blockerUid: string,
  blockedUid: string
): Promise<boolean> {
  const blockedRef = admin
    .firestore()
    .collection("blockedUsers")
    .doc(blockerUid)
    .collection("list")
    .doc(blockedUid);
  const blockedDoc = await blockedRef.get();
  return blockedDoc.exists;
}

/**
 * Helper function to check if user is in clan
 * @param {string} clanId - Clan ID
 * @param {string} uid - User ID
 * @return {Promise<boolean>} Promise resolving to true if user is active member
 */
async function isClanMember(clanId: string, uid: string): Promise<boolean> {
  const memberRef = admin
    .firestore()
    .collection("clans")
    .doc(clanId)
    .collection("members")
    .doc(uid);
  const memberDoc = await memberRef.get();
  return memberDoc.exists && memberDoc.data()?.status === "active";
}

// ==================== FRIEND FUNCTIONS ====================

export const sendFriendRequest = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {toUid} = request.data as {toUid: string};
    const fromUid = request.auth.uid;

    if (!toUid || toUid === fromUid) {
      throw new HttpsError("invalid-argument", "Invalid user ID");
    }

    try {
      // Check if blocked
      if (await isBlocked(toUid, fromUid) || await isBlocked(fromUid, toUid)) {
        throw new HttpsError("permission-denied", "Cannot send request");
      }

      // Check if already friends
      if (await areFriends(fromUid, toUid)) {
        throw new HttpsError("already-exists", "Already friends");
      }

      // Check for reverse request
      const reverseRequestId = `${toUid}_to_${fromUid}`;
      const reverseRequestRef = admin
        .firestore()
        .collection("friendRequests")
        .doc(reverseRequestId);
      const reverseRequestDoc = await reverseRequestRef.get();

      if (reverseRequestDoc.exists) {
        const reverseData = reverseRequestDoc.data();
        if (reverseData?.status === "pending") {
          // Auto-accept: create bidirectional friendship
          const now = admin.firestore.FieldValue.serverTimestamp();
          await admin.firestore().runTransaction(async (transaction) => {
            // Create friendship for both users
            transaction.set(
              admin
                .firestore()
                .collection("friends")
                .doc(fromUid)
                .collection("list")
                .doc(toUid),
              {
                friendUid: toUid,
                createdAt: now,
                ringsShare: true,
              }
            );
            transaction.set(
              admin
                .firestore()
                .collection("friends")
                .doc(toUid)
                .collection("list")
                .doc(fromUid),
              {
                friendUid: fromUid,
                createdAt: now,
                ringsShare: true,
              }
            );
            // Update reverse request to accepted
            transaction.update(reverseRequestRef, {
              status: "accepted",
              updatedAt: now,
            });
            // Delete the reverse request
            transaction.delete(reverseRequestRef);
          });

          // Notify both users
          const fromUserDoc = await admin
            .firestore()
            .collection("users")
            .doc(fromUid)
            .get();
          const fromUserData = fromUserDoc.data();
          const fromDisplayName = fromUserData?.displayName || "Someone";

          await sendFCMNotification(
            toUid,
            "Friend Request Accepted",
            `${fromDisplayName} accepted your friend request`,
            {type: "FRIEND_ACCEPTED", fromUid}
          );
          await createNotification(
            toUid,
            "FRIEND_ACCEPTED",
            "Friend Request Accepted",
            `${fromDisplayName} accepted your friend request`,
            {fromUid}
          );

          const toUserDoc = await admin
            .firestore()
            .collection("users")
            .doc(toUid)
            .get();
          const toUserData = toUserDoc.data();
          const toDisplayName = toUserData?.displayName || "Someone";

          await sendFCMNotification(
            fromUid,
            "Friend Request Accepted",
            `${toDisplayName} accepted your friend request`,
            {type: "FRIEND_ACCEPTED", fromUid: toUid}
          );
          await createNotification(
            fromUid,
            "FRIEND_ACCEPTED",
            "Friend Request Accepted",
            `${toDisplayName} accepted your friend request`,
            {fromUid: toUid}
          );

          return {success: true, autoAccepted: true};
        }
      }

      // Check for existing request
      const requestId = `${fromUid}_to_${toUid}`;
      const requestRef = admin
        .firestore()
        .collection("friendRequests")
        .doc(requestId);
      const requestDoc = await requestRef.get();

      if (requestDoc.exists) {
        const existingData = requestDoc.data();
        if (existingData?.status === "pending") {
          throw new HttpsError("already-exists", "Request already sent");
        }
      }

      // Create new request
      const now = admin.firestore.FieldValue.serverTimestamp();
      await requestRef.set({
        fromUid,
        toUid,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });

      // Notification will be sent by trigger
      return {success: true};
    } catch (error: unknown) {
      logger.error("Error in sendFriendRequest:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to send friend request");
    }
  }
);

export const cancelFriendRequest = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {toUid} = request.data as {toUid: string};
    const fromUid = request.auth.uid;

    if (!toUid) {
      throw new HttpsError("invalid-argument", "Invalid user ID");
    }

    try {
      const requestId = `${fromUid}_to_${toUid}`;
      const requestRef = admin
        .firestore()
        .collection("friendRequests")
        .doc(requestId);
      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        throw new HttpsError("not-found", "Request not found");
      }

      const requestData = requestDoc.data();
      if (requestData?.status !== "pending") {
        throw new HttpsError("failed-precondition", "Request not pending");
      }

      if (requestData.fromUid !== fromUid) {
        throw new HttpsError("permission-denied", "Not your request");
      }

      await requestRef.update({
        status: "canceled",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {success: true};
    } catch (error: unknown) {
      logger.error("Error in cancelFriendRequest:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to cancel request");
    }
  }
);

export const respondFriendRequest = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {fromUid, action} = request.data as {
      fromUid: string;
      action: "accept" | "reject";
    };
    const toUid = request.auth.uid;

    if (!fromUid || !action) {
      throw new HttpsError("invalid-argument", "Invalid parameters");
    }

    try {
      const requestId = `${fromUid}_to_${toUid}`;
      const requestRef = admin
        .firestore()
        .collection("friendRequests")
        .doc(requestId);
      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        throw new HttpsError("not-found", "Request not found");
      }

      const requestData = requestDoc.data();
      if (requestData?.status !== "pending") {
        throw new HttpsError("failed-precondition", "Request not pending");
      }

      if (requestData.toUid !== toUid) {
        throw new HttpsError("permission-denied", "Not your request");
      }

      const now = admin.firestore.FieldValue.serverTimestamp();

      if (action === "accept") {
        // Create bidirectional friendship
        await admin.firestore().runTransaction(async (transaction) => {
          transaction.set(
            admin
              .firestore()
              .collection("friends")
              .doc(toUid)
              .collection("list")
              .doc(fromUid),
            {
              friendUid: fromUid,
              createdAt: now,
              ringsShare: true,
            }
          );
          transaction.set(
            admin
              .firestore()
              .collection("friends")
              .doc(fromUid)
              .collection("list")
              .doc(toUid),
            {
              friendUid: toUid,
              createdAt: now,
              ringsShare: true,
            }
          );
          transaction.update(requestRef, {
            status: "accepted",
            updatedAt: now,
          });
        });

        // Notify sender
        const toUserDoc = await admin
          .firestore()
          .collection("users")
          .doc(toUid)
          .get();
        const toUserData = toUserDoc.data();
        const toDisplayName = toUserData?.displayName || "Someone";

        await sendFCMNotification(
          fromUid,
          "Friend Request Accepted",
          `${toDisplayName} accepted your friend request`,
          {type: "FRIEND_ACCEPTED", fromUid: toUid}
        );
        await createNotification(
          fromUid,
          "FRIEND_ACCEPTED",
          "Friend Request Accepted",
          `${toDisplayName} accepted your friend request`,
          {fromUid: toUid}
        );
      } else {
        // Reject
        await requestRef.update({
          status: "rejected",
          updatedAt: now,
        });

        // Notify sender
        const toUserDoc = await admin
          .firestore()
          .collection("users")
          .doc(toUid)
          .get();
        const toUserData = toUserDoc.data();
        const toDisplayName = toUserData?.displayName || "Someone";

        await sendFCMNotification(
          fromUid,
          "Friend Request Rejected",
          `${toDisplayName} rejected your friend request`,
          {type: "FRIEND_REJECTED", fromUid: toUid}
        );
        await createNotification(
          fromUid,
          "FRIEND_REJECTED",
          "Friend Request Rejected",
          `${toDisplayName} rejected your friend request`,
          {fromUid: toUid}
        );
      }

      return {success: true};
    } catch (error: unknown) {
      logger.error("Error in respondFriendRequest:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to respond to request");
    }
  }
);

export const removeFriend = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {friendUid} = request.data as {friendUid: string};
    const uid = request.auth.uid;

    if (!friendUid) {
      throw new HttpsError("invalid-argument", "Invalid user ID");
    }

    try {
      // Remove bidirectional friendship
      await admin.firestore().runTransaction(async (transaction) => {
        transaction.delete(
          admin
            .firestore()
            .collection("friends")
            .doc(uid)
            .collection("list")
            .doc(friendUid)
        );
        transaction.delete(
          admin
            .firestore()
            .collection("friends")
            .doc(friendUid)
            .collection("list")
            .doc(uid)
        );
      });

      return {success: true};
    } catch (error: unknown) {
      logger.error("Error in removeFriend:", error);
      throw new HttpsError("internal", "Failed to remove friend");
    }
  }
);

export const blockUser = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {blockedUid} = request.data as {blockedUid: string};
    const uid = request.auth.uid;

    if (!blockedUid || blockedUid === uid) {
      throw new HttpsError("invalid-argument", "Invalid user ID");
    }

    try {
      const now = admin.firestore.FieldValue.serverTimestamp();

      await admin.firestore().runTransaction(async (transaction) => {
        // Add to blocked list
        transaction.set(
          admin
            .firestore()
            .collection("blockedUsers")
            .doc(uid)
            .collection("list")
            .doc(blockedUid),
          {
            blockedUid,
            blockedAt: now,
          }
        );

        // Remove friendship if exists
        const friend1Ref = admin
          .firestore()
          .collection("friends")
          .doc(uid)
          .collection("list")
          .doc(blockedUid);
        const friend2Ref = admin
          .firestore()
          .collection("friends")
          .doc(blockedUid)
          .collection("list")
          .doc(uid);

        const friend1Doc = await transaction.get(friend1Ref);
        const friend2Doc = await transaction.get(friend2Ref);

        if (friend1Doc.exists) transaction.delete(friend1Ref);
        if (friend2Doc.exists) transaction.delete(friend2Ref);

        // Cancel any pending requests
        const request1Id = `${uid}_to_${blockedUid}`;
        const request2Id = `${blockedUid}_to_${uid}`;
        const request1Ref = admin
          .firestore()
          .collection("friendRequests")
          .doc(request1Id);
        const request2Ref = admin
          .firestore()
          .collection("friendRequests")
          .doc(request2Id);

        const request1Doc = await transaction.get(request1Ref);
        const request2Doc = await transaction.get(request2Ref);

        if (request1Doc.exists && request1Doc.data()?.status === "pending") {
          transaction.update(request1Ref, {
            status: "canceled",
            updatedAt: now,
          });
        }
        if (request2Doc.exists && request2Doc.data()?.status === "pending") {
          transaction.update(request2Ref, {
            status: "canceled",
            updatedAt: now,
          });
        }
      });

      return {success: true};
    } catch (error: unknown) {
      logger.error("Error in blockUser:", error);
      throw new HttpsError("internal", "Failed to block user");
    }
  }
);

// ==================== CLAN FUNCTIONS ====================

export const createClan = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {name, description, privacy} = request.data as {
      name: string;
      description?: string;
      privacy?: "inviteOnly" | "friendsOnly";
    };
    const ownerUid = request.auth.uid;

    if (!name || name.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Clan name required");
    }

    try {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const clanRef = admin.firestore().collection("clans").doc();

      await admin.firestore().runTransaction(async (transaction) => {
        transaction.set(clanRef, {
          name: name.trim(),
          description: description?.trim() || "",
          photoURL: "",
          ownerUid,
          privacy: privacy || "inviteOnly",
          createdAt: now,
        });

        transaction.set(clanRef.collection("members").doc(ownerUid), {
          uid: ownerUid,
          role: "owner",
          status: "active",
          joinedAt: now,
        });
      });

      return {success: true, clanId: clanRef.id};
    } catch (error: unknown) {
      logger.error("Error in createClan:", error);
      throw new HttpsError("internal", "Failed to create clan");
    }
  }
);

export const inviteToClan = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {clanId, toUid} = request.data as {clanId: string; toUid: string};
    const fromUid = request.auth.uid;

    if (!clanId || !toUid) {
      throw new HttpsError("invalid-argument", "Invalid parameters");
    }

    try {
      const clanRef = admin.firestore().collection("clans").doc(clanId);
      const clanDoc = await clanRef.get();

      if (!clanDoc.exists) {
        throw new HttpsError("not-found", "Clan not found");
      }

      // Check if inviter is member with permission
      const inviterMemberRef = clanRef.collection("members").doc(fromUid);
      const inviterMemberDoc = await inviterMemberRef.get();

      if (
        !inviterMemberDoc.exists ||
        inviterMemberDoc.data()?.status !== "active"
      ) {
        throw new HttpsError("permission-denied", "Not a clan member");
      }

      // Check if already a member
      if (await isClanMember(clanId, toUid)) {
        throw new HttpsError("already-exists", "User already in clan");
      }

      // Check for existing invite
      const inviteId = `${clanId}_to_${toUid}`;
      const inviteRef = admin
        .firestore()
        .collection("clanInvites")
        .doc(inviteId);
      const inviteDoc = await inviteRef.get();

      if (inviteDoc.exists && inviteDoc.data()?.status === "pending") {
        throw new HttpsError("already-exists", "Invite already sent");
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      await inviteRef.set({
        clanId,
        fromUid,
        toUid,
        status: "pending",
        createdAt: now,
      });

      // Notification will be sent by trigger
      return {success: true};
    } catch (error: unknown) {
      logger.error("Error in inviteToClan:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to send invite");
    }
  }
);

export const respondClanInvite = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {clanId, action} = request.data as {
      clanId: string;
      action: "accept" | "reject";
    };
    const toUid = request.auth.uid;

    if (!clanId || !action) {
      throw new HttpsError("invalid-argument", "Invalid parameters");
    }

    try {
      const inviteId = `${clanId}_to_${toUid}`;
      const inviteRef = admin
        .firestore()
        .collection("clanInvites")
        .doc(inviteId);
      const inviteDoc = await inviteRef.get();

      if (!inviteDoc.exists) {
        throw new HttpsError("not-found", "Invite not found");
      }

      const inviteData = inviteDoc.data();
      if (inviteData?.status !== "pending") {
        throw new HttpsError("failed-precondition", "Invite not pending");
      }

      const now = admin.firestore.FieldValue.serverTimestamp();

      if (action === "accept") {
        const clanRef = admin.firestore().collection("clans").doc(clanId);
        await admin.firestore().runTransaction(async (transaction) => {
          transaction.set(clanRef.collection("members").doc(toUid), {
            uid: toUid,
            role: "member",
            status: "active",
            joinedAt: now,
          });
          transaction.update(inviteRef, {
            status: "accepted",
            updatedAt: now,
          });
        });

        // Notify inviter
        const clanDoc = await admin
          .firestore()
          .collection("clans")
          .doc(clanId)
          .get();
        const clanData = clanDoc.data();
        const clanName = clanData?.name || "Clan";

        const toUserDoc = await admin
          .firestore()
          .collection("users")
          .doc(toUid)
          .get();
        const toUserData = toUserDoc.data();
        const toDisplayName = toUserData?.displayName || "Someone";

        if (inviteData.fromUid) {
          await sendFCMNotification(
            inviteData.fromUid,
            "Clan Invite Accepted",
            `${toDisplayName} joined ${clanName}`,
            {type: "CLAN_INVITE_ACCEPTED", clanId, fromUid: toUid}
          );
          await createNotification(
            inviteData.fromUid,
            "CLAN_INVITE_ACCEPTED",
            "Clan Invite Accepted",
            `${toDisplayName} joined ${clanName}`,
            {clanId, fromUid: toUid}
          );
        }
      } else {
        await inviteRef.update({
          status: "rejected",
          updatedAt: now,
        });
      }

      return {success: true};
    } catch (error: unknown) {
      logger.error("Error in respondClanInvite:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to respond to invite");
    }
  }
);

export const leaveClan = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {clanId} = request.data as {clanId: string};
    const uid = request.auth.uid;

    if (!clanId) {
      throw new HttpsError("invalid-argument", "Invalid clan ID");
    }

    try {
      const memberRef = admin
        .firestore()
        .collection("clans")
        .doc(clanId)
        .collection("members")
        .doc(uid);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        throw new HttpsError("not-found", "Not a member");
      }

      const memberData = memberDoc.data();
      if (memberData?.role === "owner") {
        throw new HttpsError("failed-precondition", "Owner cannot leave clan");
      }

      await memberRef.delete();
      return {success: true};
    } catch (error: unknown) {
      logger.error("Error in leaveClan:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to leave clan");
    }
  }
);

export const removeClanMember = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {clanId, memberUid} = request.data as {
      clanId: string;
      memberUid: string;
    };
    const uid = request.auth.uid;

    if (!clanId || !memberUid) {
      throw new HttpsError("invalid-argument", "Invalid parameters");
    }

    try {
      const clanRef = admin.firestore().collection("clans").doc(clanId);
      const clanDoc = await clanRef.get();

      if (!clanDoc.exists) {
        throw new HttpsError("not-found", "Clan not found");
      }

      const requesterMemberRef = clanRef.collection("members").doc(uid);
      const requesterMemberDoc = await requesterMemberRef.get();

      if (!requesterMemberDoc.exists) {
        throw new HttpsError("permission-denied", "Not a clan member");
      }

      const requesterData = requesterMemberDoc.data();
      if (
        requesterData?.role !== "owner" &&
        requesterData?.role !== "admin"
      ) {
        throw new HttpsError("permission-denied", "Insufficient permissions");
      }

      const memberRef = clanRef.collection("members").doc(memberUid);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        throw new HttpsError("not-found", "Member not found");
      }

      const memberData = memberDoc.data();
      if (memberData?.role === "owner") {
        throw new HttpsError("failed-precondition", "Cannot remove owner");
      }

      await memberRef.delete();

      // Notify removed member
      const clanData = clanDoc.data();
      const clanName = clanData?.name || "Clan";

      await sendFCMNotification(
        memberUid,
        "Removed from Clan",
        `You were removed from ${clanName}`,
        {type: "CLAN_MEMBER_REMOVED", clanId}
      );
      await createNotification(
        memberUid,
        "CLAN_MEMBER_REMOVED",
        "Removed from Clan",
        `You were removed from ${clanName}`,
        {clanId}
      );

      return {success: true};
    } catch (error: unknown) {
      logger.error("Error in removeClanMember:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to remove member");
    }
  }
);

export const updateClanRole = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {clanId, memberUid, newRole} = request.data as {
      clanId: string;
      memberUid: string;
      newRole: "owner" | "admin" | "member";
    };
    const uid = request.auth.uid;

    if (!clanId || !memberUid || !newRole) {
      throw new HttpsError("invalid-argument", "Invalid parameters");
    }

    try {
      const clanRef = admin.firestore().collection("clans").doc(clanId);
      const clanDoc = await clanRef.get();

      if (!clanDoc.exists) {
        throw new HttpsError("not-found", "Clan not found");
      }

      // Only owner can update roles
      const ownerMemberRef = clanRef.collection("members").doc(uid);
      const ownerMemberDoc = await ownerMemberRef.get();

      if (
        !ownerMemberDoc.exists ||
        ownerMemberDoc.data()?.role !== "owner"
      ) {
        throw new HttpsError(
          "permission-denied",
          "Only owner can update roles"
        );
      }

      const memberRef = clanRef.collection("members").doc(memberUid);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        throw new HttpsError("not-found", "Member not found");
      }

      // If transferring ownership, update old owner to admin
      if (newRole === "owner") {
        await admin.firestore().runTransaction(async (transaction) => {
          transaction.update(ownerMemberRef, {role: "admin"});
          transaction.update(memberRef, {role: "owner"});
          transaction.update(clanRef, {ownerUid: memberUid});
        });
      } else {
        await memberRef.update({role: newRole});
      }

      return {success: true};
    } catch (error: unknown) {
      logger.error("Error in updateClanRole:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to update role");
    }
  }
);

export const updateClanDetails = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {clanId, updates} = request.data as {
      clanId: string;
      updates: {
        name?: string;
        description?: string;
        photoURL?: string;
        privacy?: string;
      };
    };
    const uid = request.auth.uid;

    if (!clanId || !updates) {
      throw new HttpsError("invalid-argument", "Invalid parameters");
    }

    try {
      const clanRef = admin.firestore().collection("clans").doc(clanId);
      const clanDoc = await clanRef.get();

      if (!clanDoc.exists) {
        throw new HttpsError("not-found", "Clan not found");
      }

      const memberRef = clanRef.collection("members").doc(uid);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        throw new HttpsError("permission-denied", "Not a clan member");
      }

      const memberData = memberDoc.data();
      if (memberData?.role !== "owner" && memberData?.role !== "admin") {
        throw new HttpsError("permission-denied", "Insufficient permissions");
      }

      const updateData: Record<string, string> = {};
      if (updates.name !== undefined) {
        updateData.name = updates.name.trim();
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description.trim();
      }
      if (updates.photoURL !== undefined) {
        updateData.photoURL = updates.photoURL;
      }
      if (updates.privacy !== undefined) updateData.privacy = updates.privacy;

      await clanRef.update(updateData);
      return {success: true};
    } catch (error: unknown) {
      logger.error("Error in updateClanDetails:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to update clan");
    }
  }
);

// ==================== RING STATS FUNCTION ====================

export const updateRingStats = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {dailyStats} = request.data as {
      dailyStats: {
        date: string; // yyyyMMdd format
        caloriesBurned: number;
        steps: number;
        workoutMinutes: number;
        goalCalories: number;
        goalSteps: number;
        goalMinutes: number;
      };
    };
    const uid = request.auth.uid;

    if (!dailyStats || !dailyStats.date) {
      throw new HttpsError("invalid-argument", "Invalid stats data");
    }

    try {
      const statsRef = admin
        .firestore()
        .collection("ringStats")
        .doc(uid)
        .collection("daily")
        .doc(dailyStats.date);

      await statsRef.set(
        {
          ...dailyStats,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );

      // Update user's stats summary
      const userRef = admin.firestore().collection("users").doc(uid);
      await userRef.set(
        {
          statsSummary: {
            caloriesBurnedToday: dailyStats.caloriesBurned,
            stepsToday: dailyStats.steps,
            workoutMinutesToday: dailyStats.workoutMinutes,
            ringsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        {merge: true}
      );

      return {success: true};
    } catch (error: unknown) {
      logger.error("Error in updateRingStats:", error);
      throw new HttpsError("internal", "Failed to update ring stats");
    }
  }
);

// ==================== FIRESTORE TRIGGERS ====================

// Trigger when friend request is created
export const onFriendRequestCreated = onDocumentCreated(
  {
    document: "friendRequests/{requestId}",
    region: "us-central1",
    database: "(default)",
  },
  async (event) => {
    const requestData = event.data?.data();
    if (!requestData || requestData.status !== "pending") return;

    const {fromUid, toUid} = requestData;

    try {
      // Get sender info
      const fromUserDoc = await admin
        .firestore()
        .collection("users")
        .doc(fromUid)
        .get();
      const fromUserData = fromUserDoc.data();
      const fromDisplayName = fromUserData?.displayName || "Someone";

      // Send FCM notification
      await sendFCMNotification(
        toUid,
        "New Friend Request",
        `${fromDisplayName} sent you a friend request`,
        {type: "FRIEND_REQUEST", fromUid}
      );

      // Create notification document
      await createNotification(
        toUid,
        "FRIEND_REQUEST",
        "New Friend Request",
        `${fromDisplayName} sent you a friend request`,
        {fromUid, friendRequestId: `${fromUid}_to_${toUid}`}
      );
    } catch (error) {
      logger.error("Error in onFriendRequestCreated:", error);
    }
  }
);

// Trigger when clan invite is created
export const onClanInviteCreated = onDocumentCreated(
  {
    document: "clanInvites/{inviteId}",
    region: "us-central1",
    database: "(default)",
  },
  async (event) => {
    const inviteData = event.data?.data();
    if (!inviteData || inviteData.status !== "pending") return;

    const {clanId, fromUid, toUid} = inviteData;

    try {
      // Get clan and sender info
      const clanDoc = await admin
        .firestore()
        .collection("clans")
        .doc(clanId)
        .get();
      const clanData = clanDoc.data();
      const clanName = clanData?.name || "Clan";

      const fromUserDoc = await admin
        .firestore()
        .collection("users")
        .doc(fromUid)
        .get();
      const fromUserData = fromUserDoc.data();
      const fromDisplayName = fromUserData?.displayName || "Someone";

      // Send FCM notification
      await sendFCMNotification(
        toUid,
        "Clan Invite",
        `${fromDisplayName} invited you to join ${clanName}`,
        {type: "CLAN_INVITE", clanId, fromUid}
      );

      // Create notification document
      await createNotification(
        toUid,
        "CLAN_INVITE",
        "Clan Invite",
        `${fromDisplayName} invited you to join ${clanName}`,
        {clanId, fromUid}
      );
    } catch (error) {
      logger.error("Error in onClanInviteCreated:", error);
    }
  }
);

// ==================== USER FUNCTIONS ====================

/**
 * Get user data by UID
 * Note: Client should prefer direct Firestore access for basic user data.
 * This function is primarily for cases requiring privacy checks or
 * profile data.
 * @param request - Callable function request
 * @return User data including displayName, email, photoURL, etc.
 */
export const getUser = onCall(
  {
    region: "us-central1",
    cors: true,
    // Rate limiting: max 100 invocations per minute per user
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {uid} = request.data as {uid: string};

    if (!uid) {
      throw new HttpsError("invalid-argument", "User ID is required");
    }

    try {
      const userRef = admin.firestore().collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      const currentUid = request.auth.uid;

      // Return public user data
      return {
        success: true,
        user: {
          uid: userDoc.id,
          displayName: userData?.displayName || "",
          email: userData?.email || "",
          photoURL: userData?.photoURL || "",
          usernameLower: userData?.usernameLower,
          createdAt: userData?.createdAt,
          privacy: userData?.privacy,
          // Only include profile if requesting own profile or if privacy allows
          profile: currentUid === uid ? userData?.profile : undefined,
        },
      };
    } catch (error: unknown) {
      logger.error("Error in getUser:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to get user");
    }
  }
);

/**
 * Get multiple users by UIDs
 * Note: Client should prefer direct Firestore access for basic user data.
 * This function is primarily for cases requiring privacy checks or
 * profile data. Batches requests efficiently to reduce function invocations.
 * @param request - Callable function request
 * @return Array of user data
 */
export const getUsers = onCall(
  {
    region: "us-central1",
    cors: true,
    // Rate limiting: max 20 invocations per minute per user
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {uids} = request.data as {uids: string[]};

    if (!uids || !Array.isArray(uids) || uids.length === 0) {
      throw new HttpsError("invalid-argument", "User IDs array is required");
    }

    // Limit batch size to prevent excessive resource usage
    if (uids.length > 50) {
      throw new HttpsError(
        "invalid-argument",
        "Maximum 50 users can be fetched at once"
      );
    }

    // Remove duplicates
    const uniqueUids = [...new Set(uids)];
    if (uniqueUids.length !== uids.length) {
      logger.log(
        `Removed ${uids.length - uniqueUids.length} duplicate UIDs`
      );
    }

    try {
      const currentUid = request.auth.uid;
      const usersRef = admin.firestore().collection("users");
      const userPromises = uids.map((uid) => usersRef.doc(uid).get());
      const userDocs = await Promise.all(userPromises);

      const users = userDocs
        .filter((doc) => doc.exists)
        .map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            displayName: data?.displayName || "",
            email: data?.email || "",
            photoURL: data?.photoURL || "",
            usernameLower: data?.usernameLower,
            createdAt: data?.createdAt,
            privacy: data?.privacy,
            // Only include profile if requesting own profile
            profile:
              currentUid === doc.id ? data?.profile : undefined,
          };
        });

      return {
        success: true,
        users,
      };
    } catch (error: unknown) {
      logger.error("Error in getUsers:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to get users");
    }
  }
);

/**
 * Search/list all users with pagination
 * Allows searching users by username or email, with pagination support
 * @param request - Callable function request
 * @return Paginated list of users
 */
export const searchAllUsers = onCall(
  {
    region: "us-central1",
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const {
      searchTerm,
      limit: limitCount = 50,
      lastDocId,
    } = request.data as {
      searchTerm?: string;
      limit?: number;
      lastDocId?: string;
    };

    if (limitCount > 100) {
      throw new HttpsError(
        "invalid-argument",
        "Maximum 100 users per request"
      );
    }

    try {
      const usersRef = admin.firestore().collection("users");
      let query = usersRef.orderBy("displayName").limit(limitCount);

      // If search term provided, filter by username or email
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        // Note: Firestore doesn't support OR queries directly
        // We'll search by usernameLower first (most common case)
        query = usersRef
          .where("usernameLower", ">=", searchLower)
          .where("usernameLower", "<=", searchLower + "\uf8ff")
          .orderBy("usernameLower")
          .limit(limitCount);
      }

      // Handle pagination
      if (lastDocId) {
        const lastDoc = await usersRef.doc(lastDocId).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      const usersSnap = await query.get();
      const currentUid = request.auth.uid;

      const users = usersSnap.docs
        .filter((doc) => doc.id !== currentUid) // Exclude current user
        .map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            displayName: data.displayName || "",
            email: data.email || "",
            photoURL: data.photoURL || "",
            usernameLower: data.usernameLower,
            createdAt: data.createdAt,
            // Don't include privacy or profile for list view
          };
        });

      const lastDoc =
        usersSnap.docs.length > 0 ?
          usersSnap.docs[usersSnap.docs.length - 1] :
          null;

      return {
        success: true,
        users,
        hasMore: usersSnap.docs.length === limitCount,
        lastDocId: lastDoc?.id,
      };
    } catch (error: unknown) {
      logger.error("Error in searchAllUsers:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to search users");
    }
  }
);
