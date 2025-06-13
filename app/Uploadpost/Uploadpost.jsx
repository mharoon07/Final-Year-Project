import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  BackHandler,
  TouchableOpacity,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./../../Firebase";
import { Picker } from "@react-native-picker/picker";
import Icon from "react-native-vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import Loader from "./../../components/Loader";
import { categories } from "../../components/categories";
import axios from "axios";
import { debounce } from "lodash";

const { width } = Dimensions.get("window");
// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "dy4ghtgca";
const CLOUDINARY_UPLOAD_PRESET = "FYP_Assets";
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Custom components
const FormField = ({ label, children }) => (
  <View style={styles.formField}>
    <Text style={styles.fieldTitle}>{label}</Text>
    {children}
  </View>
);

const ImagePreview = ({ uri, onRemove, isModelImage = false }) => (
  <Animated.View style={styles.imageWrapper}>
    <Image source={{ uri }} style={styles.image} />
    <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
      <LinearGradient
        colors={["#ff5252", "#ff1744"]}
        style={styles.removeButtonGradient}
      >
        <Icon name="times" size={16} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
    {isModelImage && (
      <View style={styles.modelImageBadge}>
        <Text style={styles.modelImageBadgeText}>3D Model</Text>
      </View>
    )}
  </Animated.View>
);

const ExchangeOptionChip = ({ option, onRemove }) => (
  <TouchableOpacity style={styles.exchangeOption} onPress={onRemove}>
    <Text style={styles.exchangeOptionText}>{option}</Text>
    <Icon name="times" size={16} color="#555" style={styles.cancelIcon} />
  </TouchableOpacity>
);

