import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Keyboard,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Searchbar } from "react-native-paper";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
} from "firebase/firestore";
import { useRouter } from "expo-router";
import { auth, db } from "./../../Firebase";
import Icon from "react-native-vector-icons/FontAwesome";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";

const ExploreScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [categories, setCategories] = useState([
    { id: "1", name: "Electronics", icon: "desktop-outline" },
    { id: "2", name: "Home and Furniture", icon: "bed-outline" },
    { id: "3", name: "Clothing and Accessories", icon: "shirt-outline" },
    { id: "4", name: "Books and Media", icon: "book-outline" },
    { id: "5", name: "Toys and Games", icon: "game-controller-outline" },
    { id: "6", name: "Sports and Outdoors", icon: "basketball-outline" },
    { id: "7", name: "Tools and Equipment", icon: "hammer-outline" },
    { id: "8", name: "Automotive", icon: "car-outline" },
    { id: "9", name: "Health and Beauty", icon: "fitness-outline" },
    { id: "10", name: "Musical Instruments", icon: "musical-notes-outline" },
    { id: "11", name: "Collectibles and Antiques", icon: "ribbon-outline" },
    { id: "12", name: "Web and Software Development", icon: "code-slash-outline" },
    { id: "13", name: "Graphic and Design", icon: "color-palette-outline" },
    { id: "14", name: "Writing and Translation", icon: "pencil-outline" },
    { id: "15", name: "Digital Marketing", icon: "megaphone-outline" },
    { id: "16", name: "Video and Animation", icon: "videocam-outline" },
    { id: "17", name: "Music and Audio", icon: "musical-note-outline" },
    { id: "18", name: "Business Services", icon: "briefcase-outline" },
    { id: "19", name: "Lifestyle Services", icon: "heart-outline" },
    { id: "20", name: "Photography and Videography", icon: "camera-outline" },
  ]);

  useFocusEffect(
    useCallback(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
      return () => {
        Keyboard.dismiss();
      };
    }, [])
  );

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

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
    try {
      const userPromises = userIds.map(async (userId) => {
        const userDoc = doc(db, "users", userId);
        const userSnap = await getDoc(userDoc);
        if (userSnap.exists()) {
          return {
            userId,
            username: userSnap.data().username || "App User",
            profilePicture: userSnap.data().profilePicture || null,
          };
        }
        return { userId, username: "App User", profilePicture: null };
      });
      const users = await Promise.all(userPromises);
      return Object.fromEntries(users.map((user) => [user.userId, user]));
    } catch (error) {
      console.error("Error fetching user data:", error);
      return {};
    }
  };

  const fetchPosts = async (queryString) => {
    if (!queryString.trim()) return;
    setLoading(true);
    try {
      const postsRef = collection(db, "posts");
      
      const q = query(postsRef); 
      const querySnapshot = await getDocs(q);
      const postsList = [];
      const userIds = new Set();

      querySnapshot.forEach((doc) => {
        const postData = doc.data();
        const titleMatch = postData.title?.toLowerCase().includes(queryString.toLowerCase());
        const descMatch = postData.description?.toLowerCase().includes(queryString.toLowerCase());
        if (titleMatch || descMatch) {
          postsList.push({ id: doc.id, ...postData });
          userIds.add(postData.userId);
        }
      });

      const usersData = await fetchUserData(Array.from(userIds));
      const postsWithUserData = postsList.map((post) => ({
        ...post,
        ...usersData[post.userId],
      }));

      setSearchResults(postsWithUserData);
      setIsSearching(true);
    } catch (error) {
      console.error("Error fetching posts:", error);
      showToast("error", "Error", "Failed to fetch posts.", 3000);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (selectedUserId) => {
    if (!auth.currentUser) {
      showToast("info", "Login Required", "Please log in to start a chat.", 3000);
      return;
    }

    setLoading(true);
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
      showToast("error", "Error", "Failed to start chat.", 3000);
    } finally {
      setLoading(false);
    }
  };

  const onSearchPress = () => {
    if (searchQuery.trim()) {
      fetchPosts(searchQuery);
    } else {
      showToast("info", "Empty Search", "Please enter a search term.", 2000);
    }
  };

  const onChangeSearch = (query) => {
    setSearchQuery(query);
  };

  const onClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    Keyboard.dismiss();
  };

  const truncateDescription = (description, maxWords = 4) => {
    if (!description) return "";
    const wordsArray = description.split(" ");
    if (wordsArray.length <= maxWords) return description;
    return wordsArray.slice(0, maxWords).join(" ") + " ...";
  };

  const ShortAddress = (add) => {
    if (!add) return "Unknown Location";
    const [shortAddress] = add.split(",");
    return shortAddress.trim();
  };

  const handleCategoryPress = (category) => {
    router.push(`/CategoryPosts/CategoryPosts?category=${category}`);
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(item.name)}
      activeOpacity={0.7}
      accessibilityLabel={`Browse ${item.name} category`}
    >
      <Ionicons name={item.icon} size={32} color="#4A90E2" />
      <Text style={styles.categoryText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderPost = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        currentUserId
          ? router.push(`/postdetail/postdetail?id=${item.id}&userId=${item.userId}`)
          : showToast("info", "Login Required", "Please log in to view details.", 3000)
      }
      activeOpacity={0.8}
      accessibilityLabel={`View details of ${item.title}`}
    >
      <View style={styles.postCard}>
        <TouchableOpacity
          onPress={() => showToast("info", "Not Available", "User profile not available yet.", 3000)}
          style={styles.userContainer}
          accessibilityLabel={`View profile of ${item.username}`}
        >
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
          <Text style={styles.username}>{item.username}</Text>
        </TouchableOpacity>
        {item.images && item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.postImage}
            accessibilityLabel={`Image of ${item.title}`}
          />
        ) : (
          <Image
            source={require("../../assets/images/no-image.png")}
            style={styles.postImage}
            accessibilityLabel="No image available"
          />
        )}
        <View style={styles.postContent}>
          <Text style={styles.postTitle}>{item.title}</Text>
          <Text style={styles.postDescription}>{truncateDescription(item.description)}</Text>
          <View style={styles.postFooter}>
            <View style={styles.locationContainer}>
              <Icon name="map-marker" size={16} color="#666" />
              <Text style={styles.locationText}>{ShortAddress(item.address)}</Text>
            </View>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => startChat(item.userId)}
              activeOpacity={0.7}
              accessibilityLabel={`Chat with ${item.username}`}
            >
              <Text style={styles.chatButtonText}>Send a Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        ref={searchInputRef}
        placeholder="Search posts..."
        onChangeText={onChangeSearch}
        value={searchQuery}
        onIconPress={onSearchPress}
        onSubmitEditing={onSearchPress}
        onClearIconPress={onClearSearch}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#4A90E2"
        clearIcon={() => <Ionicons name="close" size={20} color="#4A90E2" />}
        accessibilityLabel="Search posts"
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <FlatList
          data={isSearching ? searchResults : categories}
          key={isSearching ? "posts" : "categories"}
          keyExtractor={(item) => item.id}
          numColumns={isSearching ? 1 : 2}
          renderItem={isSearching ? renderPost : renderCategory}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={isSearching ? styles.postsList : styles.categoriesList}
          ListEmptyComponent={
            isSearching && !searchResults.length ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No posts found for "{searchQuery}"</Text>
              </View>
            ) : null
          }
        />
      )}
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  searchBar: {
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 16,
  },
  searchInput: {
    fontSize: 16,
    color: "#333",
    fontFamily: "regular",
  },
  categoriesList: {
    paddingBottom: 20,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 8,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: "medium",
    color: "#333",
    marginTop: 8,
    textAlign: "center",
  },
  postsList: {
    paddingBottom: 20,
  },
  postCard: {
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
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#e0e0e0",
  },
  username: {
    fontSize: 16,
    fontFamily: "medium",
    color: "#333",
  },
  postImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  postContent: {
    padding: 12,
  },
  postTitle: {
    fontSize: 16,
    fontFamily: "medium",
    color: "#333",
    marginBottom: 4,
  },
  postDescription: {
    fontSize: 12,
    fontFamily: "regular",
    color: "#666",
    marginBottom: 8,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 12,
    fontFamily: "regular",
    color: "#666",
    marginLeft: 6,
  },
  chatButton: {
    backgroundColor: "#007bff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
  },
  chatButtonText: {
    fontSize: 14,
    fontFamily: "medium",
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "medium",
    color: "#666",
    textAlign: "center",
  },
});

export default ExploreScreen;