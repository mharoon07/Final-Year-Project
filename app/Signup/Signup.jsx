import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
} from "react-native";
import { auth, db } from "../../Firebase";
import { Input, Button, Icon } from "react-native-elements";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { CircleFade } from "react-native-animated-spinkit";

const { height } = Dimensions.get("window");

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repassword, setRepassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [number, setnumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSignup = async () => {
    setLoading(true);
    if (password !== repassword) {
      setError("Passwords do not match");
      Alert.alert("Error", "Passwords do not match");
      setLoading(false);
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name,
        username,
        number,
        password,
        email,
        profilePicture: null,
        fcmToken: null,
        createdAt: new Date(),
      });
      await sendEmailVerification(user);
      setLoading(false);
      Alert.alert(
        "Success",
        "Verification email sent. Please check your inbox."
      );
      setEmail("");
      setPassword("");
      setRepassword("");
      router.replace("/Login/Login");
    } catch (err) {
      setLoading(false);
      setError("Error during signup");
      Alert.alert(err);
      console.log(err);
    }
  };

  const navigateToLogin = () => {
    router.replace("/Login/Login");
  };
  const isDisabled =
    !name || !username || !email || !number || !password || !repassword;

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          paddingStart: 4,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircleFade size={48} color="#000" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollViewContainer}
    >
      {/* Blue Background */}
      <View style={styles.backgroundContainer}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
        />
        <Text style={styles.title}>Create an account</Text>
      </View>

      {/* Form Section */}
      <View style={styles.formContainer}>
        <Input
          placeholder="Name"
          leftIcon={
            <Icon name="person" type="material" size={24} color="black" />
          }
          onChangeText={(value) => setName(value)}
          value={name}
          containerStyle={styles.inputContainer}
          inputStyle={styles.inputStyle}
        />
        <Input
          placeholder="Username"
          leftIcon={
            <Icon
              name="account-circle"
              type="material"
              size={24}
              color="black"
            />
          }
          onChangeText={(value) => setUsername(value)}
          value={username}
          autoCapitalize="none"
          containerStyle={styles.inputContainer}
          inputStyle={styles.inputStyle}
        />
        <Input
          placeholder="abc@abc.com"
          leftIcon={
            <Icon name="email" type="material" size={24} color="black" />
          }
          onChangeText={(value) => setEmail(value)}
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
          containerStyle={styles.inputContainer}
          inputStyle={styles.inputStyle}
        />
        <Input
          placeholder="+923*********"
          leftIcon={
            <Icon name="phone" type="material" size={24} color="black" />
          }
          onChangeText={(value) => setnumber(value)}
          value={number}
          keyboardType="phone-pad"
          containerStyle={styles.inputContainer}
          inputStyle={styles.inputStyle}
        />
        <Input
          placeholder="*********"
          leftIcon={
            <Icon name="lock" type="material" size={24} color="black" />
          }
          onChangeText={(value) => setPassword(value)}
          value={password}
          secureTextEntry
          autoCapitalize="none"
          containerStyle={styles.inputContainer}
          inputStyle={styles.inputStyle}
        />
        <Input
          placeholder="Re-enter Password"
          leftIcon={
            <Icon name="lock" type="material" size={24} color="black" />
          }
          onChangeText={(value) => setRepassword(value)}
          value={repassword}
          secureTextEntry
          autoCapitalize="none"
          containerStyle={styles.inputContainer}
          inputStyle={styles.inputStyle}
        />
        <Button
          title="Sign Up"
          onPress={handleSignup}
          buttonStyle={styles.button}
          disabled={isDisabled}
        />
        <TouchableOpacity onPress={navigateToLogin}>
          <Text style={styles.toggleText}>Already have an account? Login</Text>
        </TouchableOpacity>
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
    flexGrow: 1,
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
  toggleText: {
    textAlign: "center",
    marginTop: 15,
    color: "#004AAD",
    textDecorationLine: "underline",
  },
});

export default Signup;
