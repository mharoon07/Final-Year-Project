import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { Input, Button, Icon } from "react-native-elements";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "./../../Firebase";
import { useRouter } from "expo-router";
import { CircleFade } from "react-native-animated-spinkit";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const requestNotificationPermissions = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.log("Push notifications permission denied");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      return false;
    }
  };

  // Update FCM token in Firestore
  const updateFCMToken = async (userId) => {
    try {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        console.warn("No notification permissions, skipping FCM token update");
        return;
      }
      const token = await messaging().getToken();
      console.log("FCM Token:", token);
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { fcmToken: token });
      console.log("FCM token updated in Firestore for user:", userId);
    } catch (error) {
      console.error("Error updating FCM token:", error);
    }
  };

  // Handle token refresh
  useEffect(() => {
    const unsubscribe = messaging().onTokenRefresh(async (token) => {
      console.log("FCM Token refreshed:", token);
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userDocRef, { fcmToken: token });
        console.log("Refreshed FCM token updated in Firestore");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      if (user.emailVerified) {
        // Update FCM token after successful login
        await updateFCMToken(user.uid);
        setLoading(false);
        router.replace("/Profile");
      } else {
        setLoading(false);
        Alert.alert("Verification Required", "Please verify your email before logging in.");
        await signOut(auth);
      }
    } catch (err) {
      setLoading(false);
      const errorMessage = err.code === "auth/invalid-email" || err.code === "auth/wrong-password"
        ? "Invalid Email or Password"
        : "Login Failed. Please try again.";
      setError(errorMessage);
      Alert.alert("Login Error", errorMessage);
      await signOut(auth);
    }
  };

  const navigateToSignup = () => {
    router.replace("/Signup/Signup");
  };

  const navigateToForgot = () => {
    router.replace("/ForgotPassword/ForgotPassword");
  };

  const isDisabled = !email || !password;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <CircleFade size={48} color="#4A90E2" />
      </View>
    );
  }
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollViewContainer}
    >
      <View style={styles.container}>
        {/* Blue Background */}
        <View style={styles.backgroundContainer}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
          />
          <Text style={styles.title}>Login to continue</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <Input
            placeholder="abc@abc.com"
            label="Email"
            leftIcon={<Icon name="email" size={24} color="black" />}
            onChangeText={(value) => setEmail(value)}
            value={email}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={styles.inputContainer}
            inputStyle={styles.inputStyle}
          />
          <Input
            placeholder="*******"
            label="Password"
            leftIcon={<Icon name="lock" size={24} color="black" />}
            onChangeText={(value) => setPassword(value)}
            value={password}
            secureTextEntry
            autoCapitalize="none"
            containerStyle={styles.inputContainer}
            inputStyle={styles.inputStyle}
          />
          <Button
            title="Login"
            onPress={handleLogin}
            buttonStyle={styles.button}
            disabled={isDisabled || loading}
          />
          
          <TouchableOpacity onPress={navigateToForgot}>
            <Text style={styles.toggle}>Forgot Password?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToSignup}>
            <Text style={styles.toggle}>Need an account? Signup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollViewContainer: {
    flexGrow: 1, // Changed from flexGrow: 3 to 1 to avoid unnecessary extra space
  },
  backgroundContainer: {
    height: 250,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logo: {
    width: 80,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontFamily: "medium",
    color: "#FFFFFF",
    marginBottom: 23,
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 10,
    marginTop: -50,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputStyle: {
    fontSize: 14,
  },
  button: {
    backgroundColor: "#004AAD",
    paddingVertical: 12,
    borderRadius: 5,
  },
  toggle: {
    textAlign: "center",
    marginTop: 15,
    color: "#004AAD",
    textDecorationLine: "underline",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
    backgroundColor: "#F5F5F5", // Match the main container background
  },
});

export default Login;