import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Icon } from "react-native-elements";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../Firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import Toast from "react-native-toast-message";
import ThreeDotMenu from "../../components/ThreeDotMenu";

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState("myPosts");
  const [likedPosts, setLikedPosts] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const router = useRouter();

  useEffect(() => {
    const getUserDetailsFromCache = async () => {
      try {
        const userDetails = await AsyncStorage.getItem("userDetails");
        if (userDetails !== null) {
          const parsedDetails = JSON.parse(userDetails);
          setName(parsedDetails.name || "");
          setUsername(parsedDetails.username || "");
          setProfilePicture(parsedDetails.profilePicture || null);
        }
      } catch (error) {
        console.error("Error retrieving user details from cache:", error);
      }
    };
    getUserDetailsFromCache();
  }, []);

  const navigate = () => router.push("/Login/Login");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user);
      } else {
        setUserData(null);
        setProfilePicture(null);
        setLoading(false);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  const fetchLikedPosts = useCallback(async () => {
    setFetching(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setFetching(false);
        return;
      }
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const likedPostIds = userDoc.data()?.likedPosts || [];
      if (likedPostIds.length === 0) {
        setLikedPosts([]);
        setFetching(false);
        return;
      }
      const postPromises = likedPostIds.map((postId) =>
        getDoc(doc(db, "posts", postId))
      );
      const postDocs = await Promise.all(postPromises);
      const posts = postDocs
        .filter((doc) => doc.exists())
        .map((doc) => ({ id: doc.id, ...doc.data() }));
      setLikedPosts(posts);
    } catch (error) {
      console.error("Error fetching liked posts:", error);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (auth.currentUser && viewType === "likedPosts") {
      fetchLikedPosts();
    }
  }, [viewType, fetchLikedPosts]);

  const truncateDescription = (description, maxWords = 10) => {
    if (!description) return "";
    const wordsArray = description.split(" ");
    if (wordsArray.length <= maxWords) return description;
    return wordsArray.slice(0, maxWords).join(" ") + " ...";
  };

  const fetchUserData = async (user) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        const cachedUser = {
          name: data.name,
          username: data.username,
          profilePicture: data.profilePicture,
        };
        await AsyncStorage.setItem("userDetails", JSON.stringify(cachedUser));
        setName(data.name || "");
        setUsername(data.username || "");
        setUserData(data);
        setProfilePicture(data.profilePicture || null);
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(postsQuery);
        const posts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUserPosts(posts);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const editProfileNavigate = () => {
    router.push({
      pathname: `/EditProfileScreen/EditProfileScreen`,
      params: { data: JSON.stringify(userData) },
    });
  };

  const OfferNavigate = () => {
    router.push("/OffersScreen/OffersScreen");
  };

  const Myoffers = () => {
    router.push("/Sentofferscreen/Sentofferscreen");
  };

  const handleDeletePost = async (postId) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          setLoading(true);
          try {
            await deleteDoc(doc(db, "posts", postId));
            setUserPosts(userPosts.filter((post) => post.id !== postId));
            showToast("success", "Deleted", "Post deleted successfully", 2000);
          } catch (error) {
            console.error("Error deleting post:", error);
            showToast("error", "Error", "Failed to delete post", 2000);
          }
          setLoading(false);
        },
        style: "destructive",
      },
    ]);
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const refreshData = async () => {
      if (auth.currentUser) {
        if (viewType === "likedPosts") {
          await fetchLikedPosts();
        }
        await fetchUserData(auth.currentUser);
      }
      setRefreshing(false);
    };
    refreshData();
  }, [viewType, fetchLikedPosts]);

  if (!authChecked || loading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require("../../assets/images/profile-icon.png")}
          style={styles.loadingLogo}
        />
        <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
      </View>
    );
  }

  if (authChecked && !auth.currentUser) {
    return (
      <View style={styles.loginContainer}>
        <Image
          source={require("../../assets/images/profile-icon.png")}
          style={styles.loginLogo}
        />
        <Text style={styles.loginTitle}>Welcome to Your Profile</Text>
        <Text style={styles.loginSubtitle}>Sign in to access your profile</Text>
        <TouchableOpacity onPress={navigate} style={styles.loginButton}>
          <Text style={styles.loginButtonText}>Login to Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#111111" barStyle="loght-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4A90E2"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.signout}>
            <ThreeDotMenu />
          </View>
          <View style={styles.headerContent}>
            <View style={styles.profileImageContainer}>
              {profilePicture ? (
                <Image
                  source={{ uri: profilePicture }}
                  style={styles.profileImage}
                />
              ) : (
                <Image
                  source={require("../../assets/images/profile-icon.png")}
                  style={styles.profileImage}
                />
              )}
            </View>
            <View style={styles.userInfo}>
              <View style={styles.nameContainer}>
                <Text style={styles.name}>{name}</Text>
                <TouchableOpacity
                  onPress={editProfileNavigate}
                  style={styles.editButton}
                  activeOpacity={0.7}
                >
                  <FontAwesome name="edit" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.username}>@{username}</Text>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userPosts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{likedPosts.length}</Text>
                <Text style={styles.statLabel}>Liked</Text>
              </View>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={OfferNavigate}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <AntDesign
                  name="inbox"
                  size={16}
                  color="#fff"
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>Received Offers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={Myoffers}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <AntDesign
                  name="export"
                  size={16}
                  color="#fff"
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>My Offers</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={styles.postsSection}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewType === "myPosts" ? styles.toggleButtonActive : null,
              ]}
              onPress={() => setViewType("myPosts")}
              activeOpacity={0.7}
            >
              <Entypo
                name="grid"
                size={20}
                color={viewType === "myPosts" ? "#fff" : "#666"}
              />
              <Text
                style={[
                  styles.toggleText,
                  viewType === "myPosts" ? styles.toggleTextActive : null,
                ]}
              >
                My Posts
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewType === "likedPosts" ? styles.toggleButtonActive : null,
              ]}
              onPress={() => setViewType("likedPosts")}
              activeOpacity={0.7}
            >
              <AntDesign
                name="heart"
                size={20}
                color={viewType === "likedPosts" ? "#fff" : "#666"}
              />
              <Text
                style={[
                  styles.toggleText,
                  viewType === "likedPosts" ? styles.toggleTextActive : null,
                ]}
              >
                Liked Posts
              </Text>
            </TouchableOpacity>
          </View>
          {viewType === "myPosts" && (
            <View style={styles.postsGrid}>
              {userPosts.length > 0 ? (
                userPosts.map((item) => (
                  <View key={item.id} style={styles.postCard}>
                    <TouchableOpacity
                      onPress={() =>
                        router.push(
                          `/postdetail/postdetail?id=${item.id}&userId=${item.userId}`
                        )
                      }
                      style={styles.postTouchable}
                      activeOpacity={0.8}
                    >
                      <View style={styles.postImageContainer}>
                        {item.images && item.images.length > 0 ? (
                          <Image
                            source={{ uri: item.images[0] }}
                            style={styles.postImage}
                          />
                        ) : (
                          <Image
                            source={require("../../assets/images/no-image.png")}
                            style={styles.postImage}
                          />
                        )}
                      </View>
                      <View style={styles.postContent}>
                        <Text style={styles.postTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.postDescription} numberOfLines={2}>
                          {truncateDescription(item.description)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.postActions}>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: `/EditPostScreen/EditPostScreen?postId=${item.id}`,
                          })
                        }
                        style={styles.postActionButton}
                        activeOpacity={0.7}
                      >
                        <FontAwesome name="edit" size={16} color="#4A90E2" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeletePost(item.id)}
                        style={styles.postActionButton}
                        activeOpacity={0.7}
                      >
                        <Icon name="delete" size={16} color="#E94E77" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <AntDesign name="filetext1" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    You haven't created any posts yet
                  </Text>
                  <TouchableOpacity
                    style={styles.createPostButton}
                    onPress={() => router.push("/NewPost/NewPost")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.createPostText}>Create a Post</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          {viewType === "likedPosts" && (
            <View style={styles.postsGrid}>
              {fetching ? (
                <View style={styles.fetchingContainer}>
                  <ActivityIndicator size="large" color="#4A90E2" />
                </View>
              ) : likedPosts.length > 0 ? (
                likedPosts.map((item) => (
                  <View key={item.id} style={styles.postCard}>
                    <TouchableOpacity
                      onPress={() =>
                        router.push(
                          `/postdetail/postdetail?id=${item.id}&userId=${item.userId}`
                        )
                      }
                      style={styles.postTouchable}
                      activeOpacity={0.8}
                    >
                      <View style={styles.postImageContainer}>
                        {item.images && item.images.length > 0 ? (
                          <Image
                            source={{ uri: item.images[0] }}
                            style={styles.postImage}
                          />
                        ) : (
                          <Image
                            source={require("../../assets/images/no-image.png")}
                            style={styles.postImage}
                          />
                        )}
                      </View>
                      <View style={styles.postContent}>
                        <Text style={styles.postTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.postDescription} numberOfLines={2}>
                          {truncateDescription(item.description)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <AntDesign name="hearto" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    You haven't liked any posts yet
                  </Text>
                  <TouchableOpacity
                    style={styles.createPostButton}
                    onPress={() => router.push("/Home")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.createPostText}>Browse Posts</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    marginTop:30,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  loader: {
    marginTop: 16,
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    padding: 20,
  },
  loginLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  loginSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
  },
  loginButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#4A90E2",
    paddingTop: 28,
    paddingBottom:10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerContent: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  signout: {
    position: "absolute",
    top: -36,
    right: -16, 
    },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#e0e0e0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  userInfo: {
    alignItems: "center",
    marginBottom: 6,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 8,
  },
  editButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  username: {
    fontSize: 14,
    fontWeight: "500",
    color: "#e0e0e0",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 6,
    marginBottom: 16,
    justifyContent: "space-around",
    width: "80%",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#e0e0e0",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#50C878",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  postsSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#e0e0e0",
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 20,
  },
  toggleButtonActive: {
    backgroundColor: "#4A90E2",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginLeft: 8,
  },
  toggleTextActive: {
    color: "#fff",
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  postCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: "hidden",
  },
  postTouchable: {
    width: "100%",
  },
  postImageContainer: {
    width: "100%",
    height: 120,
    backgroundColor: "#f0f0f0",
  },
  postImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  postContent: {
    padding: 12,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  postDescription: {
    fontSize: 12,
    fontWeight: "400",
    color: "#666",
    height: 32,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  postActionButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    width: "100%",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    textAlign: "center",
    marginVertical: 16,
  },
  createPostButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
  },
  createPostText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  fetchingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    width: "100%",
  },
});

export default Profile;
