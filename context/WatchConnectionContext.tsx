import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { watchConnectivityService } from '../services/watch/WatchConnectivityService';
import { useAuth } from './AuthContext';

interface WatchConnectionContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  checkConnection: () => Promise<void>;
  connectWatch: () => Promise<boolean>;
  disconnectWatch: () => Promise<void>;
  lastConnectedAt: Date | null;
}

const WatchConnectionContext = createContext<WatchConnectionContextType | undefined>(undefined);

const WATCH_CONNECTION_KEY = '@watch_connection_status';
const WATCH_CONNECTED_AT_KEY = '@watch_connected_at';

export const WatchConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastConnectedAt, setLastConnectedAt] = useState<Date | null>(null);

  // Load saved connection status on mount
  useEffect(() => {
    if (user) {
      loadConnectionStatus();
    } else {
      setIsConnected(false);
      setLastConnectedAt(null);
    }
  }, [user]);

  // Periodically check connection status if connected
  useEffect(() => {
    if (!isConnected || !user) return;

    const checkInterval = setInterval(() => {
      checkConnection();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInterval);
  }, [isConnected, user]);

  const loadConnectionStatus = async () => {
    try {
      const savedStatus = await AsyncStorage.getItem(WATCH_CONNECTION_KEY);
      const savedDate = await AsyncStorage.getItem(WATCH_CONNECTED_AT_KEY);
      
      if (savedStatus === 'connected') {
        setIsConnected(true);
        if (savedDate) {
          setLastConnectedAt(new Date(savedDate));
        }
        // Verify actual connection
        await checkConnection();
      } else {
        setIsConnected(false);
        setLastConnectedAt(null);
      }
    } catch (error) {
      console.error('[WatchConnection] Error loading connection status:', error);
    }
  };

  const checkConnection = useCallback(async () => {
    if (Platform.OS !== 'ios' || !user) {
      console.log('[WatchConnection] Not iOS or no user - connection unavailable');
      setIsConnected(false);
      return;
    }

    try {
      console.log('[WatchConnection] Checking watch reachability...');
      const isReachable = await watchConnectivityService.isWatchReachable();
      console.log('[WatchConnection] Watch reachable:', isReachable);
      
      if (isReachable) {
        setIsConnected(true);
        setConnectionError(null);
        // Update saved status
        await AsyncStorage.setItem(WATCH_CONNECTION_KEY, 'connected');
        if (!lastConnectedAt) {
          const now = new Date().toISOString();
          await AsyncStorage.setItem(WATCH_CONNECTED_AT_KEY, now);
          setLastConnectedAt(new Date(now));
        }
        console.log('[WatchConnection] ✅ Watch is connected and reachable');
      } else {
        // Watch might be disconnected, but keep saved status
        // Only update if we're sure it's disconnected
        setIsConnected(false);
        console.log('[WatchConnection] ⚠️ Watch is not reachable');
      }
    } catch (error: any) {
      console.error('[WatchConnection] ❌ Error checking connection:', error);
      console.error('[WatchConnection] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      setConnectionError(error.message || 'Failed to check watch connection');
      setIsConnected(false);
    }
  }, [user, lastConnectedAt]);

  const connectWatch = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios' || !user) {
      const errorMsg = Platform.OS !== 'ios' 
        ? 'Watch connection is only available on iOS devices. Simulators are not supported.'
        : 'User not authenticated';
      console.log('[WatchConnection]', errorMsg);
      setConnectionError(errorMsg);
      return false;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      console.log('[WatchConnection] ===== CONNECTION ATTEMPT STARTED =====');
      console.log('[WatchConnection] User:', user.uid);
      
      // Check if watch is reachable
      console.log('[WatchConnection] Checking if watch is reachable...');
      const isReachable = await watchConnectivityService.isWatchReachable();
      console.log('[WatchConnection] Watch reachable result:', isReachable);
      
      if (isReachable) {
        // Send auth status to watch to establish connection
        console.log('[WatchConnection] Sending auth status to watch...');
        const authSent = await watchConnectivityService.sendUserAuthStatus(user.uid, user.email);
        console.log('[WatchConnection] Auth status sent:', authSent);
        
        // Save connection status
        const now = new Date().toISOString();
        await AsyncStorage.setItem(WATCH_CONNECTION_KEY, 'connected');
        await AsyncStorage.setItem(WATCH_CONNECTED_AT_KEY, now);
        
        setIsConnected(true);
        setLastConnectedAt(new Date(now));
        setConnectionError(null);
        
        console.log('[WatchConnection] ✅ Watch connected successfully');
        console.log('[WatchConnection] ===== CONNECTION SUCCESSFUL =====');
        return true;
      } else {
        const errorMsg = 'Apple Watch is not reachable. Please ensure:\n' +
          '• Your watch is paired with your iPhone\n' +
          '• Your watch is nearby and unlocked\n' +
          '• The Health & Fitness Watch app is installed\n' +
          '• You are testing on REAL DEVICES (not simulators)';
        console.log('[WatchConnection] ❌', errorMsg);
        setConnectionError(errorMsg);
        setIsConnected(false);
        return false;
      }
    } catch (error: any) {
      console.error('[WatchConnection] ❌ Error connecting watch:', error);
      console.error('[WatchConnection] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      const errorMsg = error.message || 'Failed to connect to Apple Watch. Make sure you are using real devices, not simulators.';
      setConnectionError(errorMsg);
      setIsConnected(false);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [user]);

  const disconnectWatch = useCallback(async () => {
    try {
      // Remove saved connection status
      await AsyncStorage.removeItem(WATCH_CONNECTION_KEY);
      await AsyncStorage.removeItem(WATCH_CONNECTED_AT_KEY);
      
      // Notify watch that user disconnected
      if (Platform.OS === 'ios') {
        await watchConnectivityService.sendUserSignedOut();
      }
      
      setIsConnected(false);
      setLastConnectedAt(null);
      setConnectionError(null);
      
      console.log('[WatchConnection] Watch disconnected');
    } catch (error: any) {
      console.error('[WatchConnection] Error disconnecting watch:', error);
      setConnectionError(error.message || 'Failed to disconnect watch');
    }
  }, []);

  return (
    <WatchConnectionContext.Provider
      value={{
        isConnected,
        isConnecting,
        connectionError,
        checkConnection,
        connectWatch,
        disconnectWatch,
        lastConnectedAt,
      }}
    >
      {children}
    </WatchConnectionContext.Provider>
  );
};

export const useWatchConnection = () => {
  const context = useContext(WatchConnectionContext);
  if (context === undefined) {
    throw new Error('useWatchConnection must be used within a WatchConnectionProvider');
  }
  return context;
};

