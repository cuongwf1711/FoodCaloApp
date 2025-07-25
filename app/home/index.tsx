"use client"

import React from "react"

import { URL_FOOD_CALO_ESTIMATOR } from "@/constants/url_constants"
import { deleteData, headData, patchData, postData } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native"

// Import shared utilities
import ImageModal from "@/components/ImageModal"
import { EnhancedLoadingOverlay } from "@/components/LoadingOverlays"
import { useTabReload } from "@/hooks/use-tab-reload"
import { Colors } from "@/styles/colors"
import { EditModal, formatDate, styles as sharedStyles } from "@/utils/food-history-utils"
import { formatDecimalDisplay } from "@/utils/number-utils"

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
let FileSystem: any
let MediaLibrary: any
let GestureHandler: any

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
    FileSystem = require("expo-file-system")
    MediaLibrary = require("expo-media-library")
    
    // Import gesture handler for native platforms
    try {
        GestureHandler = require("react-native-gesture-handler")
    } catch (error) {
        console.warn("react-native-gesture-handler not available")
        GestureHandler = null
    }
}

type ImagePickerResult = {
    canceled: boolean
    assets: ImageAsset[]
}

/**
 * Animated button with press effects for both platforms
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

    const handlePressIn = () => {
        if (!disabled) {
            Animated.spring(scaleAnim, {
                toValue: 0.96,
                useNativeDriver: true,
                tension: 300,
                friction: 10,
            }).start()
        }
    }

    const handlePressOut = () => {
        if (!disabled) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 300,
                friction: 10,
            }).start()
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

            setTimeout(onPress, 50)
        }
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
 */
