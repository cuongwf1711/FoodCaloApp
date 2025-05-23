"use client"

import { URL_FOOD_CALO_ESTIMATOR } from "@/constants/url_constants"
import { patchData, postData } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import type React from "react"
import { useRef, useState } from "react"
import { Alert, Animated, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"

// Import shared utilities
import { EditModal, formatDate, ImageModal, styles as sharedStyles } from "@/utils/food-history-utils"

// Simplified type definitions
type ImageAsset = {
    uri: string
    type?: string
    fileName?: string
    fileSize?: number
    file?: File
}

type PredictionResult = {
    id: string
    predict: number
    confidencePercentage: string
    createdAt: string
    publicUrl: {
        originImage: string
        segmentationImage: string
    }
    predictName: string
    comment: string
    calo: number
}

// Platform-specific module imports
let ImagePicker: any
let AsyncStorage: any

if (Platform.OS === "web") {
    // Web-specific implementations
    ImagePicker = {
        requestMediaLibraryPermissionsAsync: async () => ({ status: "granted" }),
        requestCameraPermissionsAsync: async () => ({ status: "granted" }),
        launchImageLibraryAsync: async () => {
            return new Promise<ImagePickerResult>((resolve) => {
                const input = document.createElement("input")
                input.type = "file"
                input.accept = "image/*"

                input.onchange = (e: Event) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (!file) {
                        resolve({ canceled: true, assets: [] })
                        return
                    }

                    const reader = new FileReader()
                    reader.onload = () => {
                        resolve({
                            canceled: false,
                            assets: [
                                {
                                    uri: reader.result as string,
                                    type: file.type,
                                    fileName: file.name,
                                    fileSize: file.size,
                                    file: file,
                                },
                            ],
                        })
                    }
                    reader.readAsDataURL(file)
                }
                input.click()
            })
        },
        launchCameraAsync: async () => {
            // Web doesn't support direct camera access through this API
            // We'll show an alert instead
            alert("Camera capture is not supported in web browsers. Please use the file picker instead.")
            return { canceled: true, assets: [] }
        },
    }

    AsyncStorage = {
        getItem: (key: string) => localStorage.getItem(key),
        setItem: (key: string, value: string) => localStorage.setItem(key, value),
    }
} else {
    ImagePicker = require("expo-image-picker")
    AsyncStorage = require("@react-native-async-storage/async-storage").default
}

type ImagePickerResult = {
    canceled: boolean
    assets: ImageAsset[]
}

/**
 * Animated button with press effects for both platforms
 * Provides visual feedback when pressed
 */
