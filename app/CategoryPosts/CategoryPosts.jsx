import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  addDoc,
  limit,
  startAfter,
} from "firebase/firestore";
import { db, auth } from "../../Firebase";
import Icon from "react-native-vector-icons/FontAwesome";
import { useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import { CircleFade } from "react-native-animated-spinkit";

const POSTS_PER_PAGE = 10;

const CategoryPosts = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const { category } = useLocalSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const flatListRef = useRef(null); // Add ref for FlatList

  const truncateDescription = (description, maxWords = 4) => {
    const wordsArray = description.split(" ");
    if (wordsArray.length <= maxWords) return description;
    return wordsArray.slice(0, maxWords).join(" ") + " ...";
  };

  const shortAddress = (add) => {
    const [shortAddr] = add.split(",");
    return shortAddr.trim();
  };

  const showToast = (type, title, message, time = 3000) => {
    Toast.show({
      type,
      text1: title,
      text2: message,
      position: "top",
      visibilityTime: time,
      autoHide: true,
      topOffset: 40,
    });
  };

  const fetchUserData = async (userIds) => {
    const userPromises = userIds.map(async (userId) => {
      try {
        const userDoc = doc(db, "users", userId);
        const userSnap = await getDoc(userDoc);
        if (userSnap.exists()) {
          return {
            userId,
            username: userSnap.data().username,
            profilePicture: userSnap.data().profilePicture,
          };
        }
        return { userId, username: "App User", profilePicture: null };
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        return { userId, username: "App User", profilePicture: null };
      }
    });
    const users = await Promise.all(userPromises);
    return Object.fromEntries(users.map((user) => [user.userId, user]));
  };

  const fetchPosts = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore && (!hasMore || loadingMore)) return;

      setLoading(!isLoadMore);
      setLoadingMore(isLoadMore);

      try {
        let postsQuery = query(
          collection(db, "posts"),
          where("category", "==", category),
          orderBy("createdAt", "desc"),
          limit(POSTS_PER_PAGE)
        );

        if (isLoadMore && lastDoc) {
          postsQuery = query(postsQuery, startAfter(lastDoc));
        }

        const querySnapshot = await getDocs(postsQuery);
        const newPosts = [];
        const userIds = new Set();

        querySnapshot.forEach((doc) => {
          const postData = doc.data();
          newPosts.push({ id: doc.id, ...postData });
          userIds.add(postData.userId);
        });

        const usersData = await fetchUserData(Array.from(userIds));

        const postsWithUserData = newPosts.map((post) => ({
          ...post,
          ...usersData[post.userId],
        }));

        setPosts((prev) => (isLoadMore ? [...prev, ...postsWithUserData] : postsWithUserData));
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === POSTS_PER_PAGE);
        setError(null);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setError("Failed to fetch posts. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category, hasMore, loadingMore, lastDoc] // Ensure all dependencies are included
  );

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const startChat = async (selectedUserId) => {
    if (!auth.currentUser) {
      showToast("error", "Login Required", "Please log in to start a chat.");
      return;
    }

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
        const newChatRef = await addDoc(collection(db, "chats"), {
          userIds: [currentUserId, selectedUserId],
          lastMessage: "",
          timestamp: null,
        });
        chatId = newChatRef.id;
        isNewChat = true;
      }

      router.push(
        `/chatScreen/chatScreen?chatId=${chatId}&receiverId=${selectedUserId}&isNewChat=${isNewChat}`
      );
    } catch (error) {
      console.error("Error starting chat:", error);
      showToast("error", "Error", "Failed to start chat. Please try again.");
    } finally {
      setWaiting(false);
    }
  };

  const navigateDetail = (id, userId) => {
    if (!auth.currentUser) {
      showToast("error", "Login Required", "Please log in to view post details.");
      return;
    }
    router.push(`/postdetail/postdetail?id=${id}&userId=${userId}`);
  };

  const handleRetry = () => {
    fetchPosts();
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#007bff" />
        </View>
      );
    }
    if (!hasMore) {
      return (
        <View style={styles.footerText}>
          <Text style={styles.noMoreText}>No more posts to load</Text>
        </View>
      );
    }
    return null;
  };

  if (loading || waiting) {
    return (
      <View style={styles.loadingContainer}>
        <CircleFade size={48} color="#007bff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {posts.length > 0 ? (
        <FlatList
          ref={flatListRef}
          data={posts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigateDetail(item.id, item.userId)}
              accessibilityLabel={`View details of ${item.title}`}
            >
              <View style={styles.postContainer}>
                <TouchableOpacity
                  onPress={() =>
                    showToast(
                      "info",
                      "Not Available",
                      "User profile not available yet",
                      2000
                    )
                  }
                  accessibilityLabel={`View profile of ${item.username}`}
                >
                  <View style={styles.userContainer}>
                    {item.profilePicture ? (
                      <Image
                        source={{ uri: item.profilePicture }}
                        style={styles.profilePicture}
                        accessibilityLabel={`${item.username}'s profile picture`}
                      />
                    ) : (
                      <Image
                        source={require("../../assets/images/profile-icon.png")}
                        style={styles.profilePicture}
                        accessibilityLabel="Default profile picture"
                      />
                    )}
                    <Text style={styles.userName}>{item.username}</Text>
                  </View>
                </TouchableOpacity>
                {item.images && item.images.length > 0 ? (
                  <Image
                    source={{ uri: item.images[0] }}
                    style={styles.image}
                    accessibilityLabel={`Image of ${item.title}`}
                  />
                ) : (
                  <Image
                    source={require("../../assets/images/no-image.png")}
                    style={styles.noImage}
                    accessibilityLabel="No image available"
                  />
                )}
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>
                  {truncateDescription(item.description)}
                </Text>
                <View style={styles.addressChat}>
                  <View style={styles.shortAddress}>
                    <Icon name="map-marker" size={20} color="#000" />
                    <Text style={styles.location}>
                      {shortAddress(item.address)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => startChat(item.userId)}
                    accessibilityLabel={`Chat with ${item.username}`}
                  >
                    <Text style={styles.chatButtonText}>Send a Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
          onEndReached={() => fetchPosts(true)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }} // Preserve scroll position
        />
      ) : (
        <View style={styles.noPostContainer}>
          <Image
            source={require("../../assets/images/empty.png")}
            style={styles.emptyImage}
            accessibilityLabel="No posts found"
          />
          <Text style={styles.noPostText}>
            No {category} post found. Try another category!
          </Text>
        </View>
      )}
      <Toast />
    </View>
  );
};

// Styles remain unchanged
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "medium",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "medium",
  },
  headerSpacer: {
    width: 40, // Balances the back button
  },
  noPostContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  emptyImage: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  noPostText: {
    fontFamily: "medium",
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
  postContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    fontSize: 14,
    color: "#333",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  noImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "medium",
    marginBottom: 4,
    color: "#333",
  },
  description: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
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
    marginLeft: 8,
    fontSize: 12,
    color: "#666",
  },
  chatButton: {
    backgroundColor: "#007bff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  chatButtonText: {
    color: "#fff",
    fontFamily: "medium",
    fontSize: 12,
  },
  footerLoader: {
    padding: 16,
    alignItems: "center",
  },
  footerText: {
    padding: 16,
    alignItems: "center",
  },
  noMoreText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "medium",
  },
});

export default CategoryPosts;