import AsyncStorage from '@react-native-async-storage/async-storage';

// Get API base URL from environment or use default
// Remove /graphql suffix if present (legacy from GraphQL setup)
const rawUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const API_BASE_URL = rawUrl.replace(/\/graphql$/, '');

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * REST API Client
 * Handles all HTTP requests to the backend API
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Get auth token from storage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Update auth token in storage
   */
  async updateAuthToken(token: string | null): Promise<void> {
    try {
      if (token) {
        await AsyncStorage.setItem('authToken', token);
      } else {
        await AsyncStorage.removeItem('authToken');
      }
    } catch (error) {
      console.error('Error updating auth token:', error);
    }
  }

  /**
   * Get refresh token from storage
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('refreshToken');
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Update refresh token in storage
   */
  async updateRefreshToken(token: string | null): Promise<void> {
    try {
      if (token) {
        await AsyncStorage.setItem('refreshToken', token);
      } else {
        await AsyncStorage.removeItem('refreshToken');
      }
    } catch (error) {
      console.error('Error updating refresh token:', error);
    }
  }

  /**
   * Clear all tokens
   */
  async clearTokens(): Promise<void> {
    await this.updateAuthToken(null);
    await this.updateRefreshToken(null);
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;
    
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    // Add auth token if not skipping auth
    if (!skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      const data = await response.json();

      // Handle non-2xx responses
      if (!response.ok) {
        // Try to refresh token if 401 and we have a refresh token
        if (response.status === 401 && !skipAuth) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Retry the request with new token
            return this.request<T>(endpoint, options);
          }
        }

        const errorMessage = data.message || data.error || `Request failed with status ${response.status}`;
        const errorCode = data.code || 'UNKNOWN_ERROR';
        throw new ApiError(errorMessage, response.status, errorCode, data);
      }

      // Return data from success response
      return data.data || data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Network request failed',
        0,
        'NETWORK_ERROR',
        null
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await this.clearTokens();
        return false;
      }

      const data = await response.json();
      const result = data.data || data;

      if (result.token && result.refreshToken) {
        await this.updateAuthToken(result.token);
        await this.updateRefreshToken(result.refreshToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      await this.clearTokens();
      return false;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public data: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export helper functions for backward compatibility
export const updateAuthToken = (token: string | null) => apiClient.updateAuthToken(token);
export const getAuthToken = () => apiClient.getAuthToken();