const AnimatedButton: React.FC<{
    style: any
    onPress: () => void
    disabled?: boolean
    children: React.ReactNode
    activeOpacity?: number
    buttonType?: "primary" | "success" | "danger"
}> = ({ style, onPress, disabled = false, children, activeOpacity = 0.8, buttonType = "primary" }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current
    const shadowAnim = useRef(new Animated.Value(1)).current

    const handlePressIn = () => {
        if (!disabled) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 0.96,
                    useNativeDriver: true,
                    tension: 300,
                    friction: 10,
                }),
                Animated.timing(shadowAnim, {
                    toValue: 0.7,
                    duration: 150,
                    useNativeDriver: false,
                }),
            ]).start()
        }
    }

    const handlePressOut = () => {
        if (!disabled) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 300,
                    friction: 10,
                }),
                Animated.timing(shadowAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: false,
                }),
            ]).start()
        }
    }

    const handlePress = () => {
        if (!disabled) {
            // Enhanced bounce effect
            Animated.sequence([
                Animated.spring(scaleAnim, {
                    toValue: 0.92,
                    useNativeDriver: true,
                    tension: 400,
                    friction: 8,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 400,
                    friction: 8,
                }),
            ]).start()

            // Add haptic feedback for mobile
            if (Platform.OS !== "web") {
                try {
                    // For Expo, you would use Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                    // For now, we'll just call the function
                } catch (error) {
                    // Haptic feedback not available
                }
            }

            setTimeout(onPress, 50)
        }
    }

    const animatedShadowStyle =
        Platform.OS === "web"
            ? {}
            : {
                shadowOpacity: shadowAnim.interpolate({
                    inputRange: [0.7, 1],
                    outputRange: [0.1, 0.3],
                }),
                elevation: shadowAnim.interpolate({
                    inputRange: [0.7, 1],
                    outputRange: [2, 5],
                }),
            }

    return (
        <TouchableOpacity
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={activeOpacity}
            style={{ flex: 1 }}
        >
            <Animated.View
                style={[
                    style,
                    animatedShadowStyle,
                    {
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {children}
            </Animated.View>
        </TouchableOpacity>
    )
}

/**
 * Main screen component for food calorie prediction
 * Allows users to select an image and get calorie estimates
 */
const Index: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [result, setResult] = useState<PredictionResult | null>(null)
    const [modalVisible, setModalVisible] = useState(false)
    const [modalImageUri, setModalImageUri] = useState("")
    const [isEditing, setIsEditing] = useState(false)

    // Animation values for result card
    const resultCardAnim = useRef(new Animated.Value(0)).current
    const resultOpacityAnim = useRef(new Animated.Value(0)).current

    // Select image from device gallery or camera
    const pickImage = async () => {
        try {
            if (Platform.OS === "web") {
                // Web doesn't support action sheet, directly open file picker
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
                if (status !== "granted") {
                    showMessage({ message: "Permission required to access photos" })
                    return
                }

                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: "Images",
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 1,
                })

                if (!result.canceled && result.assets?.[0]) {
                    setSelectedImage(result.assets[0])
                    setResult(null) // Reset previous result

                    // Reset result animations
                    resultCardAnim.setValue(0)
                    resultOpacityAnim.setValue(0)
                }
            } else {
                // On mobile, show action sheet with options
                if (Platform.OS === "ios") {
                    // For iOS, we can use ActionSheetIOS
                    const ActionSheetIOS = require("react-native").ActionSheetIOS

                    ActionSheetIOS.showActionSheetWithOptions(
                        {
                            options: ["Cancel", "Take Photo", "Choose from Library"],
                            cancelButtonIndex: 0,
                        },
                        async (buttonIndex) => {
                            if (buttonIndex === 0) {
                                // Cancel
                                return
                            } else if (buttonIndex === 1) {
                                // Camera
                                await launchCamera()
                            } else if (buttonIndex === 2) {
                                // Photo Library
                                await launchImageLibrary()
                            }
                        },
                    )
                } else {
                    // For Android, we'll use a simple Alert
                    Alert.alert(
                        "Select Image",
                        "Choose an option",
                        [
                            { text: "Cancel", style: "cancel" },
                            { text: "Take Photo", onPress: launchCamera },
                            { text: "Choose from Library", onPress: launchImageLibrary },
                        ],
                        { cancelable: true },
                    )
                }
            }
        } catch (error) {
            console.error("Error picking image:", error)
            showMessage({ message: "Error selecting image" })
        }
    }

    // Launch camera to take a photo
    const launchCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== "granted") {
            Alert.alert("Permission required", "Please allow the app to access your camera")
            return
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        })

        if (!result.canceled && result.assets?.[0]) {
            setSelectedImage(result.assets[0])
            setResult(null) // Reset previous result

            // Reset result animations
            resultCardAnim.setValue(0)
            resultOpacityAnim.setValue(0)
        }
    }

    // Launch image library to select a photo
    const launchImageLibrary = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== "granted") {
            Alert.alert("Permission required", "Please allow the app to access your photo library")
            return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "Images",
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        })

        if (!result.canceled && result.assets?.[0]) {
            setSelectedImage(result.assets[0])
            setResult(null) // Reset previous result

            // Reset result animations
            resultCardAnim.setValue(0)
            resultOpacityAnim.setValue(0)
        }
    }

    // Process the selected image for calorie prediction
    const processImage = async () => {
        if (!selectedImage) return

        try {
            setIsProcessing(true)
            const formData = new FormData()

            if (Platform.OS === "web" && selectedImage.file) {
                formData.append("imageFile", selectedImage.file)
            } else {
                const uri = selectedImage.uri
                const filename = uri.split("/").pop() || "photo.jpg"
                const match = /\.(\w+)$/.exec(filename.toLowerCase())
                const type = match ? `image/${match[1]}` : "image/jpeg"

                formData.append("imageFile", {
                    uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
                    name: filename,
                    type: type,
                } as any)
            }

            const response = await postData<PredictionResult>(URL_FOOD_CALO_ESTIMATOR, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Accept: "application/json",
                },
            })

            setResult(response.data)

            // Animate result card appearance
            Animated.parallel([
                Animated.spring(resultCardAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 8,
                }),
                Animated.timing(resultOpacityAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]).start()
        } catch (error) {
            console.error("Error processing image:", error)
            showMessage(error)
        } finally {
            setIsProcessing(false)
        }
    }

    // Reset the form and clear results
    const reset = () => {
        setSelectedImage(null)
        setResult(null)
        resultCardAnim.setValue(0)
        resultOpacityAnim.setValue(0)
    }

    // Open image modal to view full-size image
    const openImageModal = (uri: string) => {
        setModalImageUri(uri)
        setModalVisible(true)
    }

    // Close image modal
    const closeImageModal = () => {
        setModalVisible(false)
    }

    // Start editing an item
    const startEditing = () => {
        setIsEditing(true)
    }

    // Save edited item details
    const saveEditedItem = async (calories: string, comment: string) => {
        if (!result) return

        try {
            const updatedData = {
                calo: Number(calories),
                comment: comment,
            }

            const response = await patchData<PredictionResult>(`${URL_FOOD_CALO_ESTIMATOR}/${result.id}`, updatedData)

            if (response.status === 200) {
                setResult(response.data)
            }

            setIsEditing(false)
        } catch (error) {
            console.error("Error updating food item:", error)
            showMessage({ message: "Error updating information" })
        }
    }

    // Cancel editing
    const cancelEditing = () => {
        setIsEditing(false)
    }

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Predict Calories from Image</Text>
                <Text style={styles.headerSubtitle}>Take or upload a food photo for analysis</Text>
            </View>

            {/* Image Selection Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Select Image</Text>

                {selectedImage ? (
                    <TouchableOpacity
                        onPress={() => openImageModal(selectedImage.uri)}
                        style={styles.selectedImageContainer}
                        activeOpacity={0.9}
                    >
                        <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} resizeMode="contain" />
                        <View style={styles.imageOverlay}>
                            <Text style={styles.tapHint}>Tap to view full image</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage} activeOpacity={0.7}>
                        <Text style={styles.placeholderIcon}>📷</Text>
                        <Text style={styles.placeholderText}>No image selected</Text>
                        <Text style={styles.placeholderHint}>Tap to select an image</Text>
                    </TouchableOpacity>
                )}

                {/* Enhanced Button Row with better spacing */}
                <View style={styles.buttonRow}>
                    <AnimatedButton style={[styles.button, styles.primaryButton]} onPress={pickImage} buttonType="primary">
                        <Text style={styles.buttonText}>Select Image</Text>
                    </AnimatedButton>

                    <AnimatedButton
                        style={[styles.button, styles.successButton, (!selectedImage || isProcessing) && styles.disabledButton]}
                        disabled={!selectedImage || isProcessing}
                        onPress={processImage}
                        buttonType="success"
                    >
                        <Text style={styles.buttonText}>{isProcessing ? "Processing..." : "Analyze"}</Text>
                    </AnimatedButton>

                    <AnimatedButton
                        style={[styles.button, styles.dangerButton, !selectedImage && !result && styles.disabledButton]}
                        disabled={!selectedImage && !result}
                        onPress={reset}
                        buttonType="danger"
                    >
                        <Text style={styles.buttonText}>Reset</Text>
                    </AnimatedButton>
                </View>
            </View>

            {/* Results Card with Animation */}
            {result && !isProcessing && (
                <Animated.View
                    style={[
                        styles.card,
                        {
                            opacity: resultOpacityAnim,
                            transform: [
                                {
                                    translateY: resultCardAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [50, 0],
                                    }),
                                },
                                {
                                    scale: resultCardAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.9, 1],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <View style={styles.resultHeader}>
                        <Text style={styles.cardTitle}>Analysis Results</Text>
                        <Text style={styles.resultTimestamp}>{formatDate(result.createdAt)}</Text>
                    </View>

                    {/* Highlight Result */}
                    <View style={styles.highlightResult}>
                        <Text style={styles.foodNameResult}>{result.predictName}</Text>
                        <Text style={styles.caloriesResult}>{result.calo} calories</Text>
                        <View style={styles.confidenceBadge}>
                            <Text style={styles.confidenceText}>Confidence: {result.confidencePercentage}</Text>
                        </View>
                    </View>

                    <AnimatedButton style={styles.editButton} onPress={startEditing}>
                        <Text style={styles.editButtonText}>✎ Edit</Text>
                    </AnimatedButton>

                    {/* Result Images */}
                    <View style={styles.resultImagesRow}>
                        <TouchableOpacity
                            style={styles.resultImageContainer}
                            onPress={() => openImageModal(result.publicUrl.originImage)}
                            activeOpacity={0.9}
                        >
                            <Image source={{ uri: result.publicUrl.originImage }} style={styles.resultImage} resizeMode="contain" />
                            <View style={styles.imageLabel}>
                                <Text style={styles.imageLabelText}>Original Image</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resultImageContainer}
                            onPress={() => openImageModal(result.publicUrl.segmentationImage)}
                            activeOpacity={0.9}
                        >
                            <Image
                                source={{ uri: result.publicUrl.segmentationImage }}
                                style={styles.resultImage}
                                resizeMode="contain"
                            />
                            <View style={styles.imageLabel}>
                                <Text style={styles.imageLabelText}>Segmented Image</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Additional Details */}
                    {result.comment && (
                        <View style={[sharedStyles.commentContainer, styles.commentContainer]}>
                            <Text style={[sharedStyles.commentLabel, styles.commentLabel]}>Notes:</Text>
                            <Text style={[sharedStyles.foodComment, styles.commentText]}>{result.comment}</Text>
                        </View>
                    )}
                </Animated.View>
            )}

            {/* Image Modal - Using shared component */}
            <ImageModal visible={modalVisible} imageUri={modalImageUri} onClose={closeImageModal} />

            {/* Edit Modal - Using shared component */}
            {result && (
                <EditModal
                    visible={isEditing}
                    initialCalo={result.calo.toString()}
                    initialComment={result.comment || ""}
                    onSave={saveEditedItem}
                    onCancel={cancelEditing}
                />
            )}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: "#f8f9fa",
        minHeight: Platform.OS === "web" ? 0 : undefined, // Use a number for minHeight
    },
    header: {
        marginBottom: 20,
        alignItems: "center",
        paddingHorizontal: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        textAlign: "center",
        color: "#2c3e50",
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#6c757d",
        textAlign: "center",
        lineHeight: 22,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: Platform.OS === "web" ? 0.1 : 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 16,
        color: "#34495e",
    },
    selectedImageContainer: {
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#f8f9fa",
        marginBottom: 20,
        height: 200,
    },
    selectedImage: {
        width: "100%",
        height: "100%",
        resizeMode: "contain",
    },
    imageOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        padding: 12,
        alignItems: "center",
    },
    tapHint: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "500",
    },
    imagePlaceholder: {
        height: 200,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#e9ecef",
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        marginBottom: 20,
    },
    placeholderIcon: {
        fontSize: 48,
        color: "#adb5bd",
        marginBottom: 12,
    },
    placeholderText: {
        color: "#6c757d",
        fontSize: 16,
        fontWeight: "500",
    },
    placeholderHint: {
        color: "#3498db",
        fontSize: 14,
        marginTop: 8,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    button: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 50,
    },
    primaryButton: {
        backgroundColor: "#3498db",
        shadowColor: Platform.OS === "web" ? "transparent" : "#3498db",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    successButton: {
        backgroundColor: "#2ecc71",
        shadowColor: Platform.OS === "web" ? "transparent" : "#2ecc71",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    dangerButton: {
        backgroundColor: "#e74c3c",
        shadowColor: Platform.OS === "web" ? "transparent" : "#e74c3c",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    disabledButton: {
        backgroundColor: "#bdc3c7",
        shadowColor: Platform.OS === "web" ? "transparent" : "#bdc3c7",
        shadowOpacity: 0.1,
    },
    buttonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
    resultHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    resultTimestamp: {
        fontSize: 12,
        color: "#6c757d",
    },
    highlightResult: {
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        alignItems: "center",
    },
    foodNameResult: {
        fontSize: 20,
        fontWeight: "700",
        color: "#2c3e50",
        textAlign: "center",
        marginBottom: 8,
        textTransform: "capitalize",
    },
    caloriesResult: {
        fontSize: 28,
        fontWeight: "700",
        color: "#e74c3c",
        marginBottom: 8,
    },
    confidenceBadge: {
        backgroundColor: "#e1f5fe",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    confidenceText: {
        color: "#0288d1",
        fontSize: 12,
        fontWeight: "600",
    },
    editButton: {
        backgroundColor: "#3498db",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignSelf: "center",
        marginBottom: 16,
        shadowColor: Platform.OS === "web" ? "transparent" : "#3498db",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    editButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    resultImagesRow: {
        flexDirection: "row",
        gap: 12,
    },
    resultImageContainer: {
        flex: 1,
        borderRadius: 12,
        overflow: "hidden",
        height: 120,
        backgroundColor: "#f8f9fa",
    },
    resultImage: {
        width: "100%",
        height: "100%",
        resizeMode: "contain",
    },
    imageLabel: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        padding: 8,
        alignItems: "center",
    },
    imageLabelText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    commentContainer: {
        marginTop: 16,
    },
    commentLabel: {
        fontSize: 14,
    },
    commentText: {
        fontSize: 13,
    },
})

export default Index
