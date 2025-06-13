import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Rect, Circle } from 'react-native-svg';
import SvgAnimatedLinearGradient from 'react-native-svg-animated-linear-gradient';

const SkeletonHeader = () => {
  return (
    <View style={styles.headerContainer}>
      <SvgAnimatedLinearGradient
        width="100%"
        height="100%"
        duration={1300}
        primaryColor="#ccc"
        secondaryColor="white"
      >

        <Rect x="5%" y="10%" rx="14" ry="4" width="150" height="25" />
        

        <View style={styles.userInfo}>

          {/* <Rect x="10%" y="50%" rx="20" ry="20" width="40" height="40" /> */}


          {/* <Rect x="25%" y="50%" rx="4" ry="4" width="80" height="15" /> */}


          <Rect x="15%" y="65%" rx="24" ry="7" width="240" height="25" />

          <Circle cx="90%" cy="24%" r="22" />
        </View>
      </SvgAnimatedLinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    height: 190,
    paddingTop: 50,
    overflow: 'hidden', // This is important to make sure the gradient doesn't overflow the container
  },
  userInfo: {
    width: '100%',
    justifyContent: 'space-between',
    // paddingHorizontal: 20,
  },
});

export default SkeletonHeader;
