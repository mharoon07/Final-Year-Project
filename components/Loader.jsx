import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { CircleFade } from "react-native-animated-spinkit";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const Loader = ({ visible, progress }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <CircleFade size={48} color="#4A90E2" />
      {progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={["#0061ff", "#60efff"]}
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  progressContainer: {
    marginTop: 16,
    width: width * 0.8,
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 16,
    fontFamily: "medium",
    color: "#fff",
  },
});

export default Loader;