const Index: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [result, setResult] = useState<PredictionResult | null>(null)
    const [modalVisible, setModalVisible] = useState(false)
    const [modalImageUri, setModalImageUri] = useState("")
    const [isEditing, setIsEditing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [imagesAreReady, setImagesAreReady] = useState(false)

    // Animation values for result card
    const resultCardAnim = useRef(new Animated.Value(0)).current
    const resultOpacityAnim = useRef(new Animated.Value(0)).current
    const deleteAnim = useRef(new Animated.Value(1)).current

    // Use tab reload hook
    const { isReloading, animatedStyle } = useTabReload("index", {
        onReload: async () => {
            // Reset all state when tab is reloaded
            clearAllState()
        },
    })

    // Centralized function to clear all state like reset
    const clearAllState = (setSelectedImageNull:boolean = true) => {
        if(setSelectedImageNull)
        {
            setSelectedImage(null)
        }
        setResult(null)
        setModalVisible(false)
        setModalImageUri("")
        setIsEditing(false)
        setIsDeleting(false)
        resultCardAnim.setValue(0)
        resultOpacityAnim.setValue(0)
        deleteAnim.setValue(1)
    }

    // Delete result with confirmation and spin animation
    const handleDeleteResult = () => {
        if (!result) return

        if (Platform.OS === "web") {
            const confirmed = window.confirm("Are you sure you want to delete this analysis result?")
            if (!confirmed) return
        } else {
            Alert.alert(
                "Delete Result",
                "Are you sure you want to delete this analysis result?",
                [
                    {
                        text: "Cancel",
                        style: "cancel",
                    },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => performDelete(),
                    },
                ],
                { cancelable: true },
            )
            return
        }

        performDelete()
    }

    const performDelete = async () => {
        try {
            setIsDeleting(true)

            // Start spin animation
            const spinAnimation = Animated.loop(
                Animated.timing(deleteAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                { iterations: -1 },
            )

            // Reset deleteAnim to 0 first, then start spinning
            deleteAnim.setValue(0)
            spinAnimation.start()

            const response = await deleteData(URL_FOOD_CALO_ESTIMATOR, result!.id)

            // Stop spin animation
            spinAnimation.stop()

            if (response.status === 204) {
                // Fade out and clear everything like reset
                Animated.parallel([
                    Animated.timing(deleteAnim, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(resultOpacityAnim, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    // Clear everything like reset
                    clearAllState(false)
                })
            } else {
                // Reset animation and clear everything if delete failed
                clearAllState()
                showMessage({ message: "Failed to delete result" }, true)
            }
        } catch (error) {
            // Clear everything if error occurred
            clearAllState()
            showMessage(error)
        }
    }

    // Select image from device gallery or camera
    const pickImage = async () => {
        try {
            if (Platform.OS === "web") {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
                if (status !== "granted") {
                    showMessage({ message: "Permission required to access photos" }, true)
                    return
                }

                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: "Images",
                    allowsEditing: false,
                    quality: 1,
                })

                if (!result.canceled && result.assets?.[0]) {
                    setSelectedImage(result.assets[0])
                    // Don't clear the previous result
                    // Don't reset animations
                }
            } else {
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
        } catch (error) {
            showMessage({ message: "Error selecting image" }, true)
        }
    }

    const launchCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync()
            if (status !== "granted") {
                Alert.alert("Permission required", "Please allow the app to access your camera")
                return
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 1,
            })

            if (!result.canceled && result.assets?.[0]) {
                setSelectedImage(result.assets[0])
                // Don't clear the previous result
                // Don't reset animations
            }
        } catch (error) {
            showMessage({ message: "Error accessing camera" }, true)
        }
    }

    const launchImageLibrary = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (status !== "granted") {
                Alert.alert("Permission required", "Please allow the app to access your photo library")
                return
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: "Images",
                allowsEditing: false,
                quality: 1,
            })

            if (!result.canceled && result.assets?.[0]) {
                setSelectedImage(result.assets[0])
                // Don't clear the previous result
                // Don't reset animations
            }
        } catch (error) {
            showMessage({ message: "Error accessing photo library" }, true)
        }
    }

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
            // Clear everything if processing fails
            clearAllState()
            showMessage(error)
        } finally {
            setIsProcessing(false)
        }
    }

    const reset = () => {
        if (result) {
            Animated.parallel([
                Animated.timing(deleteAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(resultOpacityAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                clearAllState()
            })
        } else {
            clearAllState()
        }
    }

    const openImageModal = (uri: string) => {
        setModalImageUri(uri)
        setModalVisible(true)
    }

    const closeImageModal = () => {
        setModalVisible(false)
        setModalImageUri("")
    }

    const startEditing = () => {
        setIsEditing(true)
    }

    const saveEditedItem = async (calories: string, comment: string) => {
        if (!result) return

        try {
            const updatedData = {
                calo: calories,
                comment: comment,
            }

            const response = await patchData<PredictionResult>(`${URL_FOOD_CALO_ESTIMATOR}/${result.id}`, updatedData)

            if (response.status === 200) {
                setResult(response.data)
                setIsEditing(false)
                showMessage({ message: "Updated successfully" }, true)
            } else {
                // Clear everything if update failed
                setIsEditing(false)
                clearAllState()
                showMessage({ message: "Failed to update result" }, true)
            }        } catch (error) {
            // Clear everything if error occurred during edit
            setIsEditing(false)
            clearAllState()
            showMessage(error)
        }
    }
    
    const cancelEditing = () => {
        setIsEditing(false)
    }
    
    // Poll image URLs to check if they are ready
    useEffect(() => {
        if (result?.publicUrl) {
            setImagesAreReady(false)
            pollImages()
        }
    }, [result])
    
    async function pollImages(retries = 100) {
        const checkUrl = async (url: string) => {
            try {
                const res = await headData(url)
                return res.status === 200
            } catch {
                return false
            }
        }
        for (let i = 0; i < retries; i++) {
            const originOk = await checkUrl(result!.publicUrl.originImage)
            const segOk = await checkUrl(result!.publicUrl.segmentationImage)
            if (originOk && segOk) break
            await new Promise((r) => setTimeout(r, 1000))
        }
        setImagesAreReady(true)
    }

    return (
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Predict Calories from Image</Text>
                    <Text style={styles.headerSubtitle}>Take or upload a food photo for analysis</Text>
                </View>

                {/* Image Selection Card */}
                <View style={styles.card}>
                    {selectedImage ? (
                        <TouchableOpacity
                            onPress={() => openImageModal(selectedImage.uri)}
                            style={styles.selectedImageContainer}
                            activeOpacity={0.8}
                        >
                            <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} resizeMode="contain" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage} activeOpacity={0.7}>
                            <Ionicons name="camera-outline" size={48} color="#adb5bd" style={styles.placeholderIcon} />
                            <Text style={styles.placeholderText}>No image selected</Text>
                            <Text style={styles.placeholderHint}>Tap to select an image</Text>
                        </TouchableOpacity>
                    )}

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
                            {isProcessing ? (
                                <View style={styles.buttonLoadingContainer}>
                                    <ActivityIndicator size="small" color="#fff" style={styles.buttonLoader} />
                                </View>
                            ) : (
                                <Text style={styles.buttonText}>Analyze</Text>
                            )}
                        </AnimatedButton>

                        <AnimatedButton
                            style={[styles.button, styles.dangerButton, (!selectedImage && !result) || isProcessing || isDeleting ? styles.disabledButton : {}]}
                            disabled={(!selectedImage && !result) || isProcessing || isDeleting}
                            onPress={reset}
                            buttonType="danger"
                        >
                            <Text style={styles.buttonText}>Reset</Text>
                        </AnimatedButton>
                    </View>
                </View>

                {/* Results section - Show loading or results */}
                {isProcessing ? (
                    <View style={[sharedStyles.foodCard, styles.loadingResultCard]}>
                        <EnhancedLoadingOverlay />
                    </View>
                ) : isDeleting && result ? (
                    <Animated.View
                        style={[
                            sharedStyles.foodCard,
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
                                        scale: deleteAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1],
                                        }),
                                    },
                                    {
                                        rotate: deleteAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ["0deg", "360deg"],
                                        })
                                    },
                                ],
                            },
                        ]}
                    >
                        <EnhancedLoadingOverlay />
                    </Animated.View>
                ) : result ? (
                    <Animated.View
                        style={[
                            sharedStyles.foodCard,
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
                                        scale: deleteAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1],
                                        }),
                                    },
                                    // Add rotation for spin effect when deleting
                                    {
                                        rotate: isDeleting
                                            ? deleteAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ["0deg", "360deg"],
                                            })
                                            : "0deg",
                                    },
                                ],
                            },
                        ]}
                    >
                        <View style={sharedStyles.foodCardHeader}>
                            <Text style={sharedStyles.foodName}>{result.predictName}</Text>
                            <View style={sharedStyles.actionButtons}>
                                <TouchableOpacity style={sharedStyles.editButton} onPress={startEditing} disabled={isDeleting}>
                                    <Ionicons name="create-outline" size={18} color="#3498db" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[sharedStyles.deleteButton, isDeleting && { opacity: 0.5 }]}
                                    onPress={handleDeleteResult}
                                    disabled={isDeleting}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={sharedStyles.foodCalories} numberOfLines={1} adjustsFontSizeToFit>
                            {formatDecimalDisplay(result.calo)} kcal
                        </Text>

                        <View style={sharedStyles.imagesContainer}>
                            {/* Conditional rendering based on imagesAreReady state */}
                            { !imagesAreReady ? (
                                <>
                                    <View style={sharedStyles.imageWrapper}>
                                        <ActivityIndicator size="large" color="#3498db" />
                                    </View>
                                    <View style={sharedStyles.imageWrapper}>
                                        <ActivityIndicator size="large" color="#3498db" />
                                    </View>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={sharedStyles.imageWrapper}
                                        onPress={() => openImageModal(result.publicUrl.originImage)}
                                        activeOpacity={0.8}
                                        disabled={isDeleting}
                                    >
                                        <Image
                                            source={{ uri: result.publicUrl.originImage }}
                                            style={sharedStyles.thumbnailImage}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={sharedStyles.imageWrapper}
                                        onPress={() => openImageModal(result.publicUrl.segmentationImage)}
                                        activeOpacity={0.8}
                                        disabled={isDeleting}
                                    >
                                        <Image
                                            source={{ uri: result.publicUrl.segmentationImage }}
                                            style={sharedStyles.thumbnailImage}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        <View style={sharedStyles.dateConfidenceRow}>
                            <Text style={sharedStyles.foodDate}>{formatDate(result.createdAt)}</Text>
                            <Text style={sharedStyles.confidenceText}>Confidence: {result.confidencePercentage}</Text>
                        </View>

                        <View style={sharedStyles.commentContainer}>
                            <Text style={sharedStyles.commentLabel}>Notes:</Text>
                            <Text style={sharedStyles.foodComment}>{result.comment ? result.comment : "No notes"}</Text>
                        </View>
                    </Animated.View>
                ) : null}

                <ImageModal visible={modalVisible} imageUri={modalImageUri} onClose={closeImageModal} />

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
        </Animated.View>
    )
}

const editModalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modal: {
        backgroundColor: "white",
        borderRadius: "12px",
        padding: 24,
        width: 800,
        maxWidth: "90%",
        height: 480,
        maxHeight: "80%",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 10,
        position: "relative",
    },
    closeButton: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
        zIndex: 1001,
    },
    closeButtonText: {
        fontSize: 18,
        color: "#666",
        fontWeight: "bold",
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 20,
        marginRight: 40,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: "#555",
        marginBottom: 8,
    },
    required: {
        color: "#e74c3c",
    },
    input: {
        borderWidth: 2,
        borderColor: "#e1e5e9",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: "white",
        color: "#333",
    },
    textAreaContainer: {
        height: 150,
        borderWidth: 2,
        borderColor: "#e1e5e9",
        borderRadius: 8,
        backgroundColor: "white",
    },
    textAreaScrollView: {
        flex: 1,
    },
    textArea: {
        height: 120,
        textAlignVertical: "top",
        borderWidth: 0,
        margin: 0,
    },
    hint: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
    },
    charCount: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
        textAlign: "right",
    },
    charCountWarning: {
        color: "#e74c3c",
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 24,
        position: "absolute",
        bottom: 24,
        right: 24,
        left: 24,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderWidth: 2,
        borderColor: "#e1e5e9",
        borderRadius: 8,
        backgroundColor: "white",
        marginRight: 12,
    },
    cancelButtonText: {
        color: "#666",
        fontSize: 14,
        fontWeight: "500",
    },
    saveButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: Colors.primary,
    },
    saveButtonText: {
        color: Colors.backgroundWhite,
        fontSize: 14,
        fontWeight: "500",
    },
})

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: "#f8f9fa",
        minHeight: Platform.OS === "web" ? 0 : undefined,
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
        color: Colors.darkGray,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: Colors.mediumGray,
        textAlign: "center",
        lineHeight: 22,
    },
    reloadingText: {
        fontSize: 14,
        color: "#007AFF",
        marginTop: 8,
        fontWeight: "600",
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
        textAlign: "center",
    },
    selectedImageContainer: {
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
        marginBottom: 12,
        textAlign: "center",
    },
    placeholderText: {
        color: "#6c757d",
        fontSize: 16,
        fontWeight: "500",
        textAlign: "center",
    },
    placeholderHint: {
        color: "#3498db",
        fontSize: 14,
        marginTop: 8,
        textAlign: "center",
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
    buttonLoadingContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    buttonLoader: {
        // Add any specific styling for button loader if needed
    },
    loadingResultCard: {
        minHeight: 200,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
})

export default Index
