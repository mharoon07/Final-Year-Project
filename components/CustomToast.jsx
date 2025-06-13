import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');

const CustomToast = ({ message, visible, onHide }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current; // Initially hidden above the screen

  useEffect(() => {
    if (visible) {
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: 0, // Slide to the top (visible)
        duration: 500, // Duration of the animation
        useNativeDriver: true,
      }).start();

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        onHide(); // Trigger onHide callback to hide the toast
      }, 3000);

      // Clear timeout if the component unmounts
      return () => clearTimeout(timer);
    } else {
      // Slide up animation (hide the toast)
      Animated.timing(slideAnim, {
        toValue: -100, // Hide it above the screen
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity onPress={onHide}>
        <Text style={styles.toastText}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0, // Stick to the top of the screen
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Semi-transparent background
    paddingVertical: 15,
    paddingHorizontal: 20,
    zIndex: 1000, // Ensure it's on top of other UI elements
    width: width,
  },
  toastText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default CustomToast;
