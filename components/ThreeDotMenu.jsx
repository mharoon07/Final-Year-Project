import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../Firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "expo-router";
import Login from "../app/Login/Login";
import Entypo from "@expo/vector-icons/Entypo";

const ThreeDotMenu = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();
  const handleLogout = async () => {
    // setLoading(true);
    try {
      console.log(auth.currentUser);
      await signOut(auth);
      await AsyncStorage.removeItem("userDetails");
      router.replace("/Home");
    } catch (error) {
      console.log("Error", "Failed to logout." + error);
    } finally {
      //   setLoading(false);
    }
  };
  const navigate = async () => {
   router.push('/3Dmodel');
  };

  return (
    <View style={styles.container}>
      {/* 3-Dot Button */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.dotsButton}
      >
        <Icon name="more-vert" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>

            <TouchableOpacity style={styles.menuItem} onPress={() => { }}>

              {/* <Text style={styles.menuText}>3D Models</Text> */}

            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.menuItem} onPress={() => { }}>
              <Text style={styles.menuText}>Test Screen</Text>
            </TouchableOpacity> */}
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={styles.menuText}>Logout</Text>
              <Entypo name="log-out" size={20} color="black" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    marginRight: 12,
    marginTop: 39,
  },
  dotsButton: {
    position: "absolute",
    top: 20,
    zIndex: 10,
    padding: 10,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 10,
    width: 150,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",

  },
  menuText: {
    marginLeft: 20,
    marginRight: 10,
    fontSize: 16,
    color: "black",
  },
});

export default ThreeDotMenu;
