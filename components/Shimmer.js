
import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";

const Shimmer = ({ style, children }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100], // Adjust based on element width
  });

  return (
    <View style={[style, styles.shimmerContainer]}>
      <View style={StyleSheet.absoluteFill}>
        {children}
      </View>
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX }] },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  shimmerContainer: {
    overflow: "hidden",
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    width: 50, // Width of the shimmer effect
  },
});

export default Shimmer;