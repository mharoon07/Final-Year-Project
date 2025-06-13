import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
  getFirestore,
  addDoc,
} from "firebase/firestore";
import { auth } from "./../../Firebase";
import { useRouter } from "expo-router";
import { CircleFade } from "react-native-animated-spinkit";
import { useFocusEffect } from "@react-navigation/native";

const UserListScreen = () => {
  const [users, setUsers] = useState([]);
  const [waiting, setWaiting] = useState(false);
  const router = useRouter();
  const firestore = getFirestore();
  const currentUserId = auth.currentUser?.uid;

  const fetchChatsAndUsers = useCallback(async () => {
    if (!currentUserId) return;

    setWaiting(true);

    try {
      const chatQuery = query(
        collection(firestore, "chats"),
        where("userIds", "array-contains", currentUserId)
      );
      const chatSnapshot = await getDocs(chatQuery);

      const userIdsSet = new Set();
      const chatMap = new Map();

      chatSnapshot.forEach((doc) => {
        const chat = doc.data();
        const otherUserId = chat.userIds.find((id) => id !== currentUserId);
        if (otherUserId) {
          userIdsSet.add(otherUserId);
          chatMap.set(otherUserId, {
            chatId: doc.id,
            lastMessage: chat.lastMessage || "No message yet",
            timestamp: chat.timestamp,
          });
        }
      });

      const userIds = Array.from(userIdsSet);

      const fetchUserBatches = async (ids) => {
        const batches = [];
        while (ids.length) {
          const batch = ids.splice(0, 10);
          const q = query(
            collection(firestore, "users"),
            where("__name__", "in", batch)
          );
          const snapshot = await getDocs(q);
          batches.push(
            ...snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          );
        }
        return batches;
      };

      const fetchedUsers = await fetchUserBatches([...userIds]);

      const mergedUsers = fetchedUsers.map((user) => ({
        ...user,
        lastMessage: chatMap.get(user.id)?.lastMessage || "No message yet",
        timestamp: chatMap.get(user.id)?.timestamp || null,
      }));

      mergedUsers.sort(
        (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
      );

      setUsers(mergedUsers);
    } catch (error) {
      console.error("Error fetching chat users: ", error);
    } finally {
      setWaiting(false);
    }
  }, [currentUserId, firestore]);

  useFocusEffect(
    useCallback(() => {
      fetchChatsAndUsers();
    }, [fetchChatsAndUsers])
  );

  const startChat = async (selectedUserId) => {
    if (!currentUserId) return;
    setWaiting(true);
    try {
      const chatQuery = query(
        collection(firestore, "chats"),
        where("userIds", "array-contains", currentUserId)
      );
      const chatSnapshot = await getDocs(chatQuery);
      let chatId = null;
      let isNewChat = false;

      chatSnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.userIds.includes(selectedUserId)) {
          chatId = doc.id;
        }
      });

      if (!chatId) {
        const newChatRef = await addDoc(collection(firestore, "chats"), {
          userIds: [currentUserId, selectedUserId],
          lastMessage: "",
          timestamp: null,
        });
        chatId = newChatRef.id;
        isNewChat = true;
      }

      setWaiting(false);
      router.push(
        `/chatScreen/chatScreen?chatId=${chatId}&receiverId=${selectedUserId}&isNewChat=${isNewChat}`
      );
    } catch (error) {
      console.error("Error starting chat: ", error);
      setWaiting(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => startChat(item.id)}
      style={styles.userContainer}
    >
      <Image
        source={
          item.profilePicture && item.profilePicture !== "null"
            ? { uri: item.profilePicture }
            : require("../../assets/images/profile-icon.png")
        }
        style={styles.profilePicture}
      />
      <View style={styles.userInfoContainer}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.lastMessage}>{item.lastMessage}</Text>
      </View>
    </TouchableOpacity>
  );

  if (waiting) {
    return (
      <View style={styles.loaderContainer}>
        <CircleFade size={60} color="black" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  if (!currentUserId) {
    return (
      <View style={styles.noChatContainer}>
        <Text style={styles.noChatText}>You are logged out.</Text>
        <TouchableOpacity onPress={() => router.replace("/Profile")}>
          <Text style={styles.suggestionText}>Login to see your chats</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Messages</Text>
      {users.length > 0 ? (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
        />
      ) : (
        <View style={styles.noChatContainer}>
          <Text style={styles.noChatText}>You have no chat yet</Text>
          <Text style={styles.suggestionText}>
            Explore and start trading with others!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 32, paddingHorizontal: 16 },
  header: { fontSize: 32, fontFamily: "medium", marginVertical: 12 },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  profilePicture: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  userInfoContainer: { flex: 1 },
  userName: { fontSize: 18, fontWeight: "500" },
  lastMessage: { fontSize: 14, color: "#888" },
  noChatContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  noChatText: { fontSize: 20, fontFamily: "medium", marginBottom: 8 },
  suggestionText: { fontSize: 16, color: "#888", fontFamily: "medium" },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "medium",
    color: "black",
  },
});

export default UserListScreen;
