import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
} from "react-native";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc, where
} from "firebase/firestore";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CircleFade } from "react-native-animated-spinkit";

import { auth } from "../../Firebase";

const MAX_DISTANCE_KM = 10;

const navigateDetail = (id, userId) => {
  if (!auth.currentUser) {
    ToastAndroid.show("Login to Check Information", ToastAndroid.SHORT);
  } else {
    router.push(`/postdetail/postdetail?id=${id}&userId=${userId}`);
  }
};
const NearbyPostsScreen = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const router = useRouter();
  const firestore = getFirestore();
  const [waiting, setWaiting] = useState(false);

  const fetchUserData = useCallback(
    async (userId) => {
      const userDoc = doc(firestore, "users", userId);
      const userSnap = await getDoc(userDoc);

      if (userSnap.exists()) {
        return {
          username: userSnap.data().username,
          profilePicture: userSnap.data().profilePicture,
        };
      }
      return { username: "App User", profilePicture: null };
    },
    [firestore]
  );

  const startChat = async (selectedUserId) => {
    if (!auth.currentUser) {
      ToastAndroid.show("Login to make a Chat", ToastAndroid.SHORT);

    } else {
      setWaiting(true);
      const currentUserId = auth.currentUser.uid;

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
      }
    }
  };

  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Permission to access location was denied");
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error("Error fetching user location: ", error);
      }
    };

    fetchUserLocation();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!userLocation) return;

      try {
        const postsQuery = query(
          collection(firestore, "posts"),
          orderBy("createdAt", "desc")
        );
        const postsSnapshot = await getDocs(postsQuery);

        const nearbyPosts = await Promise.all(
          postsSnapshot.docs.map(async (doc) => {
            const postData = doc.data();
            const distance = haversineDistance(
              userLocation.latitude,
              userLocation.longitude,
              postData.location.latitude,
              postData.location.longitude
            );

            if (distance <= MAX_DISTANCE_KM) {
              const userData = await fetchUserData(postData.userId);
              return {
                id: doc.id,
                distance,
                ...userData,
                ...postData,
              };
            }
          })
        );

        setPosts(nearbyPosts.filter((post) => post !== undefined));
      } catch (error) {
        console.error("Error fetching posts: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [userLocation, fetchUserData]);

  const haversineDistance = useMemo(
    () => (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  const ShortAddress = useCallback((add) => {
    const [shortAddress] = add.split(",");
    return shortAddress.trim();
  }, []);

  const truncateDescription = useCallback((description, maxWords = 10) => {
    const wordsArray = description.split(" ");
    if (wordsArray.length <= maxWords) {
      return description;
    }
    return wordsArray.slice(0, maxWords).join(" ") + " ...";
  }, []);

  const renderPost = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        navigateDetail(item.id, item.userId);
      }}
    >
      <View style={styles.postContainer}>
        <TouchableOpacity
          onPress={() =>
            ToastAndroid.show("Not available yet", ToastAndroid.SHORT)
          }
        >
          <View style={styles.userContainer}>
            <Image
              source={
                item.profilePicture
                  ? { uri: item.profilePicture }
                  : require("../../assets/images/profile-icon.png")
              }
              style={styles.profilePicture}
            />
            <Text style={styles.userName}>{item.username}</Text>
          </View>
        </TouchableOpacity>
        <Image
          source={
            item.images && item.images.length > 0
              ? { uri: item.images[0] }
              : require("../../assets/images/no-image.png")
          }
          style={styles.image}
        />
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>
          {truncateDescription(item.description)}
        </Text>
        <Text style={{ fontFamily: "medium", color: "grey", fontSize: 13 }}>
          Distance: {item.distance.toFixed(2)} km
        </Text>
        <View style={styles.addressChat}>
          <View style={styles.shortAddress}>
            <Icon name="map-marker" size={20} color="#000" />
            <Text> </Text>
            <Text style={styles.location}>{ShortAddress(item.address)}</Text>
          </View>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => startChat(item.userId)}
          >
            <Text style={styles.chatButtonText}>Send a Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
  if (loading || waiting || !userLocation) {
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
    <View style={{ flex: 1 }}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={{ marginVertical: 6 }}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontFamily: "medium", marginVertical: 6 }}>
          Near Me
        </Text>
        <Text></Text>
      </View>
      {posts.length > 0 ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          initialNumToRender={5}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 300,
            offset: 300 * index,
            index,
          })}
        />
      ) : (
        <View style={styles.noPostContainer}>
          <Image
            source={require("../../assets/images/empty.png")}
            style={{ width: 140, height: 140 }}
          />
          <Text
            style={{
              fontFamily: "medium",
              paddingHorizontal: 22,
              textAlign: "center",
            }}
          >
            There is no post available in your area
          </Text>
        </View>
      )}
    </View>
  );
};

export default NearbyPostsScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 30,
  },
  noPostContainer: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    // marginBottom: 74,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    marginStart: 3,
    backgroundColor: "#f1f1f1",
    paddingVertical: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  postContainer: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#ffff",
    borderRadius: 8,
    elevation: 1,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  userName: {
    fontFamily: "medium",
  },
  imageList: {
    marginBottom: 8,
  },
  Noimage: {
    width: 350,
    height: 200,
    alignContent: "center",
  },
  image: {
    width: 340,
    height: 200,
    borderRadius: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "medium",
    marginBottom: 4,
  },
  description: {
    fontSize: 10,
    marginBottom: 8,
    fontFamily: "medium",
    color: "#888",
  },
  addressChat: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shortAddress: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  location: {
    fontSize: 14,
    color: "#888",
    fontFamily: "medium",
  },
  chatButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  chatButtonText: {
    color: "#fff",
    fontFamily: "medium",
  },
});
