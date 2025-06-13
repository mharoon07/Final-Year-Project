import React, { useEffect, useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";

const SplashScreenGIF = ({ onFinish }) => {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
        setTimeout(() => {
          setAppIsReady(true);
        }, 1000); 
      } catch (e) {
        console.warn(e);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
      onFinish && onFinish();
    }
  }, [appIsReady]);

  return (
    <View style={styles.container}>
      <Image source={require("../assets/images/splash-animated.gif")} style={styles.gif} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  gif: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
});

export default SplashScreenGIF;
