import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  ToastAndroid,
  FlatList,
  Animated,
  Platform,
  Linking,
} from "react-native";
import {
  collection,
  query,
  orderBy,
  where,
  getDocs,
  doc,
  getDoc,
  getFirestore,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { db, auth } from "../../Firebase";
import Icon from "react-native-vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import * as Notifications from "expo-notifications";
import messaging from "@react-native-firebase/messaging";
import Shimmer from "../../components/Shimmer"; 

const SkeletonHeader = () => (
  <View style={styles.skeletonHeader}>
    <View>
      <Shimmer style={styles.skeletonText} />
    </View>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Shimmer style={styles.skeletonText} />
      <Shimmer style={styles.skeletonProfilePicture} />
    </View>
  </View>
);

const BannerSkeleton = () => (
  <View style={styles.skeletonBanner}>
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
      }}
    >
      <Shimmer
        style={[styles.skeletonBannerImage, { marginRight: 12 }]}
        accessibilityLabel="Placeholder banner image"
      />
      <Shimmer
        style={[styles.skeletonBannerImage, { width: "45%" }]}
        accessibilityLabel="Placeholder banner image"
      />
    </View>
  </View>
);

const CategorySkelton = () => (
  <View style={styles.skeletonCategoryContainer}>
    {[...Array(6)].map((_, index) => (
      <Shimmer key={index} style={styles.skeletonCategoryItem} />
    ))}
  </View>
);

