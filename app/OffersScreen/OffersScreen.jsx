import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Alert,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  getFirestore,
  addDoc,
} from "firebase/firestore";
import { auth ,db} from "../../Firebase";
import { CircleFade } from "react-native-animated-spinkit";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const NOTIFICATION_API_URL =
  "https://notification-api-zeta.vercel.app/api/send-notification";
const COLLECTIONS = {
  EXCHANGES: "exchanges",
  POSTS: "posts",
  USERS: "users",
};

const OffersScreen = () => {
  const [offers, setOffers] = useState([]);
  const [userPostsData, setUserPostsData] = useState([]);
  const [offeredPostsData, setOfferedPostsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const firestore = getFirestore();
  const currentUser = auth.currentUser;
  const router = useRouter();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    if (!currentUser) {
      setError("Please log in to view offers.");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const offersQuery = query(
        collection(db, COLLECTIONS.EXCHANGES),
        where("postOwnerId", "==", currentUser.uid)
      );
      const querySnapshot = await getDocs(offersQuery);
      const fetchedOffers = querySnapshot.docs.map((doc, i) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOffers(fetchedOffers);
      await fetchPostsData(fetchedOffers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      setError("Failed to load offers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPostsData = async (offers) => {
    if (offers.length === 0) return;
    try {
      const postIds = [...new Set(offers.map((offer, i) => offer.postId))];
      const offeredItemIds = [
        ...new Set(offers.map((offer, i) => offer.offeredItemId)),
      ];
      const postDocs = await Promise.all(
        postIds.map((id, i) => getDoc(doc(db, COLLECTIONS.POSTS, id)))
      );
      const offeredItemDocs = await Promise.all(
        offeredItemIds.map((id, i) => getDoc(doc(db, COLLECTIONS.POSTS, id)))
      );

      const postDataMap = postDocs.reduce((acc, postDoc) => {
        if (postDoc.exists()) {
          acc[postDoc.id] = { id: postDoc.id, ...postDoc.data() };
        }
        return acc;
      }, {});

      const offeredItemDataMap = offeredItemDocs.reduce((acc, doc) => {
        if (doc.exists()) {
          acc[doc.id] = { id: doc.id, ...doc.data() };
        }
        return acc;
      }, {});

      setUserPostsData(Object.values(postDataMap));
      setOfferedPostsData(Object.values(offeredItemDataMap));
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Failed to load some items. Please try again.");
    }
  };

  const fetchUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
      return userDoc.exists() ? userDoc.data().fcmToken : null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  const getOfferData = async (offerId) => {
    try {
      const offerDoc = await getDoc(doc(db, COLLECTIONS.EXCHANGES, offerId));
      return offerDoc.exists() ? offerDoc.data().offeredById : null;
    } catch (error) {
      console.error("Error fetching offer data:", error);
      return null;
    }
  };

 const sendNotification = (token, action) => {
  if (!token) return;

  fetch("https://notification-api-zeta.vercel.app/api/send-notification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expoPushToken: token,
      title: `${action}ed`,
      body: `Your offer has been ${action}ed`,
    }),
  }).catch((error) => console.error("Error sending notification:", error));
};

  const startChat = async (offeredPost) => {
    const selectedUserId = offeredPost.userId;
    const postId = offeredPost.id;
    const postTitle = offeredPost.title;
    const postimg = encodeURIComponent(offeredPost.images[0]); // Ensure the image URL is encoded

    setLoading(true);
    const currentUserId = currentUser.uid;
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
      setLoading(false);
      router.push({
        pathname: "/chatScreen/chatScreen",
        params: {
          chatId,
          receiverId: selectedUserId,
          isNewChat,
          title: encodeURIComponent(postTitle),
          postId,
          postimg: postimg, 
        },
      });
    } catch (error) {
      console.error("Error starting chat: ", error);
    }
  };

  const handleOfferAction = async (offerId, action) => {
    try {
      setActionLoading(offerId);
      const offerRef = doc(db, COLLECTIONS.EXCHANGES, offerId);
      const status = action === "accept" ? "accepted" : "declined";
      await updateDoc(offerRef, { status });
      setOffers((prevOffers) =>
        prevOffers.map((offer, i) =>
          offer.id === offerId ? { ...offer, status } : offer
        )
      );
      const offeredById = await getOfferData(offerId);
      console.log("Offered By ID:", offeredById);
      const fcmToken = await fetchUserData(offeredById);
      console.log("FCM Token:", fcmToken);
      await sendNotification(fcmToken, action);
    } catch (error) {
      console.error(`Error ${action}ing offer:`, error);
      Alert.alert("Error", `Failed to ${action} offer. Please try again.`);
    } finally {
      setActionLoading(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOffers();
    setRefreshing(false);
  };

  const renderOfferCard = (offer, index) => {
    const userPost = userPostsData.find((post) => post?.id === offer.postId);
    const offeredPost = offeredPostsData.find(
      (post) => post?.id === offer.offeredItemId
    );

    return (
      <Animated.View style={[styles.offerCard, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={["#ffffff", "#f8f9fa"]}
          style={styles.cardGradient}
        >
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusText,
                offer.status === "accepted"
                  ? styles.accepted
                  : offer.status === "declined"
                  ? styles.rejected
                  : styles.pending,
              ]}
            >
              {offer.status.toUpperCase()}
            </Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.itemContainer}>
              <Text style={styles.itemLabel}>Your Item</Text>
              {userPost ? (
                <View style={styles.itemDetails}>
                  <Text style={styles.itemTitle}>{userPost.title}</Text>
                  <Image
                    source={
                      userPost.images?.length > 0
                        ? { uri: userPost.images[0] }
                        : require("../../assets/images/no-image.png")
                    }
                    style={styles.itemImage}
                  />
                </View>
              ) : (
                <Text style={styles.missingText}>Item not found</Text>
              )}
            </View>

            <View style={styles.exchangeArrow}>
              <Ionicons name="swap-horizontal" size={28} color="#4a90e2" />
            </View>

            <TouchableOpacity
              style={styles.itemContainer}
              onPress={() =>
                offeredPost &&
                router.push(
                  `/postdetail/postdetail?id=${offeredPost.id}&userId=${offeredPost.userId}`
                )
              }
              disabled={!offeredPost}
            >
              <Text style={styles.itemLabel}>Offered Item</Text>
              {offeredPost ? (
                <View style={styles.itemDetails}>
                  <Text style={styles.itemTitle}>{offeredPost.title}</Text>
                  <Image
                    source={
                      offeredPost.images?.length > 0
                        ? { uri: offeredPost.images[0] }
                        : require("../../assets/images/no-image.png")
                    }
                    style={styles.itemImage}
                  />
                </View>
              ) : (
                <Text style={styles.missingText}>Item not found</Text>
              )}
            </TouchableOpacity>
          </View>

          {offer.status === "pending" ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleOfferAction(offer.id, "accept")}
                disabled={actionLoading === offer.id}
                accessibilityLabel="Accept offer"
                accessibilityRole="button"
              >
                {actionLoading === offer.id ? (
                  <CircleFade size={20} color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="white" />
                    <Text style={styles.buttonText}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => handleOfferAction(offer.id, "decline")}
                disabled={actionLoading === offer.id}
                accessibilityLabel="Decline offer"
                accessibilityRole="button"
              >
                {actionLoading === offer.id ? (
                  <CircleFade size={20} color="white" />
                ) : (
                  <>
                    <Ionicons name="close" size={20} color="white" />
                    <Text style={styles.buttonText}>Decline</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => startChat(offeredPost)}
            >
              <Text style={styles.chatButtonText}>Send in Chat</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#fffff0", "#ffffff"]} style={styles.header}>
        <Text style={styles.headerTitle}>Received Offers</Text>
      </LinearGradient>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOffers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <CircleFade size={60} color="#4a90e2" />
          <Text style={styles.loadingText}>Loading offers...</Text>
        </View>
      ) : offers.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {offers.map((offer, index) => renderOfferCard(offer, index))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={60} color="#666" />
          <Text style={styles.emptyText}>No offers available yet</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // ... existing styles ...
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#e74c3c",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#4a90e2",
    padding: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  missingText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  header: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginTop: 33,
  },
  headerTitle: {
    fontSize: 28,
   
    color: "black",
    textAlign: "center",
    marginTop:12,
    marginBottom:12,
  },
  scrollContent: {
    padding: 15,
  },
  offerCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
  },
  cardGradient: {
    padding: 15,
  },
  statusContainer: {
  
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  accepted: { color: "#27ae60" },
  rejected: { color: "#e74c3c" },
  pending: { color: "#f1c40f" },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemContainer: {
    flex: 1,
    padding: 5,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 5,
  },
  itemDetails: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  itemTitle: {
    fontSize: 10,
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  itemImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  exchangeArrow: {
    paddingHorizontal: 10,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: "#27ae60",
  },
  declineButton: {
    backgroundColor: "#e74c3c",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 5,
  },
  chatButton: {
    backgroundColor: "#007bff",
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 3,
    width: "40%",
    flex:1,
    alignItems: "center",
  },
  chatButtonText: {
    color: "#fff",
    fontSize: 14,
    padding: 5,
    borderRadius: 30,
    fontFamily: "medium",
    textAlign: "center",
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
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 20,
  },
});

export default OffersScreen;
