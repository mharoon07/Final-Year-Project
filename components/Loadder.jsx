import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";
const Loader = ({ visible = true }) => {
  const rotateValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateValue]);
  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <Animated.Image
        source={require("./../assets/images/icon.png")}
        style={[styles.logo, { transform: [{ rotate }] }]}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 134,
    backgroundColor: "rgba(0, 0, 0, 0)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  logo: {
    width: 60,
    height: 50,
  },
});

export default Loader;
