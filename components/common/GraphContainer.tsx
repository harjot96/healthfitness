import React, { ReactNode } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { graphStyles } from '../../utils/graphConfig';

interface GraphContainerProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: boolean;
  emptyMessage?: string;
  style?: any;
}

export const GraphContainer: React.FC<GraphContainerProps> = ({
  title,
  subtitle,
  children,
  loading = false,
  error = null,
  onRetry,
  empty = false,
  emptyMessage = 'No data available',
  style,
}) => {
  if (loading) {
    return (
      <View style={[graphStyles.container, styles.container, style]}>
        {title && <Text style={graphStyles.title}>{title}</Text>}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9B59B6" />
          <Text style={styles.loadingText}>Loading graph data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[graphStyles.container, styles.container, style]}>
        {title && <Text style={graphStyles.title}>{title}</Text>}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>{error}</Text>
          {onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (empty) {
    return (
      <View style={[graphStyles.container, styles.container, style]}>
        {title && <Text style={graphStyles.title}>{title}</Text>}
        <View style={styles.emptyContainer}>
          <Ionicons name="bar-chart-outline" size={64} color="#BDC3C7" />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[graphStyles.container, styles.container, style]}>
      {title && <Text style={graphStyles.title}>{title}</Text>}
      {subtitle && <Text style={graphStyles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#7F8C8D',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#9B59B6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
});
