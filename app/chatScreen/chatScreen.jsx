import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  BackHandler,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { GiftedChat, Bubble, InputToolbar } from "react-native-gifted-chat";
import {
  collection,
  addDoc,
  query,
  deleteDoc as firestoreDeleteDoc,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getFirestore,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
  where,
  limit,
  startAfter,
} from "firebase/firestore";
import { auth } from "./../../Firebase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "react-native-elements";
import { launchImageLibrary } from "react-native-image-picker";
import { memo } from "react";
import uuid from "react-native-uuid";
import axios from "axios";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "42nsmsnc"; // Replace with your Cloudinary Cloud Name
const CLOUDINARY_UPLOAD_PRESET = "FYP_Assets";
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const DEFAULT_PROFILE_IMAGE =
  "https://static-00.iconduck.com/assets.00/profile-circle-icon-512x512-zxne30hp.png";
const DUMMY_POST_IMAGE =
  "https://static-00.iconduck.com/assets.00/profile-circle-icon-512x512-zxne30hp.png";

const ChatScreen = () => {
  const {
    chatId,
    receiverId,
    isNewChat = "false",
    title: encodedPostTitle,
    postId,
    postimg: encodedPostImage,
  } = useLocalSearchParams();

  const postTitle = encodedPostTitle
    ? decodeURIComponent(encodedPostTitle)
    : "";
  const postImage = encodedPostImage
    ? decodeURIComponent(encodedPostImage)
    : "";

  const router = useRouter();
  const firestore = getFirestore();
  const currentUserId = auth.currentUser?.uid;

  let userToken = "";
  // Consolidated state
  const [chatState, setChatState] = useState({
    messages: [],
    isMessageSent: false,
    hasMoreMessages: true,
    isLoadingEarlier: false,
    isTyping: false,
    selectedImage: null,
    lastVisible: null,
  });

  const [userState, setUserState] = useState({
    currentUserName: "",
    receiverName: "App User",
    receiverToken: "",
    profilePicture: DEFAULT_PROFILE_IMAGE,
    receiverData: null,
    isUserDataLoaded: false,
  });

  const [uploadingImages, setUploadingImages] = useState({});

  // Memoized user object for GiftedChat
  const user = useMemo(
    () => ({ _id: currentUserId || "unknown" }),
    [currentUserId]
  );

  // Handle back button and cleanup for empty chats
  const handleBackPress = useCallback(() => {
    if (isNewChat === "true" && !chatState.isMessageSent) {
      const chatRef = doc(firestore, "chats", chatId);
      firestoreDeleteDoc(chatRef).catch((error) =>
        console.error("Error deleting empty chat:", error)
      );
    }
    router.back();
    return true;
  }, [chatId, firestore, isNewChat, chatState.isMessageSent, router]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );
    return () => backHandler.remove();
  }, [handleBackPress]);

  // Fetch user data once
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUserId || !receiverId) return;

      try {
        const [receiverSnap, currentUserSnap] = await Promise.all([
          getDoc(doc(firestore, "users", receiverId)),
          getDoc(doc(firestore, "users", currentUserId)),
        ]);

        const userData = {
          receiverName: "App User",
          profilePicture: DEFAULT_PROFILE_IMAGE,
          receiverToken: "",
          currentUserName: "",
          receiverData: null,
          isUserDataLoaded: true,
        };

        if (receiverSnap.exists()) {
          const receiverData = receiverSnap.data();
          userData.receiverName = receiverData.name || "App User";
          userData.profilePicture =
            receiverData.profilePicture || DEFAULT_PROFILE_IMAGE;
          userData.receiverToken = receiverData.fcmToken || "";
          userToken = receiverData.fcmToken || "";
          console.log("Receiver token:", userToken);
          userData.receiverData = receiverData;
        }

        if (currentUserSnap.exists()) {
          userData.currentUserName = currentUserSnap.data().name || "You";
        }

        setUserState(userData);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserState((prev) => ({ ...prev, isUserDataLoaded: true }));
      }
    };

    fetchUserData();
  }, [currentUserId, receiverId, firestore]);

  // Handle initial post message if needed
  useEffect(() => {
    if (
      postTitle &&
      postId &&
      !chatState.isMessageSent &&
      userState.isUserDataLoaded &&
      userState.receiverToken
    ) {
      sendPostMessage(postTitle, postId);
    }
  }, [
    postTitle,
    postId,
    chatState.isMessageSent,
    userState.isUserDataLoaded,
    userState.receiverToken,
  ]);

  // Combined Firebase listeners for messages, typing status, and read status
  useEffect(() => {
    if (!currentUserId || !chatId || !receiverId) {
      Alert.alert("Error", "Invalid chat configuration.");
      router.back();
      return;
    }

    // Messages listener
    const messagesQuery = query(
      collection(firestore, "chats", chatId, "messages"),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    // Chat data listener (for typing and read status)
    const chatRef = doc(firestore, "chats", chatId);

    const unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const lastVisible = snapshot.docs[snapshot.docs.length - 1];
          const loadedMessages = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              _id: doc.id,
              text: data.message || "",
              createdAt: data.timestamp?.toDate() || new Date(),
              user: { _id: data.senderId || "unknown" },
              image: data.image || null,
              post: data.post || null,
              readStatus: data.readStatus || false,
            };
          });

          setChatState((prev) => ({
            ...prev,
            messages: loadedMessages,
            lastVisible,
          }));
        } else {
          setChatState((prev) => ({
            ...prev,
            hasMoreMessages: false,
          }));
        }
      },
      (error) => {
        console.error("Error fetching messages:", error);
        Alert.alert("Error", "Failed to load messages.");
      }
    );

    const unsubscribeChat = onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const chatData = snapshot.data();

        // Check typing status
        let isTyping = false;
        if (chatData.typing && chatData.typing[receiverId]) {
          const typingTimestamp = chatData.typing[receiverId].toDate();
          const now = new Date();
          isTyping = now - typingTimestamp < 5000;
        }

        // Update message read status
        if (
          chatData.lastReadTimestamps &&
          chatData.lastReadTimestamps[receiverId]
        ) {
          const readTimestamp = chatData.lastReadTimestamps[receiverId];
          setChatState((prev) => ({
            ...prev,
            messages: prev.messages.map((msg) => {
              if (
                msg.user._id === currentUserId &&
                msg.createdAt <= new Date(readTimestamp)
              ) {
                return { ...msg, readStatus: true };
              }
              return msg;
            }),
            isTyping,
          }));
        } else {
          setChatState((prev) => ({
            ...prev,
            isTyping,
          }));
        }
      }
    });

    // Mark messages as seen periodically
    const markMessagesAsSeen = async () => {
      try {
        const q = query(
          collection(firestore, "chats", chatId, "messages"),
          where("senderId", "==", receiverId),
          where("readStatus", "==", false)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(firestore);
        snapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { readStatus: true });
        });
        batch.update(chatRef, {
          [`lastReadTimestamps.${currentUserId}`]: serverTimestamp(),
        });
        await batch.commit();
      } catch (error) {
        console.error("Error marking messages as seen:", error);
      }
    };

    markMessagesAsSeen();
    const markSeenInterval = setInterval(markMessagesAsSeen, 5000);

    return () => {
      unsubscribeMessages();
      unsubscribeChat();
      clearInterval(markSeenInterval);
    };
  }, [chatId, receiverId, currentUserId, firestore, router]);

  // Image upload function for Cloudinary
  const uploadImageToCloudinary = async (uri, messageId) => {
    try {
      setUploadingImages((prev) => ({ ...prev, [messageId]: true }));

      const formData = new FormData();
      formData.append("file", {
        uri: uri,
        type: "image/jpeg",
        name: `chat_${chatId}_${messageId}.jpg`,
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await axios.post(CLOUDINARY_API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!response.data.secure_url) {
        throw new Error("Failed to upload image to Cloudinary");
      }

      const downloadUrl = response.data.secure_url;

      const messagesRef = collection(firestore, "chats", chatId, "messages");
      const q = query(messagesRef, where("localImageId", "==", messageId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, {
          image: downloadUrl,
          localImageId: null,
        });
      }

      setChatState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg._id === messageId ? { ...msg, image: downloadUrl } : msg
        ),
      }));

      return downloadUrl;
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      setChatState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg._id === messageId ? { ...msg, uploadError: true } : msg
        ),
      }));
      return null;
    } finally {
      setUploadingImages((prev) => {
        const newState = { ...prev };
        delete newState[messageId];
        return newState;
      });
    }
  };

  // Notification function
  const sendNotification = useCallback((message, token, senderName) => {
    if (!token) return;

    fetch("https://notification-api-zeta.vercel.app/api/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expoPushToken: userToken,
        title: "New Message",
        body: `${senderName}: ${message}`,
      }),
    }).catch((error) => console.error("Error sending notification:", error));
  }, []);

  // Load more messages function
  const loadMoreMessages = useCallback(async () => {
    if (
      !chatState.hasMoreMessages ||
      chatState.isLoadingEarlier ||
      !chatState.lastVisible
    )
      return;

    setChatState((prev) => ({ ...prev, isLoadingEarlier: true }));

    try {
      const q = query(
        collection(firestore, "chats", chatId, "messages"),
        orderBy("timestamp", "desc"),
        startAfter(chatState.lastVisible),
        limit(20)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setChatState((prev) => ({
          ...prev,
          hasMoreMessages: false,
          isLoadingEarlier: false,
        }));
        return;
      }

      const newMessages = snapshot.docs.map((doc) => ({
        _id: doc.id,
        text: doc.data().message || "",
        createdAt: doc.data().timestamp?.toDate() || new Date(),
        user: { _id: doc.data().senderId || "unknown" },
        image: doc.data().image || null,
        post: doc.data().post || null,
        readStatus: doc.data().readStatus || false,
      }));

      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, ...newMessages],
        lastVisible: snapshot.docs[snapshot.docs.length - 1],
        isLoadingEarlier: false,
      }));
    } catch (error) {
      console.error("Error loading more messages:", error);
      setChatState((prev) => ({ ...prev, isLoadingEarlier: false }));
    }
  }, [
    chatId,
    chatState.lastVisible,
    chatState.hasMoreMessages,
    chatState.isLoadingEarlier,
    firestore,
  ]);

  // Update typing status function
  const updateTypingStatus = useCallback(
    (text) => {
      const isTyping = text.length > 0;
      updateDoc(doc(firestore, "chats", chatId), {
        [`typing.${currentUserId}`]: isTyping ? serverTimestamp() : null,
      }).catch((error) =>
        console.error("Error updating typing status:", error)
      );
    },
    [chatId, currentUserId, firestore]
  );

  // Send message function
  const onSend = useCallback(
    async (newMessages = []) => {
      if (!newMessages.length) return;

      const newMessage = newMessages[0];
      const messageId = newMessage._id;
      const hasImage = !!newMessage.image;

      try {
        // Prepare message data
        const messageData = {
          senderId: currentUserId,
          message: newMessage.text || "",
          timestamp: serverTimestamp(),
          readStatus: false,
        };

        if (hasImage) {
          messageData.localImageId = messageId;
          messageData.image = newMessage.image;
        }

        // Add message to Firestore
        await addDoc(
          collection(firestore, "chats", chatId, "messages"),
          messageData
        );

        // Update chat metadata
        await updateDoc(doc(firestore, "chats", chatId), {
          lastMessage: messageData.message || (hasImage ? "Image" : ""),
          lastMessageTimestamp: serverTimestamp(),
          lastSenderId: currentUserId,
        });

        // Send notification
        if (userState.receiverToken) {
          sendNotification(
            messageData.message || "Sent an image",
            userState.receiverToken,
            userState.currentUserName
          );
        }

        // Update local state only for message sent flag
        setChatState((prev) => ({
          ...prev,
          isMessageSent: true,
        }));

        // Upload image if needed
        if (hasImage) {
          uploadImageToCloudinary(newMessage.image, messageId);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        Alert.alert("Error", "Failed to send message.");
      }
    },
    [
      chatId,
      currentUserId,
      firestore,
      userState.receiverToken,
      userState.currentUserName,
      sendNotification,
    ]
  );

  // Fetch post image function
  const fetchpostimg = (pid) => {
    return new Promise((resolve, reject) => {
      const docRef = doc(firestore, "posts", pid);
      getDoc(docRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const images = data.images;
            if (Array.isArray(images) && images.length > 0) {
              console.log("Post image found:", images[0]);
              resolve(images[0]);
            } else {
              console.log("No images found in post, using default");
              resolve(DUMMY_POST_IMAGE);
            }
          } else {
            console.log("No such post document!");
            resolve(DUMMY_POST_IMAGE);
          }
        })
        .catch((error) => {
          console.error("Error fetching post image:", error);
          reject(error);
        });
    });
  };

  // Send post message function
  const sendPostMessage = useCallback(
    async (postTitle, postId) => {
      try {
        console.log(
          "Sending post message with title:",
          postTitle,
          "and ID:",
          postId
        );

        const postImageUrl = await fetchpostimg(postId);
        console.log("Retrieved post image URL:", postImageUrl);

        const messageId = uuid.v4();
        const messageData = {
          senderId: currentUserId,
          message: "",
          timestamp: serverTimestamp(),
          readStatus: false,
          post: {
            title: postTitle,
            image: postImageUrl,
            postId: postId,
          },
        };

        console.log("Creating message with post data:", messageData.post);

        await addDoc(
          collection(firestore, "chats", chatId, "messages"),
          messageData
        );

        await updateDoc(doc(firestore, "chats", chatId), {
          lastMessage: "Shared a post",
          lastMessageTimestamp: serverTimestamp(),
          lastSenderId: currentUserId,
        });

        if (userState.receiverToken) {
          sendNotification(
            "Shared a post",
            userState.receiverToken,
            userState.currentUserName
          );
        }

        setChatState((prev) => ({
          ...prev,
          isMessageSent: true,
        }));
      } catch (error) {
        console.error("Error sending post message:", error);
        Alert.alert("Error", "Failed to send post message.");
      }
    },
    [
      chatId,
      currentUserId,
      firestore,
      userState.receiverToken,
      userState.currentUserName,
      sendNotification,
    ]
  );

  // Image selection function
  const selectImage = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        includeBase64: false,
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (!result.didCancel && result.assets?.[0]?.uri) {
        const imageUri = result.assets[0].uri;
        const newMessage = {
          _id: uuid.v4(),
          text: "",
          createdAt: new Date(),
          user: { _id: currentUserId },
          image: imageUri,
        };
        onSend([newMessage]);
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      Alert.alert("Error", "Failed to select image.");
    }
  }, [currentUserId, onSend]);

  // Retry image upload function
  const retryImageUpload = useCallback((message) => {
    if (message.image && message.uploadError) {
      setChatState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg._id === message._id
            ? { ...msg, uploadError: false, isUploading: true }
            : msg
        ),
      }));
      uploadImageToCloudinary(message.image, message._id);
    }
  }, []);

  // Empty chat renderer
  const renderEmptyChat = useCallback(() => {
    if (chatState.messages.length === 0) {
      return (
        <View style={styles.emptyChatContainer}>
          <Icon name="chat-bubble-outline" size={60} color="#075E54" />
          <Text style={styles.emptyChatText}>Start a conversation</Text>
          <Text style={styles.emptyChatSubtext}>
            Send a message to start chatting with {userState.receiverName}
          </Text>
        </View>
      );
    }
    return null;
  }, [chatState.messages.length, userState.receiverName]);

  // Bubble renderer
  const renderBubble = useCallback(
    (props) => {
      const { currentMessage } = props;
      const isCurrentUser = currentMessage.user._id === currentUserId;
      const isUploading =
        uploadingImages[currentMessage._id] || currentMessage.isUploading;
      const hasUploadError = currentMessage.uploadError;

      if (currentMessage.post) {
        return (
          <View
            style={{
              alignItems: isCurrentUser ? "flex-end" : "flex-start",
              marginVertical: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                if (currentMessage.post.postId) {
                  router.push(
                    `/postdetail/postdetail?id=${currentMessage.post.postId}&userId=${receiverId}`
                  );
                }
              }}
              disabled={!currentMessage.post.postId}
            >
              <View style={styles.postContainer}>
                <Image
                  source={{
                    uri: currentMessage.post.image || DUMMY_POST_IMAGE,
                  }}
                  style={styles.postImage}
                  resizeMode="cover"
                  defaultSource={require("../../assets/images/profile-icon.png")}
                  onError={(error) => {
                    console.log(
                      "Post image load error:",
                      error.nativeEvent.error
                    );
                  }}
                />
                <View style={styles.postTitleContainer}>
                  <Text style={styles.postTitle}>
                    {currentMessage.post.title}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            {isCurrentUser && (
              <Text style={styles.messageStatus}>
                {currentMessage.readStatus ? "Seen" : "Sent"}
              </Text>
            )}
          </View>
        );
      }

      return (
        <View
          style={{
            alignItems: isCurrentUser ? "flex-end" : "flex-start",
            marginVertical: 4,
          }}
        >
          <Bubble
            {...props}
            wrapperStyle={{
              left: styles.leftBubble,
              right: styles.rightBubble,
            }}
            textStyle={{
              left: styles.leftText,
              right: styles.rightText,
            }}
            renderMessageImage={() =>
              currentMessage.image ? (
                <TouchableOpacity
                  onPress={() =>
                    setChatState((prev) => ({
                      ...prev,
                      selectedImage: currentMessage.image,
                    }))
                  }
                  style={styles.messageImageContainer}
                >
                  <Image
                    source={{
                      uri:
                        currentMessage.image &&
                        typeof currentMessage.image === "string"
                          ? currentMessage.image
                          : DUMMY_POST_IMAGE,
                    }}
                    style={styles.messageImage}
                    resizeMode="cover"
                    defaultSource={require("../../assets/images/profile-icon.png")}
                    onError={(error) => {
                      console.log(
                        "Message image load error:",
                        error.nativeEvent.error
                      );
                    }}
                  />
                  {isUploading && (
                    <View style={styles.imageOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  )}
                  {hasUploadError && (
                    <View
                      style={[
                        styles.imageOverlay,
                        { backgroundColor: "rgba(255, 0, 0, 0.6)" },
                      ]}
                    >
                      <Icon name="error-outline" size={24} color="#fff" />
                      <Text style={styles.uploadingText}>Upload failed</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : null
            }
          />
          {isCurrentUser && (
            <Text style={styles.messageStatus}>
              {currentMessage.readStatus
                ? "Seen"
                : isUploading
                ? "Uploading..."
                : "Sent"}
            </Text>
          )}
        </View>
      );
    },
    [currentUserId, uploadingImages, router, receiverId]
  );

  // Other UI renderers
  const renderLoading = useCallback(
    () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
      </View>
    ),
    []
  );

  const renderInputToolbar = useCallback(
    (props) => (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        renderActions={() => (
          <TouchableOpacity onPress={selectImage} style={styles.imageButton}>
            <Icon name="image" color="#075E54" size={24} />
          </TouchableOpacity>
        )}
      />
    ),
    [selectImage]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.headerButton}>
          <Icon name="arrow-back" color="#fff" size={24} />
        </TouchableOpacity>
        <Image
          source={{ uri: userState.profilePicture }}
          style={styles.profileImage}
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.receiverName} numberOfLines={1}>
            {userState.receiverName}
          </Text>
          {chatState.isTyping && (
            <Text style={styles.typingIndicator}>typing...</Text>
          )}
        </View>
      </View>

      {renderEmptyChat()}

      <GiftedChat
        messages={chatState.messages}
        onSend={onSend}
        user={user}
        renderBubble={renderBubble}
        renderInputToolbar={renderInputToolbar}
        renderLoading={renderLoading}
        placeholder="Type a message..."
        loadEarlier={chatState.hasMoreMessages}
        onLoadEarlier={loadMoreMessages}
        isLoadingEarlier={chatState.isLoadingEarlier}
        isTyping={chatState.isTyping}
        onInputTextChanged={updateTypingStatus}
        onLongPress={(context, message) => {
          if (message.uploadError) {
            Alert.alert(
              "Retry Upload",
              "Would you like to retry uploading this image?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Retry", onPress: () => retryImageUpload(message) },
              ]
            );
          }
        }}
        scrollToBottom
        infiniteScroll
      />

      <Modal
        visible={!!chatState.selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setChatState((prev) => ({ ...prev, selectedImage: null }))
        }
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() =>
              setChatState((prev) => ({ ...prev, selectedImage: null }))
            }
          >
            <Icon name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {chatState.selectedImage ? (
            <Image
              source={{ uri: chatState.selectedImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.errorText}>Image not available</Text>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#075E54",
    padding: 10,
    paddingTop: 35,
    elevation: 2,
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#ddd",
  },
  receiverName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  typingIndicator: {
    color: "#e0e0e0",
    fontSize: 12,
    fontStyle: "italic",
  },
  inputToolbar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingVertical: 4,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  imageButton: {
    padding: 8,
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageImageContainer: {
    position: "relative",
    borderRadius: 8,
    marginVertical: 5,
    overflow: "hidden",
  },
  messageImage: {
    width: 150,
    height: 100,
    borderRadius: 8,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: {
    color: "#fff",
    fontSize: 10,
    marginTop: 4,
  },
  messageStatus: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
    marginRight: 10,
  },
  leftBubble: {
    backgroundColor: "#e0e0e0",
    marginRight: "15%",
    marginLeft: 10,
    borderRadius: 12,
  },
  rightBubble: {
    backgroundColor: "#075E54",
    marginLeft: "15%",
    marginRight: 10,
    borderRadius: 12,
  },
  leftText: {
    color: "#000",
  },
  rightText: {
    color: "#fff",
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyChatText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 16,
    textAlign: "center",
  },
  emptyChatSubtext: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: "90%",
    height: "80%",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    padding: 8,
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
  },
  postContainer: {
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    width: 200,
    marginVertical: 5,
    overflow: "visible",
  },
  postImage: {
    width: 200,
    height: 100,
    backgroundColor: "#ccc",
  },
  postTitleContainer: {
    padding: 10,
    backgroundColor: "#fff",
  },
  postTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
});

export default memo(ChatScreen);
