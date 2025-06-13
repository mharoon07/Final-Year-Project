import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";

const Header = ({ userName, profilePicture, appName }) => {
  const router = useRouter();
  const placeholders = [
    "Search items, services...",
    "Find your desired item...",
    "What are you looking for?",
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prevIndex) => (prevIndex + 1) % placeholders.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <View>
      <View style={styles.headerContainer}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginLeft: 12,
            marginTop: 20,
          }}
        >
          <View>
            <Text style={styles.appName}>{appName}</Text>
          </View>

          <TouchableOpacity onPress={() => router.push("/Profile")}>
            <View style={styles.profileInfo}>
              {profilePicture && profilePicture != "null" ? (
                <Image
                  source={{ uri: profilePicture }}
                  style={styles.profilePicture}
                />
              ) : (
                <Image
                  source={require("../assets/images/profile-icon.png")}
                  style={styles.profilePicture}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.searchIcon}
          onPress={() => router.push("/Explore")}
        >
          <View style={styles.container}>
            <TextInput
              style={styles.searchBar}
              placeholder={placeholders[placeholderIndex]}
              editable={false}
              pointerEvents="none"
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "coloumn",
    // alignItems: 'center',
    justifyContent: "space-between",
    paddingTop: 10,
    backgroundColor: "#075E54",
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    marginBottom: 10,
    // paddingHorizontal: 3,
    height: 150,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  appName: {
    color: "#fff",
    fontSize: 29,
    textAlign: "center",
    fontFamily: "medium",
  },
  userInfo: {
    paddingBottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 10,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    right: 20,
  },
  profilePicture: {
    width: 45,
    height: 45,
    borderRadius: 40,
    marginTop: 14,
  },
  userName: {
    fontSize: 14,
    color: "#ffffff",
    fontFamily: "medium",
  },
  welcome: {
    fontSize: 10,
    color: "#ffffff",
    fontFamily: "medium",
  },
  searchBar: {
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 20,
    width: 300,
    textAlign: "center",
    marginVertical: 13,
    fontSize: 13,
  },
  searchIcon: {
    padding: 5,
    left: 20,
  },
});
