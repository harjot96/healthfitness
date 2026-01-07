import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoginForm } from '../../components/auth/LoginForm';
import { useAuth } from '../../context/AuthContext';
import { VideoBackground } from '../../components/common/VideoBackground';
import { AnimatedGradientBackground } from '../../components/common/AnimatedGradientBackground';

export default function LoginScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [useVideo, setUseVideo] = useState(false); // Set to true to use video background

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)');
    }
  }, [user, loading]);

  if (loading) {
    return null; // Or a loading spinner
  }

  // Option 1: Use animated gradient background (works immediately, no video needed)
  // Option 2: Use video background (uncomment and provide your video source)
  
  // To use video background:
  // 1. Add your video file to assets/videos/background.mp4
  // 2. Or use a remote URL: { uri: 'https://example.com/video.mp4' }
  // 3. Set useVideo to true
  const videoSource = {
    // Local file example:
    // uri: require('../../assets/videos/background.mp4'),
    // Remote URL example:
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  };

  return (
    <>
      {useVideo ? (
        <VideoBackground source={videoSource} overlayOpacity={0.5}>
          <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <LoginForm onNavigateToSignUp={() => router.push('/(auth)/signup')} />
          </View>
        </VideoBackground>
      ) : (
        <AnimatedGradientBackground>
          <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <LoginForm onNavigateToSignUp={() => router.push('/(auth)/signup')} />
          </View>
        </AnimatedGradientBackground>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 2,
  },
});

