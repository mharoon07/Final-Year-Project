import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { db } from "./../../Firebase";
import Icon from "react-native-vector-icons/FontAwesome";
import { useLocalSearchParams } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import Toast from "react-native-toast-message";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import axios from "axios";

const { width } = Dimensions.get("window");

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "dy4ghtgca"; // Replace with your Cloudinary Cloud Name
const CLOUDINARY_UPLOAD_PRESET = "FYP_Assets";
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Custom Components
const FormField = ({ label, children }) => (
  <View style={styles.formField}>
    <Text style={styles.fieldTitle}>{label}</Text>
    {children}
  </View>
);

const ImagePreview = ({ uri, onRemove }) => (
  <Animated.View style={styles.imageWrapper}>
    <Image source={{ uri }} style={styles.image} />
    <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
      <View style={styles.removeButtonOverlay}>
        <Icon name="times" size={16} color="#fff" />
      </View>
    </TouchableOpacity>
  </Animated.View>
);

const ExchangeOptionChip = ({ option, onRemove }) => (
  <TouchableOpacity style={styles.exchangeOption} onPress={() => onRemove(option)}>
    <Text style={styles.exchangeOptionText}>{option}</Text>
    <Icon name="times" size={16} color="#555" style={styles.cancelIcon} />
  </TouchableOpacity>
);

