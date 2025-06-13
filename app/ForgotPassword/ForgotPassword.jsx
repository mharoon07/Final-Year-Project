import React, { useState } from "react";
import {
  View,
  TextInput,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { useRouter } from "expo-router";
import { Input, Button, Icon } from "react-native-elements";
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const arrow = "->";

  const handlePasswordReset = () => {
    const auth = getAuth();
    sendPasswordResetEmail(auth, email)
      .then(() => {
        Alert.alert("Success", "Password reset email sent!");
        router.replace("/Login/Login");
      })
      .catch((error) => {
        const errorMessage = error.message;
        Alert.alert("Error", errorMessage);
      });
  };
  const navigateToLogin = () => {
    router.replace("/Login/Login");
  };
  const isDisabled = !email;
  return (
    <View style={{ flex: 1, alignItems: "center", marginTop: 145 }}>
      <Text style={{ fontSize: 20, fontFamily: "bold" }}>Reset Password</Text>
      <Text
        style={{
          marginVertical: 33,
          textAlign: "center",
          paddingHorizontal: 4,
          fontSize: 12,
          color: "grey",
        }}
      >
        Please enter the email address that you used to register, and we will
        send you a link to reset your password via Email.
      </Text>
      <Input
        placeholder="Enter your email"
        label="Email"
        leftIcon={<Icon name="email" type="material" size={18} color="black" />}
        onChangeText={(value) => setEmail(value)}
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ fontSize: 12 }}
      />
      <Button
        title="Send Email"
        onPress={handlePasswordReset}
        style={{ padding: 22 }}
        containerStyle={{
          width: 200,
        }}
        buttonStyle={{
          backgroundColor: "rgba(92, 99,216, 1)",
          borderColor: "transparent",
          borderWidth: 0,
          borderRadius: 5,
        }}
        disabled={isDisabled}
      />

      {/* <Button title="Return to Sign In" onPress={router.replace('/Login/Login')} /> */}
      <TouchableOpacity onPress={navigateToLogin}>
        <Text style={{ padding: 22, color: "blue" }}>
          Return to Login{arrow}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