const PostSkeleton = () => (
  <View style={styles.skeletonPostContainer}>
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <View>
        <Shimmer style={styles.skeletonProfilePicture} />
        <Shimmer style={styles.skeletonPostImage} />
        <Shimmer style={styles.skeletonText} />
        <Shimmer style={styles.skeletonTextSmall} />
      </View>
      <View>
        <Shimmer style={styles.skeletonProfilePicture} />
        <Shimmer style={styles.skeletonPostImage} />
        <Shimmer style={styles.skeletonText} />
        <Shimmer style={styles.skeletonTextSmall} />
      </View>
    </View>
  </View>
);
const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [latestVersion, setLatestVersion] = useState("");
  const [updateavailable, setUpdateavailable] = useState(false);
  const flatListRef = useRef(null);
  const bannerFlatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentVersion = "1.0.0";
  const router = useRouter();
  const firestore = getFirestore();

  const images = [
    { uri: "https://iili.io/dlkgfIf.md.webp", title: "sample" },
    { uri: "https://iili.io/dlkgfIf.md.webp", title: "sample" },
    { uri: "https://iili.io/2GUhc92.jpg", title: "sample" },
  ];

  const categories = [
    {
      id: "Electronics",
      name: "Electronics",
      icon: "desktop-outline",
      color: "#4A90E2",
    },
    {
      id: "Home and Furniture",
      name: "Home",
      icon: "bed-outline",
      color: "#50C878",
    },
    {
      id: "Clothing and Accessories",
      name: "Clothing",
      icon: "shirt-outline",
      color: "#F7A81B",
    },
    {
      id: "Books and Media",
      name: "Books",
      icon: "book-outline",
      color: "#E94E77",
    },
    {
      id: "Toys and Games",
      name: "Games",
      icon: "game-controller-outline",
      color: "#9B59B6",
    },
    {
      id: "Sports and Outdoors",
      name: "Sports",
      icon: "basketball-outline",
      color: "#1ABC9C",
    },
  ];

  useEffect(() => {
    const fetchFCMToken = async () => {
      try {
        const token = await messaging().getToken();
        // console.log("FCM Token:", token);
      } catch (error) {
        console.error("Error fetching FCM Token:", error);
      }
    };
    fetchFCMToken();
    const onTokenRefresh = messaging().onTokenRefresh((token) => {
      console.log("FCM Token refreshed:", token);
    });
    return () => onTokenRefresh();
  }, []);

  useEffect(() => {
    async function registerForPushNotificationsAsync() {
      try {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          console.log("Push notifications permission denied");
          return;
        }
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "3f2bdae5-2046-4f88-bf8d-e950909bcfde",
        });
        // console.log("Expo Push Token:", tokenData.data);
      } catch (error) {
        console.error("Error getting push token:", error);
      }
    }
    registerForPushNotificationsAsync();
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
      }
    );
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
      });
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % images.length;
      bannerFlatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }, 4000);
    return () => clearInterval(interval);
  }, [currentIndex, images.length]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleCategoryPress = (category) => {
    router.push(`/CategoryPosts/CategoryPosts?category=${category}`);
  };
  const handlePostType = (postType) => {
    router.push(`/PostType/PostType?postType=${postType}`);
  };

  const showToast = (type, title, message, time) => {
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

  async function checkForUpdate() {
    try {
      setLoading(true);
      const cachedVersion = await AsyncStorage.getItem("latestVersion");
      setLatestVersion(cachedVersion);
      const appConfigDoc = doc(db, "users", "LastestVersion");
      const docSnap = await getDoc(appConfigDoc);
      if (docSnap.exists()) {
        const latestVersion = docSnap.data().Version;
        await AsyncStorage.setItem("latestVersion", latestVersion);
        setLatestVersion(latestVersion);
        setUpdateavailable(latestVersion !== currentVersion);
      }
    } catch (error) {
      console.error("Error fetching the latest version:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      if (user) {
        const fetchUserData = async () => {
          try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              setUserData(userDoc.data());
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          } finally {
            setLoading(false);
          }
        };
        fetchUserData();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        ToastAndroid.show("Check your Internet", ToastAndroid.LONG);
      }
    }, 12000);
    return () => clearTimeout(timeoutId);
  }, [loading]);

  const truncateDescription = (description, maxWords = 8) => {
    const wordsArray = description.split(" ");
    if (wordsArray.length <= maxWords) return description;
    return wordsArray.slice(0, maxWords).join(" ") + " ...";
  };

  const ShortAddress = (add) => {
    const [shortAddress] = add.split(",");
    return shortAddress.trim();
  };

  const fetchUserData = async (userId) => {
    const userDoc = doc(db, "users", userId);
    const userSnap = await getDoc(userDoc);
    return userSnap.exists()
      ? {
          name: userSnap.data().name,
          username: userSnap.data().username,
          profilePicture: userSnap.data().profilePicture,
        } 
      : { username: "App User", profilePicture: "null" };
  };

  const search = () => {
    router.push(`/(tabs)/Explore`);
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(postsQuery);
      const postsList = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const postData = doc.data();
          const userData = await fetchUserData(postData.userId);
          let createdAtDate =
            postData.createdAt instanceof Timestamp
              ? postData.createdAt.toDate()
              : postData.createdAt?.seconds
              ? new Date(postData.createdAt.seconds * 1000)
              : null;
          const timeDiffInSeconds = createdAtDate
            ? Math.floor(
                (new Date().getTime() - createdAtDate.getTime()) / 1000
              )
            : null;
          let timeAgo = "Unknown";
          if (timeDiffInSeconds) {
            if (timeDiffInSeconds < 60)
              timeAgo = `${timeDiffInSeconds} sec ago`;
            else if (timeDiffInSeconds < 3600)
              timeAgo = `${Math.floor(timeDiffInSeconds / 60)} min ago`;
            else if (timeDiffInSeconds < 86400)
              timeAgo = `${Math.floor(timeDiffInSeconds / 3600)} hr ago`;
            else timeAgo = `${Math.floor(timeDiffInSeconds / 86400)} day ago`;
          }
          return {
            id: doc.id,
            ...userData,
            ...postData,
            createdAt: timeAgo,
          };
        })
      );
      setPosts(postsList);
      checkForUpdate();
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
    checkForUpdate();
  }, []);

  const startChat = async (selectedUserId) => {
    if (!auth.currentUser) {
      showToast("info", "Login Required", "Login to start a chat", 1500);
      return;
    }
    setWaiting(true);
    try {
      const currentUserId = auth.currentUser.uid;
      const chatQuery = query(
        collection(db, "chats"),
        where("userIds", "array-contains", currentUserId)
      );
      const chatSnapshot = await getDocs(chatQuery);
      let chatId = null;
      let isNewChat = false;
      chatSnapshot.forEach((doc) => {
        if (doc.data().userIds.includes(selectedUserId)) {
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
      setWaiting(false);
      router.push(
        `/chatScreen/chatScreen?chatId=${chatId}&receiverId=${selectedUserId}&isNewChat=${isNewChat}`
      );
    } catch (error) {
      console.error("Error starting chat:", error);
      setWaiting(false);
    }
  };

  const navigateDetail = (id, userId) => {
    if (!auth.currentUser) {
      showToast("info", "Login Required", "Login to view details", 1500);
      return;
    }
    router.push(`/postdetail/postdetail?id=${id}&userId=${userId}`);
  };

  if (updateavailable) {
    return (
      <View style={styles.updateContainer}>
        <Text style={styles.updateText}>
          Please update the app to continue.
        </Text>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => {
            const appLink =
              Platform.OS === "ios"
                ? "https://apps.apple.com/app/idYOUR_APP_ID"
                : "https://play.google.com/store/apps/details?id=YOUR_APP_PACKAGE_NAME";
            Linking.openURL(appLink);
          }}
        >
          <Text style={styles.updateButtonText}>Update Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderPost = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigateDetail(item.id, item.userId)}
      style={styles.postCard}
      activeOpacity={0.8}
    >
      {/* {console.log(item)} */}
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          {item.profilePicture && item.profilePicture !== "null" ? (
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
          <View>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.postTime}>{item.createdAt}</Text>
          </View>
        </View>
      </View>
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.postImage} />
      ) : (
        <Image
          source={require("../../assets/images/no-image.png")}
          style={styles.postImagePlaceholder}
        />
      )}
      <View style={styles.postContent}>
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text
          style={styles.postDescription}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {truncateDescription(item.description)}
        </Text>
        <View style={styles.postFooter}>
          <View style={styles.locationContainer}>
            <Icon name="map-marker" size={16} color="#4A90E2" />
            <Text style={styles.locationText}>
              {ShortAddress(item.address)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => startChat(item.userId)}
            activeOpacity={0.7}
          >
            <Text style={styles.chatButtonText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSkeleton = () => (
    <View style={styles.container}>
      <SkeletonHeader />
      <BannerSkeleton />
      <CategorySkelton />
      <View style={styles.postsContainer}>
        <PostSkeleton />
      </View>
    </View>
  );

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.appName}>TradeMate</Text>
        {userData ? (
          <TouchableOpacity onPress={() => router.push("/Profile")}>
            <View style={styles.headerUser}>
              <Text style={styles.headerUserName}>{userData.name}</Text>
              <Image
                source={
                  userData.profilePicture && userData.profilePicture !== "null"
                    ? { uri: userData.profilePicture }
                    : require("../../assets/images/profile-icon.png")
                }
                style={styles.headerProfilePicture}
              />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push("/Login/Login")}>
            <Text style={styles.headerUserName}>Login</Text>
          </TouchableOpacity>
        )}
      </View>
      <Animated.FlatList
        ref={bannerFlatListRef}
        data={images}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.bannerContainer}>
            <Image
              style={styles.bannerImage}
              source={{ uri: item.uri }}
              resizeMode="cover"
            />
          </View>
        )}
        onScroll={handleScroll}
        style={styles.bannerList}
        pagingEnabled
        onScrollToIndexFailed={(error) => {
          bannerFlatListRef.current?.scrollToIndex({
            index: error.highestMeasuredFrameIndex,
            animated: true,
          });
        }}
      />
      <View style={styles.pagination}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex ? styles.paginationDotActive : null,
            ]}
          />
        ))}
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={search}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(item.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.categoryIconContainer,
                  { backgroundColor: item.color + "22" },
                ]}
              >
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.categoryText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoryList}
        />
      </View>
      <View style={styles.filters}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => router.push("/nearPost/nearPost")}
        >
          <Text style={styles.filterText}>
            Near Me <MaterialIcons name="near-me" size={16} color="#fff" />
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => handlePostType("typeItem")}
        >
          <Text style={styles.filterText}>Products</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => handlePostType("typeService")}
        >
          <Text style={styles.filterText}>Services</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (waiting) {
    return (
      <View style={styles.waitingContainer}>
        <Animated.View style={styles.spinner}>
          <Text style={styles.spinnerText}>Loading...</Text>
        </Animated.View>
      </View>
    );
  }

  if (loading) {
    return renderSkeleton();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.postsContainer}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4A90E2"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginTop: 43,
    paddingHorizontal: 3,
  },
  appName: {
    fontSize: 20,
    fontFamily: "Brittany",
    color: "#11111",
  },
  headerUser: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerUserName: {
    fontSize: 12,
    color: "#111111",
    marginRight: 2,
  },
  headerProfilePicture: {
    width: 42,
    height: 40,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#fff",
  },
  bannerList: {
    marginVertical: 12,
  },
  bannerContainer: {
    width: 300,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bannerImage: {
    width: "100%",
    height: 160,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: "#4A90E2",
  },
  section: {
    // paddingHorizontal: 16,
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  viewAllText: {
    fontSize: 14,
    color: "#4A90E2",
    fontWeight: "500",
  },
  categoryList: {
    paddingHorizontal: 4,
  },
  categoryCard: {
    alignItems: "center",
    marginHorizontal: 8,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
    marginTop: 4,
  },
  filters: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  filterButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  filterText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  postsContainer: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 8,
  },
  postCard: {
    flex: 0.48,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: "hidden",
    width: "100%",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  profilePicture: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  postTime: {
    fontSize: 10,
    color: "#666",
  },
  postImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  postImagePlaceholder: {
    width: "100%",
    height: 120,
    resizeMode: "contain",
    backgroundColor: "#f0f0f0",
  },
  postContent: {
    padding: 8,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  postDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    maxHeight: 32, 
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 32,  
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationText: {
    fontSize: 10,
    color: "#333",
    marginLeft: 4,
    flexWrap: "wrap",
  },
  chatButton: {
    backgroundColor: "#50C878",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  chatButtonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  noPosts: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  noPostsText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
  },
  updateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  updateText: {
    fontSize: 18,
    color: "#333",
    marginBottom: 16,
  },
  updateButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  updateButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  waitingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  spinner: {
    padding: 16,
  },
  spinnerText: {
    fontSize: 16,
    color: "#333",
  },
  skeletonHeader: {
    flexDirection: "row",
    padding: 16,
    marginBottom: 8,
    justifyContent: "space-between",
    marginTop: 38,
  },
  skeletonProfilePicture: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0e0e0",
    marginRight: 8,
    marginLeft: 8,
    marginTop: 5,
  },
  skeletonText: {
    width: 100,
    height: 20,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
  },
  skeletonTextSmall: {
    width: 80,
    height: 16,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginTop: 8,
  },
  skeletonBanner: {
    // marginHorizontal: 10,
    marginVertical: 12,
  },
  skeletonBannerImage: {
    width: 300,
    height: 160,
    borderRadius: 12,
    backgroundColor: "#e0e0e0",
  },
  skeletonCategoryContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  skeletonCategoryItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 8,
  },
  skeletonPostContainer: {
    marginHorizontal: 4,
    marginVertical: 8,
    padding: 8,
    elevation: 2,
    marginTop: 23,
  },
  skeletonPostImage: {
    paddingHorizontal: 18,
    width: "110%",
    height: 120,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    marginVertical: 8,
  },
});

export default Home;
