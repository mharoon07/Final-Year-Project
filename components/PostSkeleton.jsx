import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Svg, { Rect, Circle } from "react-native-svg";
import SvgAnimatedLinearGradient from "react-native-svg-animated-linear-gradient";

const PostSkeleton = () => (
  <ScrollView
    contentContainerStyle={styles.container}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.skeletonContainer}>
      {[...Array(1).keys()].map((_, index) => (
        <View key={index} style={styles.skeletonWrapper}>
          <SvgAnimatedLinearGradient
            key={index}
            height={300}
            width="100%"
            duration={1300}
            primaryColor="#ccc"
            secondaryColor="white"
          >
            <Rect x="16" y="0" rx="20" ry="20" width="40" height="40" />
            <Rect x="64" y="10" rx="4" ry="4" width="100" height="20" />
            <Rect x="16" y="60" rx="4" ry="4" width="90%" height="150" />
            <Rect x="16" y="220" rx="4" ry="4" width="60%" height="20" />
            <Rect x="16" y="250" rx="4" ry="4" width="80%" height="20" />
            <Rect x="16" y="280" rx="4" ry="4" width="100" height="20" />
            <Rect x="276" y="280" rx="4" ry="4" width="60" height="20" />
          </SvgAnimatedLinearGradient>
        </View>
      ))}
    </View>
  </ScrollView>
);
export default PostSkeleton;
const styles = StyleSheet.create({
  skeletonWrapper: {
    backgroundColor: "#e0e0e0",
    paddingVertical: 16,
  },
});
