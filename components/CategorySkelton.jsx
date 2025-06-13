import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons"; // Ensure this is installed
import Svg, { Rect } from "react-native-svg";
import SvgAnimatedLinearGradient from "react-native-svg-animated-linear-gradient";

const Categories = ({ search }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  };

  return (
    <View style={styles.skeletonContainer}>
      {[...Array(6).keys()].map((_, colIndex) => (
        <View style={styles.row} key={colIndex}>
          <SvgAnimatedLinearGradient
            key={colIndex}
            height={65}
            width={100}
            primaryColor="#ccc"
            secondaryColor="#e0e0e0"
            duration={1300}
            style={styles.skeleton}
          >
            <Rect x="25" y="0" rx="20" ry="20" width="55" height="55" />
          </SvgAnimatedLinearGradient>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
});

export default Categories;