const EditPostScreen = () => {
  const { postId } = useLocalSearchParams();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState(null);
  const [exchangeOption, setExchangeOption] = useState("");
  const [exchangeOptions, setExchangeOptions] = useState([]);
  const formAnimation = useSharedValue(0);

  const categories = useMemo(
    () => [
      { id: "Electronics", name: "Electronics" },
      { id: "Home and Furniture", name: "Home and Furniture" },
      { id: "Clothing and Accessories", name: "Clothing and Accessories" },
      { id: "Books and Media", name: "Books and Media" },
      { id: "Toys and Games", name: "Toys and Games" },
      { id: "Sports and Outdoors", name: "Sports and Outdoors" },
      { id: "Tools and Equipment", name: "Tools and Equipment" },
      { id: "Automotive", name: "Automotive" },
      { id: "Health and Beauty", name: "Health and Beauty" },
      { id: "Musical Instruments", name: "Musical Instruments" },
      { id: "Collectibles and Antiques", name: "Collectibles and Antiques" },
      { id: "Web and Software Development", name: "Web and Software Development" },
      { id: "Graphic and Design", name: "Graphic and Design" },
      { id: "Writing and Translation", name: "Writing and Translation" },
      { id: "Digital Marketing", name: "Digital Marketing" },
      { id: "Video and Animation", name: "Video and Animation" },
      { id: "Music and Audio", name: "Music and Audio" },
      { id: "Business Services", name: "Business Services" },
      { id: "Lifestyle Services", name: "Lifestyle Services" },
      { id: "Photography and Videography", name: "Photography and Videography" },
    ],
    []
  );

  // Animation styles
  const animatedFormStyle = useAnimatedStyle(() => ({
    opacity: formAnimation.value,
    transform: [{ translateY: (1 - formAnimation.value) * 20 }],
  }));

  // Form validation
  const isFormValid = title.trim() && description.trim() && category && address && exchangeOptions.length > 0;

  useEffect(() => {
    fetchPostData();
    formAnimation.value = withSpring(1, { damping: 15 });
  }, [formAnimation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (
          title ||
          description ||
          category ||
          images.length > 0 ||
          newImages.length > 0 ||
          address ||
          exchangeOptions.length > 0
        ) {
          Alert.alert(
            "Discard Changes?",
            "You have unsaved changes that will be lost.",
            [
              { text: "Keep Editing", style: "cancel" },
              { text: "Discard", style: "destructive", onPress: () => navigation.goBack() },
            ]
          );
          return true;
        }
        return false;
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [title, description, category, images, newImages, address, exchangeOptions])
  );

  useEffect(() => {
    const requestLocationPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is required to edit the post location");
      }
    };
    requestLocationPermission();
  }, []);

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

  const fetchPostData = async () => {
    try {
      const postDocRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postDocRef);
      if (postDoc.exists()) {
        const data = postDoc.data();
        setTitle(data.title);
        setDescription(data.description);
        setCategory(data.category);
        setImages(data.images || []);
        setAddress(data.address || "");
        setLocation(data.location ? { coords: data.location } : null);
        setExchangeOptions(data.exchangeOptions || []);
      } else {
        showToast("error", "Error", "Post not found");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error fetching post data:", error);
      showToast("error", "Error", "Failed to fetch post data");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showToast("error", "Permission Denied", "Location permission is required");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc);

      const readableAddress = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (readableAddress.length > 0) {
        const { street, city, subregion, region, country } = readableAddress[0];
        const formattedAddress = [street, city, subregion, region, country]
          .filter(Boolean)
          .join(", ");
        setAddress(formattedAddress);
      }
    } catch (err) {
      console.error("Error getting location:", err);
      showToast("error", "Error", "Failed to get location");
      Alert.alert("Location Error", "Failed to get your current location. Please ensure location services are enabled.");
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showToast("error", "Permission Denied", "Gallery permission is required");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - images.length - newImages.length,
      });

      if (!result.canceled && result.assets) {
        const selectedImages = result.assets.map((asset) => asset.uri);
        const totalImages = [...images, ...newImages, ...selectedImages];
        if (totalImages.length > 5) {
          Alert.alert("Too many images", "You can only upload up to 5 images per post.");
          setNewImages([...newImages, ...selectedImages].slice(0, 5 - images.length));
        } else {
          setNewImages((prev) => [...prev, ...selectedImages]);
        }
      }
    } catch (error) {
      console.error("Error picking images:", error);
      showToast("error", "Error", "Failed to pick images");
    }
  };

  const uploadImages = async () => {
    const uploadedImages = [];
    for (const imageUri of newImages) {
      try {
        const formData = new FormData();
        formData.append("file", {
          uri: imageUri,
          type: "image/jpeg",
          name: `post_${postId}_${Date.now()}.jpg`,
        });
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        const response = await axios.post(CLOUDINARY_API_URL, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data.secure_url) {
          uploadedImages.push(response.data.secure_url);
        } else {
          throw new Error("Failed to upload image to Cloudinary");
        }
      } catch (error) {
        console.error("Cloudinary upload error for image:", error);
        showToast("error", "Error", "Failed to upload one or more images");
        throw error;
      }
    }
    return uploadedImages;
  };

  const addExchangeOption = () => {
    if (exchangeOption.trim() && !exchangeOptions.includes(exchangeOption.trim())) {
      setExchangeOptions((prev) => [...prev, exchangeOption.trim()]);
      setExchangeOption("");
    }
  };

  const removeExchangeOption = (option) => {
    setExchangeOptions((prev) => prev.filter((opt) => opt !== option));
  };

  const handleUpdatePost = async () => {
    if (!isFormValid) {
      showToast("error", "Incomplete Form", "Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const uploadedImages = await uploadImages();
      const updatedImages = [...images, ...uploadedImages];

      const postRef = doc(db, "posts", postId);
      const updateData = {
        title,
        description,
        category,
        images: updatedImages,
        address,
        exchangeOptions,
      };

      // Only include location if it has been set (new or existing)
      if (location && location.coords) {
        updateData.location = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }

      await updateDoc(postRef, updateData);

      showToast("success", "Success", "Post updated successfully");
      navigation.goBack();
    } catch (error) {
      console.error("Error updating post:", error);
      showToast("error", "Error", "Failed to update post");
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (imageUri, isExisting) => {
    if (isExisting) {
      setImages((prev) => prev.filter((uri) => uri !== imageUri));
    } else {
      setNewImages((prev) => prev.filter((uri) => uri !== imageUri));
    }
  };

  const memoizedCategories = useMemo(
    () => categories.map((cat) => ({ label: cat.name, value: cat.id })),
    [categories]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.spinner}>
          <View style={styles.spinnerInner} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContainer}
        >
          <Animated.View style={[styles.formContainer, animatedFormStyle]}>
            <View style={styles.header}>
              <View style={styles.headerOverlay} />
              <Text style={styles.title}>Edit Your Post</Text>
            </View>

            <FormField label="Images">
              <View style={styles.imagePickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    onPress={handleImagePicker}
                    style={styles.addImageButton}
                  >
                    <View style={styles.addImageOverlay}>
                      <Icon name="camera" size={28} color="#1a3c34" />
                      <Text style={styles.addImageText}>Add Images</Text>
                      <Text style={styles.imageCount}>
                        {images.length + newImages.length}/5
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {images.map((imageUri, index) => (
                    <ImagePreview
                      key={`existing-${index}`}
                      uri={imageUri}
                      onRemove={() => removeImage(imageUri, true)}
                    />
                  ))}
                  {newImages.map((imageUri, index) => (
                    <ImagePreview
                      key={`new-${index}`}
                      uri={imageUri}
                      onRemove={() => removeImage(imageUri, false)}
                    />
                  ))}
                </ScrollView>
              </View>
            </FormField>

            <FormField label="Title">
              <TextInput
                placeholder="Give your post a catchy title"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                maxLength={50}
              />
              <Text style={styles.charCount}>{title.length}/50</Text>
            </FormField>

            <FormField label="Description">
              <TextInput
                placeholder="Describe your item or service in detail"
                value={description}
                onChangeText={setDescription}
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCount}>{description.length}/500</Text>
            </FormField>

            <FormField label="Category">
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={category}
                  onValueChange={(value) => setCategory(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a category" value="" />
                  {memoizedCategories.map((cat) => (
                    <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                  ))}
                </Picker>
              </View>
            </FormField>

            <FormField label="Location">
              <TouchableOpacity onPress={getCurrentLocation} style={styles.locationButton}>
                <View style={styles.locationOverlay}>
                  <Icon name="map-marker" size={24} color="#1a3c34" />
                  <Text style={styles.locationText}>
                    {address || "Get Current Location"}
                  </Text>
                </View>
              </TouchableOpacity>
            </FormField>

            <FormField label="What would you exchange for?">
              <View style={styles.exchangeContainer}>
                <View style={styles.exchangeInputContainer}>
                  <Picker
                    selectedValue={exchangeOption}
                    onValueChange={setExchangeOption}
                    style={styles.exchangePicker}
                  >
                    <Picker.Item label="Select category" value="" />
                    {memoizedCategories.map((cat) => (
                      <Picker.Item key={cat.value} label={cat.label} value={cat.label} />
                    ))}
                  </Picker>
                  <TouchableOpacity style={styles.addButton} onPress={addExchangeOption}>
                    <View style={styles.addButtonOverlay}>
                      <Icon name="plus" size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </View>
                {exchangeOptions.length > 0 && (
                  <View style={styles.exchangeOptionsContainer}>
                    {exchangeOptions.map((option, index) => (
                      <ExchangeOptionChip
                        key={index}
                        option={option}
                        onRemove={removeExchangeOption}
                      />
                    ))}
                  </View>
                )}
              </View>
            </FormField>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitButton, !isFormValid && styles.disabledButton]}
              onPress={handleUpdatePost}
              disabled={!isFormValid || loading}
            >
              <View style={styles.submitOverlay}>
                <Text style={styles.submitText}>
                  {loading ? "Updating..." : "Update Post"}
                </Text>
                {!loading && <Icon name="arrow-right" size={18} color="#fff" />}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollViewContainer: {
    paddingBottom: 30,
  },
  formContainer: {
    marginHorizontal: 16,
    marginTop: 60,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: "hidden",
  },
  header: {
    position: "relative",
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "#1a3c34",
    alignItems: "center",
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#2e7d32",
    opacity: 0.15,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  formField: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  fieldTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  picker: {
    height: 46,
  },
  imagePickerContainer: {
    flexDirection: "row",
    marginVertical: 8,
  },
  addImageButton: {
    width: 100,
    height: 100,
    marginRight: 12,
  },
  addImageOverlay: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    backgroundColor: "#f5f7fa",
  },
  addImageText: {
    marginTop: 6,
    fontSize: 14,
    color: "#1a3c34",
  },
  imageCount: {
    marginTop: 2,
    fontSize: 12,
    color: "#888",
  },
  imageWrapper: {
    width: 100,
    height: 100,
    marginRight: 12,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  removeButtonOverlay: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#d32f2f",
  },
  locationButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  locationOverlay: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f5f7fa",
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  exchangeContainer: {
    marginTop: 4,
  },
  exchangeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  exchangePicker: {
    flex: 1,
    height: 46,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
  },
  addButton: {
    marginLeft: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  addButtonOverlay: {
    width: 46,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a3c34",
  },
  exchangeOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  exchangeOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f4f8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  exchangeOptionText: {
    marginRight: 6,
    fontSize: 14,
    color: "#333",
  },
  cancelIcon: {
    padding: 2,
  },
  error: {
    color: "#d32f2f",
    marginHorizontal: 16,
    marginVertical: 8,
  },
  submitButton: {
    marginHorizontal: 16,
    marginVertical: 20,
    borderRadius: 10,
    overflow: "hidden",
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitOverlay: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "#1a3c34",
  },
  submitText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#fff",
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  spinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: "#1a3c34",
    borderTopColor: "transparent",
    animation: "spin 1s linear infinite",
  },
  spinnerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "#1a3c34",
    borderTopColor: "transparent",
    animation: "spin 1s linear infinite reverse",
  },
});

export default EditPostScreen;