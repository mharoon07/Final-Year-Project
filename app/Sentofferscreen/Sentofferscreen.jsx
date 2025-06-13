import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getFirestore,
  getDoc,
  addDoc,
} from "firebase/firestore";
import { auth } from "../../Firebase";
import { CircleFade } from "react-native-animated-spinkit";
import { TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const cardWidth = width * 0.9;

const OffersScreen = () => {
  const [offers, setOffers] = useState([]);
  const [targetPostsData, setTargetPostsData] = useState([]);
  const [myPostsData, setMyPostsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;
  const db = getFirestore();
  const firestore = getFirestore();

  useEffect(() => {
    const fetchOffers = async () => {
      if (!currentUser) {
        console.log("No user is logged in");
        setLoading(false);
        return;
      }
      try {
        const offersQuery = query(
          collection(db, "exchanges"),
          where("offeredById", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(offersQuery);
        const fetchedOffers = [];
        querySnapshot.forEach((doc) => {
          fetchedOffers.push({ id: doc.id, ...doc.data() });
        });

        setOffers(fetchedOffers);
        await fetchPostsData(fetchedOffers);
      } catch (error) {
        console.error("Error fetching offers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [currentUser]);

  const fetchPostsData = async (offers) => {
    if (offers.length === 0) {
      return;
    }

    try {
      const fetchedData = await Promise.all(
        offers.map(async (offer) => {
          const targetpostRef = doc(db, "posts", offer.postId);
          const mypostRef = doc(db, "posts", offer.offeredItemId);

          const [postDoc, offeredItemDoc] = await Promise.all([
            getDoc(targetpostRef),
            getDoc(mypostRef),
          ]);

          const targetpostData = postDoc.exists()
            ? { id: postDoc.id, ...postDoc.data() }
            : null;
          const myItemData = offeredItemDoc.exists()
            ? { id: offeredItemDoc.id, ...offeredItemDoc.data() }
            : null;

          return {
            postId: offer.postId,
            offeredItemId: offer.offeredItemId,
            targetpostData,
            myItemData,
          };
        })
      );

      const validTargetPostData = fetchedData
        .filter((item) => item.targetpostData !== null)
        .map((item) => item.targetpostData);

      const validMyItemData = fetchedData
        .filter((item) => item.myItemData !== null)
        .map((item) => item.myItemData);

      setTargetPostsData(validTargetPostData);
      setMyPostsData(validMyItemData);
    } catch (error) {
      console.error("Error fetching posts and offered items:", error);
    }
  };

  const startChat = async (targetPost, offerId) => {
    if (!targetPost) {
      console.error("No target post data available");
      return;
    }

    const selectedUserId = targetPost.userId;
    const postId = targetPost.id;
    const postTitle = targetPost.title;
    const postimg =
      targetPost.images && targetPost.images.length > 0
        ? encodeURIComponent(targetPost.images[0])
        : "";

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
          offerId: offerId, // Passing the offer ID to reference in chat if needed
        },
      });
    } catch (error) {
      console.error("Error starting chat: ", error);
      setLoading(false);
    }
  };

  const handleOfferAction = async (offerId, action) => {
    try {
      const offerRef = doc(db, "exchanges", offerId);
      const status = action === "accept" ? "accepted" : "declined";
      await updateDoc(offerRef, { status });

      setOffers((prevOffers) =>
        prevOffers.map((offer) =>
          offer.id === offerId ? { ...offer, status } : offer
        )
      );
      console.log(`Offer ${status} successfully.`);
    } catch (error) {
      console.error(
        `Error ${action === "accept" ? "accepting" : "declining"} offer:`,
        error
      );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "accepted":
        return "#4CAF50";
      case "rejected":
        return "#F44336";
      case "pending":
        return "#FF9800";
      default:
        return "#757575";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "accepted":
        return "check-circle";
      case "rejected":
        return "close-circle";
      case "pending":
        return "clock-outline";
      default:
        return "help-circle";
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialCommunityIcons
        name="swap-horizontal"
        size={80}
        color="#C0C0C0"
      />
      <Text style={styles.emptyStateText}>No offers available</Text>
      <Text style={styles.emptyStateSubText}>
        When you make offers on items, they will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <View style={styles.header}>
        <Text style={styles.title}>My Offers</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <CircleFade size={48} color="#007BFF" />
          <Text style={styles.loadingText}>Loading your offers...</Text>
        </View>
      ) : offers.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {offers.map((offer, index) => (
            <View key={offer.id} style={styles.offerContainer}>
              <View style={styles.statusBar}>
                <View style={styles.statusContainer}>
                  <MaterialCommunityIcons
                    name={getStatusIcon(offer.status)}
                    size={18}
                    color={getStatusColor(offer.status)}
                  />
                  <Text
                    style={[
                      styles.offerStatus,
                      { color: getStatusColor(offer.status) },
                    ]}
                  >
                    {offer.status.charAt(0).toUpperCase() +
                      offer.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.itemContainer}>
                  {myPostsData[index] && (
                    <>
                      <Text style={styles.heading}>Your Item</Text>
                      <TouchableOpacity
                        onPress={() => {
                          router.push(
                            `/postdetail/postdetail?id=${myPostsData[index].id}&userId=${myPostsData[index].userId}`
                          );
                        }}
                      >
                        <View style={styles.imageContainer}>
                          {myPostsData[index].images &&
                          myPostsData[index].images.length > 0 ? (
                            <Image
                              source={{ uri: myPostsData[index].images[0] }}
                              style={styles.itemImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.noImageContainer}>
                              <MaterialCommunityIcons
                                name="image-off"
                                size={32}
                                color="#C0C0C0"
                              />
                            </View>
                          )}
                        </View>
                        <Text style={styles.postTitle} numberOfLines={2}>
                          {myPostsData[index].title}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={24}
                    color="#007BFF"
                  />
                </View>

                <View style={styles.itemContainer}>
                  {targetPostsData[index] && (
                    <>
                      <Text style={styles.heading}>Target Item</Text>
                      <TouchableOpacity
                        onPress={() => {
                          router.push(
                            `/postdetail/postdetail?id=${targetPostsData[index].id}&userId=${targetPostsData[index].userId}`
                          );
                        }}
                      >
                        <View style={styles.imageContainer}>
                          {targetPostsData[index].images &&
                          targetPostsData[index].images.length > 0 ? (
                            <Image
                              source={{ uri: targetPostsData[index].images[0] }}
                              style={styles.itemImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.noImageContainer}>
                              <MaterialCommunityIcons
                                name="image-off"
                                size={32}
                                color="#C0C0C0"
                              />
                            </View>
                          )}
                        </View>
                        <Text style={styles.postTitle} numberOfLines={2}>
                          {targetPostsData[index].title}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => startChat(targetPostsData[index], offer.id)}
              >
                <MaterialCommunityIcons name="chat" size={16} color="#FFFFFF" />
                <Text style={styles.chatButtonText}>Message</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        renderEmptyState()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    marginTop: 34,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  title: {
    fontSize: 24,
    fontFamily: "medium",
    color: "#212529",
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  offerContainer: {
    marginVertical: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    width: cardWidth,
    alignSelf: "center",
    overflow: "hidden",
  },
  statusBar: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  offerStatus: {
    fontSize: 14,
    fontFamily: "medium",
    marginLeft: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
  },
  itemContainer: {
    flex: 1,
    alignItems: "center",
  },
  iconContainer: {
    paddingHorizontal: 10,
    alignItems: "center",
  },
  exchangeIcon: {
    fontSize: 24,
    color: "#007BFF",
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
    marginVertical: 8,
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  noImageContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    fontSize: 15,
    fontFamily: "Bold",
    color: "#343A40",
    marginBottom: 2,
  },
  postTitle: {
    fontSize: 13,
    fontFamily: "medium",
    textAlign: "center",
    color: "#495057",
    width: 120,
  },
  chatButton: {
    backgroundColor: "#007BFF",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 15,
    marginBottom: 15,
  },
  chatButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "medium",
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#6C757D",
    fontFamily: "medium",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyStateText: {
    marginTop: 15,
    fontSize: 18,
    fontFamily: "medium",
    color: "#343A40",
  },
  emptyStateSubText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6C757D",
    textAlign: "center",
    fontFamily: "medium",
  },
});

export default OffersScreen;
