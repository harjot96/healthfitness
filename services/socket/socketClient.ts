import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get Socket URL from environment or use default
// Remove /graphql suffix if present (legacy from GraphQL setup)
const rawUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const SOCKET_URL = rawUrl.replace(/\/graphql$/, '');

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to socket.io server
   */
  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No auth token available');
      }

      this.socket = io(SOCKET_URL, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.setupEventHandlers();

      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket initialization failed'));
          return;
        }

        this.socket.on('connect', () => {
          console.log('[Socket] Connected to server');
          this.reconnectAttempts = 0;
          resolve(this.socket!);
        });

        this.socket.on('connect_error', (error) => {
          console.error('[Socket] Connection error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('[Socket] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt', attemptNumber);
      this.reconnectAttempts = attemptNumber;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after', this.maxReconnectAttempts, 'attempts');
    });
  }

  /**
   * Disconnect from socket.io server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get the socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Emit an event
   */
  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('[Socket] Cannot emit event, socket not connected');
    }
  }

  /**
   * Listen to an event
   */
  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Update auth token and reconnect
   */
  async updateAuthToken(token: string) {
    if (this.socket) {
      this.disconnect();
    }
    await this.connect();
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
