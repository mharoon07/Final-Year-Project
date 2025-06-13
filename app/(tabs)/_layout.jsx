import { View } from "react-native";
import React, { useState, useEffect } from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AntDesign from "@expo/vector-icons/AntDesign";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import Toast from "react-native-toast-message";
import SplashScreenGIF from "../../components/SplashScreenGIF"; 
import { LogBox } from 'react-native';   


const _layout = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);


  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        thin: require("./../../assets/fonts/RobotoSlab-Thin.ttf"),
        SemiBold: require("./../../assets/fonts/RobotoSlab-SemiBold.ttf"),
        bold: require("./../../assets/fonts/RobotoSlab-Bold.ttf"),
        black: require("./../../assets/fonts/RobotoSlab-Black.ttf"),
        GreyQo: require("./../../assets/fonts/GreyQo-Regular.ttf"),
        medium: require("./../../assets/fonts/Raleway-Medium.ttf"),
        regular: require("./../../assets/fonts/RobotoSlab-Regular.ttf"),
        Tregular: require("./../../assets/fonts/Tinos-Regular.ttf"),
        Brittany: require("./../../assets/fonts/BrittanySignature.ttf"),
      });
      setFontsLoaded(true);
    }

    loadFonts();
  }, []);

  if (!fontsLoaded || showSplash) {
    return <SplashScreenGIF onFinish={() => setShowSplash(false)} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor="rgba(255, 255, 255, 0)" />
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="Home"
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="Explore"
          options={{
            tabBarIcon: ({ color }) => (
              <AntDesign name="search" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="PostTypeSelectionScreen"
          options={{
            tabBarLabel: "",
            tabBarIcon: ({ color }) => (
              <AntDesign name="pluscircleo" size={34} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="Messages"
          options={{
            tabBarIcon: ({ color }) => (
              <AntDesign name="message1" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="Profile"
          options={{
            tabBarIcon: ({ color }) => (
              <AntDesign name="user" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
      <Toast />
    </View>
  );
};

export default _layout;
