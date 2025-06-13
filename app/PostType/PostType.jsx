import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ToastAndroid,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import Icon from "react-native-vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import Loader from "./../../components/Loader";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { CircleFade } from "react-native-animated-spinkit";
import { auth ,db} from "../../Firebase";

const PostType = () => {
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { postType } = useLocalSearchParams();
  const [waiting, setWaiting] = useState(false);

  const truncateDescription = (description, maxWords = 4) => {
    const wordsArray = description.split(" ");
    if (wordsArray.length <= maxWords) {
      return description;
    }
    return wordsArray.slice(0, maxWords).join(" ") + " ...";
  };

  const ShortAddress = (add) => {
    const [shortAddress] = add.split(",");
    return shortAddress.trim();
  };
  const fetchUserData = async (userId) => {
    const db = getFirestore();
    const userDoc = doc(db, "users", userId);
    const userSnap = await getDoc(userDoc);

    if (userSnap.exists()) {
      return {
        username: userSnap.data().username,
        profilePicture: userSnap.data().profilePicture,
      };
    }
    return { username: "App User", profilePicture: "null" };
  };

  const startChat = async (selectedUserId) => {
    if (!auth.currentUser) {
      showToast("info", "Login Reqiured", "Login to make a Chat", 1500);
    } else {
      setWaiting(true);
      const currentUserId = auth.currentUser.uid;

      try {
        const chatQuery = query(
          collection(db, "chats"),
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

  const fetchPosts = async (postType) => {
    setLoading(true);
    const db = getFirestore();
    try {
      let postsQuery = collection(db, "posts");
      if (postType) {
        postsQuery = query(
          postsQuery,
          where("postType", "==", postType),
          orderBy("createdAt", "desc")
        );
      } else {
        postsQuery = query(postsQuery, orderBy("createdAt", "desc"));
      }
      const querySnapshot = await getDocs(postsQuery);

      const postsList = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const postData = doc.data();
          const userData = await fetchUserData(postData.userId);
          return {
            id: doc.id,
            ...userData,
            ...postData,
          };
        })
      );

      setPosts(postsList);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Failed to fetch posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(postType);
  }, [postType]);

  if (loading || waiting) {
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

  if (error) {
    return (
      <View style={styles.container}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontFamily: "medium" }}>
          {postType == "typeItem" ? "Products" : "Services"}
        </Text>
        <Text></Text>
      </View>

      {posts.length > 0 ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/postdetail/postdetail?id=${item.id}&userId=${item.userId}`
                )
              }
            >
              <View style={styles.postContainer}>
                <TouchableOpacity
                  onPress={() =>
                    ToastAndroid.show("Not available yet", ToastAndroid.SHORT)
                  }
                >
                  <View style={styles.userContainer}>
                    {item.profilePicture ? (
                      <Image
                        source={{ uri: item.profilePicture }}
                        style={styles.profilePicture}
                      />
                    ) : (
                      <Image
                        source={require("../../assets/images/profile-icon.png")}
                        style={styles.profilePicture}
                      />
                    )}
                    <Text style={styles.userName}>{item.username}</Text>
                  </View>
                </TouchableOpacity>
                {item.images && item.images.length > 0 ? (
                  <Image
                    source={{ uri: item.images[0] }}
                    style={styles.image}
                  />
                ) : (
                  <Image
                    source={require("../../assets/images/no-image.png")}
                    style={styles.Noimage}
                  />
                )}
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>
                  {truncateDescription(item.description)}
                </Text>
                <View style={styles.addressChat}>
                  <View style={styles.shortAddress}>
                    <Icon name="map-marker" size={20} color="#000" />
                    <Text> </Text>
                    <Text style={styles.location}>
                      {ShortAddress(item.address)}
                    </Text>
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
          )}
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
            We search and search but nothing found!
          </Text>
        </View>
      )}
    </View>
  );
};

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
    marginBottom: 74,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
    marginStart: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  postContainer: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
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
    fontFamily: "regular",
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
    marginBottom: 8,
  },
  description: {
    marginBottom: 8,
    color: "grey",
    fontSize: 12,
  },
  addressChat: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shortAddress: {
    flexDirection: "row",
    alignItems: "center",
  },
  location: {
    marginLeft: 4,
  },
  chatButton: {
    backgroundColor: "#007bff",
    padding: 8,
    borderRadius: 4,
  },
  chatButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default PostType;
