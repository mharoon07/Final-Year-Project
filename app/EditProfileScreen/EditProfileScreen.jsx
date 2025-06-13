import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  BackHandler,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { db, auth } from "../../Firebase";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import Loader from "../../components/Loader";
import axios from "axios";


const CLOUDINARY_CLOUD_NAME = ""; 
const CLOUDINARY_UPLOAD_PRESET = "";
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const EditProfileScreen = () => {
  const params = useLocalSearchParams();
  const userData = JSON.parse(params.data);
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const fetchUserData = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No user is currently logged in.");
      setLoading(false);
      return;
    }
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setName(data.name || "");
        setUsername(data.username || "");
        setProfilePicture(data.profilePicture || "");
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      Alert.alert("Error", "Failed to fetch user data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserData();

      const onBackPress = () => {
        Alert.alert(
          "Confirm",
          "Are you sure you want to go back? Unsaved changes will be lost.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Yes", onPress: () => router.back() },
          ],
          { cancelable: false }
        );
        return true;
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () =>
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [])
  );

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Error", "Gallery permission is required to select images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setImageUploading(true);
        await uploadImage(uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    } finally {
      setImageUploading(false);
    }
  };

  const uploadImage = async (uri) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No user is currently logged in.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: uri,
        type: "image/jpeg",
        name: `profile_${user.uid}_${Date.now()}.jpg`,
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await axios.post(CLOUDINARY_API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.secure_url) {
        setProfilePicture(response.data.secure_url);
      } else {
        throw new Error("Failed to upload image to Cloudinary");
      }
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No user is currently logged in.");
      setLoading(false);
      return;
    }
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        name,
        username,
        profilePicture,
      });
      router.push("/Profile");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Update Profile</Text>
      </View>
      <View style={styles.profileImageContainer}>
        {profilePicture && profilePicture !== "null" && !imageUploading ? (
          <Image source={{ uri: profilePicture }} style={styles.profileImage} />
        ) : (
          <Image
            source={require("../../assets/images/profile-icon.png")}
            style={styles.profileImage}
          />
        )}
        {imageUploading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>
      <TouchableOpacity
        onPress={pickImage}
        style={styles.changePictureButton}
        activeOpacity={0.7}
      >
        <Text style={styles.changePictureText}>Change Profile Picture</Text>
      </TouchableOpacity>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your username"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
        />
      </View>
      <TouchableOpacity
        style={styles.updateButton}
        onPress={handleUpdateProfile}
        activeOpacity={0.7}
      >
        <Text style={styles.updateButtonText}>Update Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 12,
  },
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#e0e0e0",
  },
  loadingOverlay: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  changePictureButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 24,
    elevation: 2,
  },
  changePictureText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  inputContainer: {
    marginBottom: 20,
    width: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fff",
    borderRadius: 4,
    elevation: 1,
  },
  updateButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default EditProfileScreen;