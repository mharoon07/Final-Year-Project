import React from "react";
import { StyleSheet } from "react-native";
import Svg, { Rect } from "react-native-svg";
import SvgAnimatedLinearGradient from "react-native-svg-animated-linear-gradient";

const BannerSkeleton = () => (
  <SvgAnimatedLinearGradient
    height={142}
    width={482}
    primaryColor="#ccc"
    secondaryColor="#e0e0e0"
    duration={1300}
    style={styles.skeleton}
  >
    <Rect x="5" y="0" rx="20" ry="20" width="282" height="142" />
    <Rect x="292" y="0" rx="20" ry="20" width="82" height="142" />
  </SvgAnimatedLinearGradient>
);

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: 20,
    marginVertical: 12,
  },
});

export default BannerSkeleton;
