import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import { useRouter } from "expo-router";

const PostTypeSelectionScreen = () => {
  const navigation = useNavigation();
  const router = useRouter();

  const isUserLoggedIn = () => {
    const auth = getAuth();
    return auth.currentUser !== null;
  };

  useEffect(() => {
    if (!isUserLoggedIn()) {
      Alert.alert("Not Logged In", "You need to log in to post.", [
        { text: "Cancel", style: "cancel" },
        { text: "Log In", onPress: () => router.push("/(tabs)/Profile") },
      ]);
    }
  }, []);

  const handleSelection = (postType) => {
    if (!isUserLoggedIn()) {
      Alert.alert("Not Logged In", "You need to log in to post.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log In",
          onPress: () => router.push("/(tabs)/Profile"),
        },
      ]);

      return;
    }

    router.push(`/Uploadpost/Uploadpost?postType=${postType}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>What would you like to exchange?</Text>

        <View style={styles.cardsContainer}>
          <TouchableOpacity
            onPress={() => handleSelection("typeItem")}
            style={styles.card}
          >
            <View style={styles.iconContainer}>
              <Image
                source={require("../../assets/images/item.png")}
                style={styles.icon}
                defaultSource={{
                  uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                }}
              />
            </View>
            <Text style={styles.cardTitle}>Item</Text>
            <Text style={styles.cardDescription}>
              Exchange physical goods with others in your community
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSelection("typeService")}
            style={styles.card}
          >
            <View style={[styles.iconContainer, styles.serviceIconContainer]}>
              <Image
                source={require("../../assets/images/service.png")}
                style={styles.icon}
                // If you don't have the image, replace with a colored circle
                defaultSource={{
                  uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==",
                }}
              />
            </View>
            <Text style={styles.cardTitle}>Service</Text>
            <Text style={styles.cardDescription}>
              Offer your skills and expertise to help others
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f7",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 40,
    textAlign: "center",
    color: "#333",
  },
  cardsContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    width: "45%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 180,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  serviceIconContainer: {
    backgroundColor: "#e0fef2",
  },
  icon: {
    width: 32,
    height: 32,
    tintColor: "#0369a1",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111",
  },
  cardDescription: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    lineHeight: 20,
  },
  backButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#666",
  },
  backButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default PostTypeSelectionScreen;
