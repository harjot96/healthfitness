import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

interface VideoBackgroundProps {
  source: { uri: string } | number;
  overlayOpacity?: number;
  children?: React.ReactNode;
}

const { width, height } = Dimensions.get('window');

export const VideoBackground: React.FC<VideoBackgroundProps> = ({
  source,
  overlayOpacity = 0.4,
  children,
}) => {
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    // Start video playback when component mounts
    videoRef.current?.playAsync();
    
    // Set video to loop
    videoRef.current?.setIsLoopingAsync(true);
  }, []);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={source}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
          if (status.isLoaded && !status.isPlaying && status.didJustFinish) {
            // Restart video if it finishes (backup for looping)
            videoRef.current?.replayAsync();
          }
        }}
      />
      <View style={[styles.overlay, { backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }]} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    zIndex: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    zIndex: 1,
  },
});



