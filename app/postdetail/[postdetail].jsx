import React, { useEffect, useState, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  getFirestore,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  limit,
} from "firebase/firestore";
import { db, auth } from "./../../Firebase";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  SafeAreaView,
  Animated,
  Linking,
  Alert,
  Modal,
  PanResponder,
} from "react-native";
import ImageViewing from "react-native-image-viewing";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import { Divider } from "react-native-elements";
import { CircleFade } from "react-native-animated-spinkit";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const PostDetail = () => {
  const { id, userId } = useLocalSearchParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offerloading, setOfferloading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [userData, setUserData] = useState(null);
  const [postInfo, setPostInfo] = useState(null);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [scrollY] = useState(new Animated.Value(0));
  const [waiting, setWaiting] = useState(false);
  const [matchingPosts, setMatchingPosts] = useState([]);
  const navigation = useNavigation();
  const firestore = getFirestore();
  const [result, setResult] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const animation = useRef(new Animated.Value(300)).current;
  const user = auth.currentUser;
  const [isCheckingImage, setIsCheckingImage] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

 
  const startButtonAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  };

  const stopButtonAnimation = () => {
    pulseAnim.setValue(1);
    glowAnim.setValue(0);
    Animated.loop(Animated.parallel([])).stop();
  };

  const fetchUserPosts = async () => {
    try {
      const currentUserId = user.uid;
      const postsQuery = query(
        collection(firestore, "posts"),
        where("userId", "==", currentUserId)
      );

      const querySnapshot = await getDocs(postsQuery);
      const fetchedPosts = [];
      querySnapshot.forEach((doc) => {
        fetchedPosts.push({ id: doc.id, ...doc.data() });
      });
      setOfferloading(false);
      setUserPosts(fetchedPosts);
      console.log("Fetched user posts:", fetchedPosts);
      console.log("User posts length:", fetchedPosts.length);
    } catch (error) {
      setOfferloading(false);
      console.error("Error fetching user posts:", error);
    }
  };

  const checkImageAuthenticity = async (url) => {
    if (!url) {
      Alert.alert("Error", "Please enter an image URL");
      return;
    }
    setIsCheckingImage(true);
    startButtonAnimation();
    console.log("a")
    try {
      const imageResponse = await fetch(url);
      if (!imageResponse.ok) {
        throw new Error("Failed to fetch image");
      }
console.log("b")
      const imageBlob = await imageResponse.blob();
      const formData = new FormData();
      formData.append("image", {
        uri: url,
        type: imageBlob.type || "image/jpeg",
        name: "image.jpg",
      });
console.log("f")
      const apiResponse = await fetch(
        "https://a0577464-840c-48ad-850d-1fda4d1f6c02-00-bwa23zzt1vl2.pike.replit.dev/analyze",
        {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await apiResponse.json();

      if (apiResponse.ok) {
        setResult(data);
        Alert.alert(
          "Result",
          `Filename: ${data.filename}\nAI-Generated: ${data.result.percentage}%`
        );
      } else {
        throw new Error(data.error || "Failed to analyze image");
      }
    } catch (error) {
      console.error("Error in checkImageAuthenticity:", error);
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setIsCheckingImage(false);
      stopButtonAnimation();
    }
  };

  const showModal = () => {
    fetchUserPosts();
    setModalVisible(true);
    Animated.timing(animation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideModal = () => {
    Animated.timing(animation, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        const newTranslateY = Math.max(0, Math.min(300, gestureState.dy));
        animation.setValue(newTranslateY);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          hideModal();
        } else {
          showModal();
        }
      },
    })
  ).current;

  useEffect(() => {
    const fetchMatchingPosts = async () => {
      if (post && post.exchangeOptions && post.exchangeOptions.length > 0) {
        try {
          if (post.exchangeOptions.length > 10) {
            console.warn("Too many options for 'in' query. Trimming to 10.");
            post.exchangeOptions = post.exchangeOptions.slice(0, 10);
          }
          const postsQuery = query(
            collection(firestore, "posts"),
            where("category", "in", post.exchangeOptions),
            limit(3)
          );
          const querySnapshot = await getDocs(postsQuery);
          const fetchedPosts = [];
          querySnapshot.forEach((doc) => {
            if (doc.id !== id) {
              fetchedPosts.push({ id: doc.id, ...doc.data() });
            }
          });
          setMatchingPosts(fetchedPosts);
        } catch (error) {
          console.error("Error fetching matching posts:", error);
        }
      }
    };

    fetchMatchingPosts();
  }, [post, id]);

  const handlePostSelection = (selectedPost) => {
    console.log("Selected post for exchange:", selectedPost);
    initiateExchange(selectedPost);
    hideModal();
  };

  const initiateExchange = async (selectedPost) => {
    try {
      const targetPostId = id;
      await addDoc(collection(firestore, "exchanges"), {
        postOwnerId: userId,
        offeredById: user.uid,
        offeredItemId: selectedPost.id,
        postId: targetPostId,
        status: "pending",
        timestamp: new Date(),
      });
      await checkAPI();
      console.log("Exchange offer created successfully!");
    } catch (error) {
      console.error("Error creating exchange:", error);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDocRef = doc(firestore, "users", userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          console.log("No such user document!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchPost = async () => {
      if (!id) return;
      try {
        const docRef = doc(firestore, "posts", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const postData = docSnap.data();
          setPost(docSnap.data());
          setPostInfo(postData);
          setLikeCount(postData.likeCount || 0);
          const userLikes = postData.likes || [];
          setUserHasLiked(userLikes.includes(user?.uid));
          if (!postData.viewers.includes(userId)) {
            await updateDoc(docRef, {
              views: postData.views + 1,
              viewers: arrayUnion(userId),
            });
          }
        } else {
          console.log("No such post document!");
        }
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    fetchPost();
  }, [id, userId, user?.uid]);

  const checkAPI = async () => {
    try {
      const expoPushToken = userData?.fcmToken;
      const UsersName = userData?.name;
      const postname = postInfo?.title;

      if (!expoPushToken) {
        console.error("Expo Push Token is missing");
        return;
      }

      console.log("Sending notification to token:", expoPushToken);

      const url = "https://notification-api-zeta.vercel.app/api/send-notification";

      const payload = {
        expoPushToken,
        title: UsersName,
        body: `Offer you a deal for your post ${postname} Post`,
      };

      const options = {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      };

      const response = await fetch(url, options);
      const data = await response.json();
      console.log("Notification API response:", data);
      return data;
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  };

  const daysAgo = (createdAt) => {
    if (!createdAt) return "Unknown";
    const firebaseTimestamp = createdAt;
    const dateFromTimestamp = new Date(
      firebaseTimestamp.seconds * 1000 + firebaseTimestamp.nanoseconds / 1000000
    );
    const now = new Date();
    dateFromTimestamp.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const differenceInTime = now - dateFromTimestamp;
    const differenceInDays = differenceInTime / (1000 * 3600 * 24);
    return differenceInDays > 0 ? `${Math.floor(differenceInDays)} days ago` : "Today";
  };

  const openImageViewer = (index) => {
    setImageIndex(index);
    setIsVisible(true);
  };

  const closeImageViewer = () => {
    setIsVisible(false);
  };

  if (waiting || loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircleFade size={48} color="#000" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <Text>No post found</Text>
      </View>
    );
  }

  const headerOpacity = scrollY.interpolate({
    inputRange: [50, 150],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const handleDirections = () => {
    if (post.location) {
      const { latitude, longitude } = post.location;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
      Linking.openURL(url).catch((err) =>
        console.error("An error occurred", err)
      );
    } else {
      Alert.alert("Error", "No location data available");
    }
  };

  const navigateModel = (url) => {
    if (!url) {
      Alert.alert("Generating", "Please Wait Your Model in Generating .......");

      
      return;
    }
    const htmlViewerUrl = `https://gilded-unicorn-c645da.netlify.app?model=${encodeURIComponent(url)}`;
    Linking.openURL(htmlViewerUrl).catch((err) =>
      console.error("Failed to open model viewer:", err)
    );
  };

  const callButton = (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert("Error", "No phone number available");
      return;
    }
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) => {
      console.error("Failed to make a call:", err);
      Alert.alert("Error", "Failed to make a call");
    });
  };

  const getTruncatedDescription = (text) => {
    const maxLength = 100;
    if (text.length > maxLength && !showFullDescription) {
      return `${text.substring(0, maxLength)}...`;
    }
    return text;
  };

  const startChat = async (selectedUserId) => {
    if (!user) {
      Alert.alert("Error", "Please log in to start a chat");
      return;
    }
    setWaiting(true);
    const currentUserId = user.uid;
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
      setWaiting(false);
      console.error("Error starting chat:", error);
      Alert.alert("Error", "Failed to start chat");
    }
  };

  const handleLike = async () => {
    if (!user) {
      Alert.alert("Error", "Please log in to like a post");
      return;
    }
    const postRef = doc(firestore, "posts", id);
    const userRef = doc(firestore, "users", user.uid);
    try {
      if (userHasLiked) {
        setUserHasLiked(false);
        await updateDoc(postRef, {
          likeCount: likeCount - 1,
          likes: arrayRemove(user.uid),
        });
        await updateDoc(userRef, {
          likedPosts: arrayRemove(id),
        });
        setLikeCount(likeCount - 1);
      } else {
        setUserHasLiked(true);
        await updateDoc(postRef, {
          likeCount: likeCount + 1,
          likes: arrayUnion(user.uid),
        });
        await updateDoc(userRef, {
          likedPosts: arrayUnion(id),
        });
        setLikeCount(likeCount + 1);
      }
    } catch (error) {
      console.error("Error updating like:", error);
      Alert.alert("Error", "Failed to update like");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[styles.animatedHeader, { opacity: headerOpacity }]}
      >
        <Text style={styles.headerTitle}>{post.title}</Text>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {post.images && post.images.length > 0 ? (
          <ScrollView horizontal style={styles.imageScrollView}>
            {post.images.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => openImageViewer(index)}
              >
                <Image source={{ uri: item }} style={styles.image} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Image
            source={require("../../assets/images/no-image.png")}
            style={styles.image}
          />
        )}
        <View style={styles.body}>
          <View style={styles.Header}>
            <Text style={styles.title}>{post.title}</Text>
            <Text style={styles.date}>{daysAgo(post.createdAt)}</Text>
          </View>

          <View style={styles.categoryLikeContainer}>
            <Text style={styles.type}>{post.category}</Text>
            <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
              <MaterialCommunityIcons
                name={userHasLiked ? "heart" : "heart-outline"}
                size={34}
                color={userHasLiked ? "red" : "black"}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            {getTruncatedDescription(post.description)}
            {post.description.length > 100 && (
              <Text
                style={styles.seeMoreLess}
                onPress={() => setShowFullDescription(!showFullDescription)}
              >
                {showFullDescription ? "...Less" : "More"}
              </Text>
            )}
          </Text>
          <View style={styles.views}>
            <Text>{post.views}</Text>
            <Entypo name="eye" size={18} color="black" />
          </View>
          <View style={styles.addressDiv}>
            <Entypo name="location-pin" size={24} color="black" />
            <Text style={styles.address}>{post.address || "No address provided"}</Text>
          </View>
           <View style={styles.checkImageContainer}>
            <TouchableOpacity
              onPress={() => checkImageAuthenticity(post.images?.[0])}
              style={styles.checkImageButton}
              disabled={isCheckingImage || !post.images?.[0]}
            >
              <Animated.View
                style={[
                  styles.checkImageButtonInner,
                  {
                    transform: [{ scale: pulseAnim }],
                    shadowOpacity: glowAnim,
                    shadowColor: "#007BFF",
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 0 },
                  },
                ]}
              >
                {isCheckingImage ? (
                  <>
                    <MaterialIcons
                      name="autorenew"
                      size={20}
                      color="#fff"
                      style={styles.checkImageIcon}
                    />
                    <Text style={styles.checkImageText}>Analyzing...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons
                      name="image-search"
                      size={20}
                      color="#fff"
                      style={styles.checkImageIcon}
                    />
                    <Text style={styles.checkImageText}>Check Image</Text>
                  </>
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
          <View style={styles.buttons}>
            {post.postType === "typeItem" && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.directionButton}
                  onPress={() => navigateModel(post.modelUrl)}
                >
                  <MaterialIcons name="3d-rotation" size={40} color="white" />
                </TouchableOpacity>
                <Text style={styles.cautions}>View 3D</Text>
              </View>
            )}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.directionButton}
                onPress={() => callButton(userData?.number)}
              >
                <MaterialIcons name="wifi-calling-3" size={40} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.cautions}>Call Owner</Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.directionButton}
                onPress={showModal}
              >
                <MaterialCommunityIcons name="offer" size={40} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.cautions}>Make an Offer</Text>
            </View>
          </View>
          <Modal transparent visible={modalVisible} animationType="none">
            <View style={styles.overlay}>
              <Animated.View
                style={[styles.modal, { transform: [{ translateY: animation }] }]}
                {...panResponder.panHandlers}
              >
                <TouchableOpacity style={styles.closeButton} onPress={hideModal}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.handle} />
                <Text style={styles.exchangeTitle}>Select a Post to Exchange</Text>
                <ScrollView
                  style={styles.modalScrollView}
                  showsVerticalScrollIndicator={false}
                >
                  {offerloading ? (
                    <View style={styles.loaderContainer}>
                      <CircleFade size={48} color="#000" />
                    </View>
                  ) : userPosts.length > 0 ? (
                    userPosts.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handlePostSelection(item)}
                      >
                        <View style={styles.postItem}>
                          <Text style={styles.postTitle}>{item.title}</Text>
                          {item.images && item.images.length > 0 && item.images[0] ? (
                            <Image
                              source={{ uri: item.images[0] }}
                              style={styles.postImage}
                              onError={() =>
                                console.log("Error loading image:", item.images[0])
                              }
                            />
                          ) : (
                            <Image
                              source={require("../../assets/images/no-image.png")}
                              style={styles.postImagePlaceholder}
                              resizeMode="contain"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noPostsText}>No posts available</Text>
                  )}
                </ScrollView>
              </Animated.View>
            </View>
          </Modal>

          <Divider style={styles.divider} />

          <View style={styles.postOwner}>
            <Text style={styles.listedBy}>Listed by</Text>
            <View style={styles.ownerInfo}>
              <View style={styles.profilePictureContainer}>
                {userData?.profilePicture && userData.profilePicture !== "null" ? (
                  <Image
                    source={{ uri: userData.profilePicture }}
                    style={styles.profilePicture}
                  />
                ) : (
                  <Image
                    source={require("../../assets/images/profile-icon.png")}
                    style={styles.profilePicture}
                  />
                )}
              </View>
              <View>
                <Text style={styles.ownerName}>
                  {userData?.name || "Name not available"}
                </Text>
                {user ? (
                  <>
                    <Text style={styles.ownerContact}>
                      {userData?.email || "Email not available"}
                    </Text>
                    <Text style={styles.ownerContact}>
                      {userData?.number || "Phone not available"}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.loginPrompt}>Login to see contact details</Text>
                )}
                {user && (
                  <TouchableOpacity onPress={checkAPI}>
                      {/* <Text style={styles.viewProfile}>
                        View profile <Entypo name="chevron-right" size={14} color="black" />
                      </Text> */}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          <Divider style={styles.divider} />
          <View>
            <Text style={styles.exchangeOptionsTitle}>Exchangeable Options</Text>
            <View style={styles.exchangeOptionsContainer}>
              {post.exchangeOptions?.map((option, index) => (
                <View key={`${option}-${index}`} style={styles.exchangeOption}>
                  <Text style={styles.exchangeOptionText}>{option}</Text>
                </View>
              ))}
            </View>
          </View>
          <Divider style={styles.divider} />

          {post.location ? (
            user ? (
              <View style={styles.mapContainer}>
                <ImageBackground
                  source={require("../../assets/images/map.png")}
                  style={styles.map}
                >
                  <TouchableOpacity style={styles.button} onPress={handleDirections}>
                    <Icon name="map-marker" size={20} color="#fff" style={styles.icon} />
                    <Text style={styles.buttonText}>See location</Text>
                  </TouchableOpacity>
                </ImageBackground>
              </View>
            ) : (
              <View style={styles.mapContainer}>
                <ImageBackground
                  source={require("../../assets/images/map.png")}
                  style={styles.map}
                >
                  <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText}>Login to continue</Text>
                  </TouchableOpacity>
                </ImageBackground>
              </View>
            )
          ) : (
            <Text style={styles.noLocation}>Location information is not available.</Text>
          )}

          <ImageViewing
            images={post.images?.map((uri) => ({ uri })) || []}
            imageIndex={imageIndex}
            visible={isVisible}
            onRequestClose={closeImageViewer}
          />
          <Divider style={styles.divider} />

          {matchingPosts.length > 0 ? (
            <View style={styles.matchingPostsContainer}>
              <Text style={styles.matchingPostsTitle}>You may also like</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {matchingPosts.map((matchingPost) => (
                  <TouchableOpacity
                    key={matchingPost.id}
                    style={styles.matchingPostItem}
                    onPress={() =>
                      router.push(
                        `/postdetail/postdetail?id=${matchingPost.id}&userId=${matchingPost.userId}`
                      )
                    }
                  >
                    <View style={styles.matchingPostImageContainer}>
                      {matchingPost.images?.length > 0 ? (
                        <Image
                          source={{ uri: matchingPost.images[0] }}
                          style={styles.matchingPostImage}
                        />
                      ) : (
                        <Image
                          source={require("../../assets/images/no-image.png")}
                          style={styles.matchingPostImage}
                        />
                      )}
                      <View style={styles.matchingPostOverlay}>
                        <View style={styles.matchingPostDetails}>
                          <Text style={styles.matchingPostTitle}>
                            {matchingPost.title}
                          </Text>
                          <View style={styles.matchingPostStats}>
                            <View style={styles.matchingPostStat}>
                              <AntDesign name="heart" size={14} color="#fff" />
                              <Text style={styles.matchingPostStatText}>
                                {matchingPost.likeCount || 0}
                              </Text>
                            </View>
                            <View style={styles.matchingPostStat}>
                              <Entypo name="eye" size={14} color="#fff" />
                              <Text style={styles.matchingPostStatText}>
                                {matchingPost.views || 0}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Text style={styles.matchingPostDate}>
                          {daysAgo(matchingPost.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <Text style={styles.noMatchingPosts}>No matching posts available</Text>
          )}
          <Divider style={styles.divider} />
          <View style={styles.safetySection}>
            <Text style={styles.safetyTitle}>Your safety matters to us!</Text>
            <Text style={styles.cautions}>
              • Only meet in public/crowded places.
            </Text>
            <Text style={styles.cautions}>
              • Never go alone to meet a buyer/seller, always take someone with you.
            </Text>
            <Text style={styles.cautions}>
              • Check and inspect the product properly before purchasing it.
            </Text>
            <Text style={styles.cautions}>
              • Never pay anything in advance or transfer money before inspecting the product.
            </Text>
          </View>
        </View>
      </Animated.ScrollView>
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => startChat(post.userId)}
      >
        <AntDesign name="wechat" size={34} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerContainer: {
    position: "absolute",
    top: 40,
    left: 16,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    padding: 4,
    borderRadius: 20,
  },
  animatedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(255, 255, 255, 0.99)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  headerTitle: {
    marginTop: 42,
    fontSize: 18,
    fontFamily: "medium",
  },
  imageScrollView: {
    marginBottom: 16,
    marginTop: 33,
  },
  image: {
    width: 380,
    height: 270,
    marginRight: 10,
  },
  body: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  Header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: "medium",
  },
  date: {
    fontSize: 14,
    fontFamily: "medium",
    color: "#666",
  },
  categoryLikeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  type: {
    fontSize: 12,
    fontFamily: "medium",
    color: "grey",
  },
  likeButton: {
    paddingRight: 13,
  },
  description: {
    fontSize: 13.5,
    marginBottom: 10,
    color: "rgba(0, 0, 0, 0.85)",
    fontFamily: "medium",
  },
  seeMoreLess: {
    fontSize: 12,
    color: "grey",
  },
  views: {
    flexDirection: "row",
    alignItems: "center",
    width: 43,
    justifyContent: "space-between",
    marginBottom: 13,
  },
  checkImageContainer: {
    marginVertical: 10,
    alignItems: "center",
  },
  checkImageButton: {
    borderRadius: 25,
    overflow: "hidden",
  },
  checkImageButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 5,
  },
  checkImageIcon: {
    marginRight: 8,
  },
  checkImageText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "medium",
  },
  addressDiv: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  address: {
    fontSize: 15,
    fontFamily: "medium",
    marginLeft: 5,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 20,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  directionButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 35,
    alignItems: "center",
    marginTop: 10,
    width: 65,
  },
  cautions: {
    paddingVertical: 2,
    fontFamily: "medium",
    fontSize: 13,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: 300,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: "black",
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "black",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 10,
  },
  exchangeTitle: {
    fontSize: 18,
    fontFamily: "medium",
    textAlign: "center",
    marginBottom: 10,
  },
  modalScrollView: {
    flex: 1,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  postItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 10,
  },
  postTitle: {
    fontSize: 16,
    fontFamily: "medium",
  },
  postImage: {
    width: 143,
    height: 143,
  },
  postImagePlaceholder: {
    width: 100,
    height: 40,
  },
  noPostsText: {
    textAlign: "center",
    fontSize: 16,
    fontFamily: "medium",
    color: "#666",
  },
  divider: {
    backgroundColor: "grey",
    marginHorizontal: 3,
    marginVertical: 12,
  },
  postOwner: {
    marginBottom: 10,
  },
  listedBy: {
    fontSize: 16,
    fontFamily: "medium",
    marginVertical: 4,
  },
  ownerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  profilePictureContainer: {
    marginRight: 8,
  },
  profilePicture: {
    width: 72,
    height: 72,
    borderRadius: 40,
  },
  ownerName: {
    fontSize: 15,
    fontFamily: "medium",
  },
  ownerContact: {
    fontSize: 12,
    color: "#666",
  },
  loginPrompt: {
    fontSize: 12,
    color: "red",
  },
  viewProfile: {
    fontFamily: "medium",
    fontSize: 14,
    color: "#007BFF",
  },
  exchangeOptionsTitle: {
    fontSize: 15,
    fontFamily: "regular",
    marginBottom: 4,
  },
  exchangeOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 4,
  },
  exchangeOption: {
    marginRight: 8,
    marginBottom: 8,
  },
  exchangeOptionText: {
    fontFamily: "medium",
    fontSize: 12,
    backgroundColor: "#212121",
    borderRadius: 20,
    color: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mapContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  map: {
    width: 340,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    flexDirection: "row",
    backgroundColor: "#007bff",
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  icon: {
    marginRight: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "medium",
  },
  noLocation: {
    fontSize: 16,
    color: "red",
    marginBottom: 8,
    textAlign: "center",
  },
  matchingPostsContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
    paddingBottom: 30,
  },
  matchingPostsTitle: {
    fontSize: 20,
    fontFamily: "medium",
    marginBottom: 15,
    color: "#333",
  },
  matchingPostItem: {
    width: 220,
    marginRight: 15,
    borderRadius: 12,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  matchingPostImageContainer: {
    position: "relative",
    width: "100%",
    height: 180,
  },
  matchingPostImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  matchingPostOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  matchingPostDetails: {
    marginBottom: 8,
  },
  matchingPostTitle: {
    fontSize: 16,
    fontFamily: "medium",
    color: "#fff",
    marginBottom: 4,
  },
  matchingPostStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  matchingPostStat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  matchingPostStatText: {
    fontFamily: "regular",
    fontSize: 12,
    color: "#fff",
    marginLeft: 4,
  },
  matchingPostDate: {
    fontSize: 12,
    fontFamily: "regular",
    color: "#fff",
    textAlign: "right",
  },
  noMatchingPosts: {
    textAlign: "center",
    fontSize: 16,
    fontFamily: "medium",
    color: "#666",
    marginBottom: 10,
  },
  safetySection: {
    paddingHorizontal: 3,
    paddingVertical: 23,
  },
  safetyTitle: {
    fontSize: 16,
    fontFamily: "medium",
    marginBottom: 10,
  },
  chatButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#007bff",
    paddingVertical: 13,
    width: 63,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});

export default PostDetail;