const PostUploadScreen = () => {
  const { postType } = useLocalSearchParams();
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState([]);
  const [modelImage, setModelImage] = useState(null);
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState(null);
  const [exchangeOption, setExchangeOption] = useState("");
  const [exchangeOptions, setExchangeOptions] = useState([]);
  const [create3DModel, setCreate3DModel] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressPhase, setProgressPhase] = useState("");
  const formAnimation = useSharedValue(0);

  // Validation
  const isFormValid =
    title.trim() !== "" &&
    description.trim() !== "" &&
    category !== "" &&
    images.length > 0 &&
    address !== "" &&
    location !== null &&
    exchangeOptions.length > 0;

  // Animation styles
  const animatedFormStyle = useAnimatedStyle(() => ({
    opacity: formAnimation.value,
    transform: [{ translateY: (1 - formAnimation.value) * 20 }],
  }));

  // Debounced progress update
  const debouncedSetProgress = useCallback(
    debounce((value) => setProgress(value), 100),
    []
  );

  // Memoized input handlers
  const handleTitleChange = useCallback((text) => setTitle(text), []);
  const handleDescriptionChange = useCallback(
    (text) => setDescription(text),
    []
  );

  // Effects
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (
          title ||
          description ||
          category ||
          images.length > 0 ||
          address ||
          modelImage ||
          exchangeOptions.length > 0
        ) {
          Alert.alert(
            "Discard Changes?",
            "You have unsaved changes that will be lost.",
            [
              { text: "Keep Editing", style: "cancel" },
              {
                text: "Discard",
                style: "destructive",
                onPress: () => router.back(),
              },
            ]
          );
          return true;
        }
        return false;
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      formAnimation.value = withSpring(1, { damping: 15 });

      const requestLocationPermission = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission is required for this feature");
        }
      };
      requestLocationPermission();

      return () =>
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [])
  );

  // Helper functions
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

  // Location functions
  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc);

      let readableAddress = await Location.reverseGeocodeAsync({
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
      setError("Failed to get location. Please try again.");
      Alert.alert("Location Error", "Failed to get your current location.");
    } finally {
      setLoading(false);
    }
  };

  // Image handling for post images
  const handleImagePicker = () => {
    Alert.alert("Select Image Source", "Choose where to get the image from:", [
      {
        text: "Camera",
        onPress: async () => {
          try {
            const { status } =
              await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
              setError("Camera permission is required to take photos");
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
            });

            if (!result.canceled && result.assets) {
              const newImages = [...images, ...result.assets];
              if (newImages.length > 5) {
                Alert.alert(
                  "Too many images",
                  "You can only upload up to 5 images per post."
                );
                setImages(newImages.slice(0, 5));
              } else {
                setImages(newImages);
              }
            }
          } catch (error) {
            console.error("Camera error:", error);
            setError("Failed to capture image");
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          try {
            const { status } =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
              setError("Gallery permission is required to select images");
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsMultipleSelection: true,
              quality: 0.8,
              selectionLimit: 5 - images.length,
            });

            if (!result.canceled && result.assets) {
              const newImages = [...images, ...result.assets];
              if (newImages.length > 5) {
                Alert.alert(
                  "Too many images",
                  "You can only upload up to 5 images per post."
                );
                setImages(newImages.slice(0, 5));
              } else {
                setImages(newImages);
              }
            }
          } catch (error) {
            console.error("Image picker error:", error);
            setError("Failed to open image picker");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Image handling for 3D model image
  const handleModelImagePicker = () => {
    Alert.alert(
      "Select Image Source",
      "Choose where to get the 3D model image from:",
      [
        {
          text: "Camera",
          onPress: async () => {
            try {
              const { status } =
                await ImagePicker.requestCameraPermissionsAsync();
              if (status !== "granted") {
                setError("Camera permission is required to take photos");
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
              });

              if (!result.canceled && result.assets) {
                setModelImage(result.assets[0]);
              }
            } catch (error) {
              console.error("Camera error:", error);
              setError("Failed to capture image for 3D model");
            }
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            try {
              const { status } =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== "granted") {
                setError("Gallery permission is required to select an image");
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: false,
                quality: 0.8,
              });

              if (!result.canceled && result.assets) {
                setModelImage(result.assets[0]);
              }
            } catch (error) {
              console.error("Model image picker error:", error);
              setError("Failed to open image picker for 3D model");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const removeImage = (imageUri) => {
    setImages((prevImages) =>
      prevImages.filter((image) => image.uri !== imageUri)
    );
  };

  const removeModelImage = () => {
    setModelImage(null);
  };

  // Exchange options
  const addExchangeOption = () => {
    if (
      exchangeOption.trim() !== "" &&
      !exchangeOptions.includes(exchangeOption.trim())
    ) {
      setExchangeOptions((prevOptions) => [
        ...prevOptions,
        exchangeOption.trim(),
      ]);
      setExchangeOption("");
    }
  };

  const removeExchangeOption = (option) => {
    setExchangeOptions((prevOptions) =>
      prevOptions.filter((opt) => opt !== option)
    );
  };

  // Upload image to Cloudinary with progress tracking
  const uploadImageToCloudinary = async (image, onProgress) => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: image.uri,
        type: "image/jpeg",
        name: `image_${Date.now()}.jpg`,
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await axios.post(CLOUDINARY_API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        },
      });

      if (response.data.secure_url) {
        return response.data.secure_url;
      } else {
        throw new Error("Failed to upload image to Cloudinary");
      }
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw error;
    }
  };

  // 3D conversion function (runs in background)
  const convert2Dto3D = async (imageUrl, postId, imageUri) => {
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: imageUri,
        type: "image/jpeg",
        name: `model_image_${postId}.jpg`,
      });
      formData.append("postId", postId);

      console.log("Sending to 3D API:", { imageUri, postId });

      const apiResponse = await fetch(
        "https://059dd105-97b3-4d09-bde2-5d4a89b64d38-00-jokwfw4hncw6.sisko.replit.dev/convert-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error("2D-to-3D API Error:", errorText);
        throw new Error("Failed to generate 3D model");
      }

      const modelData = await apiResponse.json();
      console.log("3D API Response:", modelData);
      if (modelData.modelUrl) {
        const postDocRef = doc(db, "posts", postId);
        await updateDoc(postDocRef, { modelUrl: modelData.modelUrl });
        showToast(
          "success",
          "3D Model Generated",
          "3D model has been successfully generated and linked to your post.",
          4000
        );
      } else {
        console.error("No modelUrl in API response:", modelData);
        throw new Error("3D model was not generated");
      }
    } catch (err) {
      console.error("Error during 2D-to-3D conversion:", err);
      showToast(
        "error",
        "3D Conversion Error",
        err.message || "An error occurred while generating the 3D model.",
        4000
      );
    }
  };

  // Form submission
  const handlePostUpload = async () => {
    if (!isFormValid) {
      showToast("error", "Incomplete Form", "Please fill all required fields");
      return;
    }

    setLoading(true);
    setError("");
    setProgress(0);
    setProgressPhase("Uploading Images");

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert(
          "Authentication Error",
          "You need to be signed in to make a post"
        );
        setLoading(false);
        return;
      }

      // Define progress weights
      const imageUploadWeight = 0.8; // 80%
      const firestoreWriteWeight = 0.2; // 20%
      let imageProgress = 0;

      // Upload post images to Cloudinary
      const imageUrls = await Promise.all(
        images.map(async (image, index) => {
          const url = await uploadImageToCloudinary(image, (percent) => {
            const imageFraction = percent / 100 / images.length;
            imageProgress =
              (index / images.length + imageFraction) * imageUploadWeight * 100;
            debouncedSetProgress(Math.min(imageProgress, 100));
          });
          return url;
        })
      );

      // Update progress for Firestore write
      setProgressPhase("Saving Post");
      debouncedSetProgress(imageUploadWeight * 100);

      // Create post document in Firestore
      const postRef = await addDoc(collection(db, "posts"), {
        userId: user.uid,
        postType,
        title,
        description,
        category,
        images: imageUrls,
        views: 0,
        modelUrl: "",
        viewers: [],
        location: location
          ? {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }
          : null,
        address,
        exchangeOptions,
        createdAt: Timestamp.now(),
      });

      const postId = postRef.id;
      debouncedSetProgress(100);

      // Reset form
      setTitle("");
      setDescription("");
      setCategory("");
      setImages([]);
      setModelImage(null);
      setCreate3DModel(false);
      setAddress("");
      setLocation(null);
      setExchangeOptions([]);
      setProgress(0);
      setProgressPhase("");

      // Handle 3D conversion in the background if enabled
      if (postType === "typeItem" && create3DModel && modelImage) {
        showToast(
          "info",
          "3D Model Processing",
          "Your post has been uploaded. The 3D model is being generated in the background.",
          4000
        );
        // Upload model image and trigger 3D conversion without awaiting
        uploadImageToCloudinary(modelImage, () => {})
          .then((modelImageUrl) => {
            convert2Dto3D(modelImageUrl, postId, modelImage.uri);
          })
          .catch((err) => {
            console.error("Background 3D model upload error:", err);
            showToast(
              "error",
              "3D Model Upload Failed",
              "Failed to upload model image for 3D conversion.",
              4000
            );
          });
      } else {
        showToast("success", "Success", "Your post has been uploaded", 3000);
      }

      // Navigate to home screen
      router.replace("Home");
    } catch (err) {
      console.error("Error uploading post:", err);
      setError(err.message);
      Alert.alert("Upload Failed", "There was a problem uploading your post.");
      setProgress(0);
      setProgressPhase("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.formContainer, animatedFormStyle]}>
            <LinearGradient
              colors={["#6a11cb", "#2575fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerGradient}
            >
              <Text style={styles.title}>
                Upload {postType === "typeItem" ? "Item" : "Service"}
              </Text>
            </LinearGradient>

            <FormField label="Images">
              <View style={styles.imagePickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    onPress={handleImagePicker}
                    style={styles.addImageButton}
                  >
                    <LinearGradient
                      colors={["#f5f7fa", "#c3cfe2"]}
                      style={styles.addImageGradient}
                    >
                      <Icon name="camera" size={28} color="#4a6fa5" />
                      <Text style={styles.addImageText}>Add Images</Text>
                      <Text style={styles.imageCount}>{images.length}/5</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {images.map((image, index) => (
                    <ImagePreview
                      key={index}
                      uri={image.uri}
                      onRemove={() => removeImage(image.uri)}
                    />
                  ))}
                </ScrollView>
              </View>
            </FormField>

            {postType === "typeItem" && (
              <FormField>
                <View style={styles.toggleContainer}>
                  <Text style={styles.toggleLabel}>
                    Generate a 3D model for this item
                  </Text>
                  <Switch
                    value={create3DModel}
                    onValueChange={(value) => {
                      setCreate3DModel(value);
                      if (!value) setModelImage(null);
                    }}
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={create3DModel ? "#f5dd4b" : "#f4f3f4"}
                  />
                </View>
              </FormField>
            )}

            {postType === "typeItem" && create3DModel && (
              <FormField label="Image for 3D Model (Optional)">
                <Text style={styles.modelImageNote}>
                  Select a single image with a clear object for 3D model
                  generation.
                </Text>
                <View style={styles.imagePickerContainer}>
                  {modelImage ? (
                    <ImagePreview
                      uri={modelImage.uri}
                      onRemove={removeModelImage}
                      isModelImage={true}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={handleModelImagePicker}
                      style={styles.addImageButton}
                    >
                      <LinearGradient
                        colors={["#f5f7fa", "#c3cfe2"]}
                        style={styles.addImageGradient}
                      >
                        <Icon name="cube" size={28} color="#4a6fa5" />
                        <Text style={styles.addImageText}>
                          Add 3D Model Image
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </FormField>
            )}

            <FormField label="Title">
              <TextInput
                placeholder="Give your post a catchy title"
                value={title}
                onChangeText={handleTitleChange}
                style={styles.input}
                maxLength={50}
              />
            </FormField>

            <FormField label="Description">
              <TextInput
                placeholder="Describe your item or service in detail"
                value={description}
                onChangeText={handleDescriptionChange}
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
                  {categories.map((cat) => (
                    <Picker.Item
                      key={cat.id}
                      label={cat.name}
                      value={cat.name}
                    />
                  ))}
                </Picker>
              </View>
            </FormField>

            <FormField label="Location">
              <TouchableOpacity
                onPress={getCurrentLocation}
                style={styles.locationButton}
              >
                <LinearGradient
                  colors={["#e0eafc", "#cfdef3"]}
                  style={styles.locationGradient}
                >
                  <Icon name="map-marker" size={24} color="#4361ee" />
                  <Text style={styles.locationText}>
                    {address ? address : "Get Current Location"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </FormField>

            <FormField label="What would you exchange for?">
              <View style={styles.exchangeContainer}>
                <View style={styles.exchangeInputContainer}>
                  <Picker
                    selectedValue={exchangeOption}
                    onValueChange={(value) => setExchangeOption(value)}
                    style={styles.exchangePicker}
                  >
                    <Picker.Item label="Select category" value="" />
                    {categories.map((cat) => (
                      <Picker.Item
                        key={cat.id}
                        label={cat.name}
                        value={cat.name}
                      />
                    ))}
                  </Picker>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={addExchangeOption}
                  >
                    <LinearGradient
                      colors={["#4facfe", "#00f2fe"]}
                      style={styles.addButtonGradient}
                    >
                      <Icon name="plus" size={16} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                {exchangeOptions.length > 0 && (
                  <View style={styles.exchangeOptionsContainer}>
                    {exchangeOptions.map((option, index) => (
                      <ExchangeOptionChip
                        key={`${option}-${index}`}
                        option={option}
                        onRemove={() => removeExchangeOption(option)}
                      />
                    ))}
                  </View>
                )}
              </View>
            </FormField>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[
                styles.submitButton,
                !isFormValid && styles.disabledButton,
              ]}
              onPress={handlePostUpload}
              disabled={!isFormValid || loading}
            >
              <LinearGradient
                colors={
                  isFormValid ? ["#0061ff", "#60efff"] : ["#bdc3c7", "#2c3e50"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <Text style={styles.submitText}>
                  {loading ? "Uploading..." : "Upload Post"}
                </Text>
                {!loading && (
                  <Icon
                    name="arrow-right"
                    size={18}
                    color="#fff"
                    style={styles.submitIcon}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
        <Loader visible={loading} progress={progress} phase={progressPhase} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollViewContainer: {
    paddingBottom: 50,
  },
  formContainer: {
    marginHorizontal: 16,
    marginTop: 20,
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
  headerGradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontFamily: "Bold",
    color: "#fff",
  },
  formField: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  fieldTitle: {
    fontSize: 16,
    fontFamily: "medium",
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
  addImageGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  addImageText: {
    marginTop: 6,
    fontSize: 14,
    color: "#4a6fa5",
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
  removeButtonGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modelImageBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "#4a6fa5",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modelImageBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  modelImageNote: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  locationButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  locationGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
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
  addButtonGradient: {
    width: 46,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
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
  submitGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitText: {
    fontSize: 18,
    fontFamily: "medium",
    color: "#fff",
    marginRight: 8,
  },
  submitIcon: {
    marginLeft: 4,
  },
});

export default PostUploadScreen;
