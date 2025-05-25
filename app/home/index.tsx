"use client"

import { URL_FOOD_CALO_ESTIMATOR } from "@/constants/url_constants"
import { deleteData, patchData, postData } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import type React from "react"
import { useRef, useState } from "react"
import { Alert, Animated, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"

// Import shared utilities
import { EditModal, formatDate, styles as sharedStyles } from "@/utils/food-history-utils"

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

// Enhanced ImageModal for better Android compatibility
const ImageModal: React.FC<{
    visible: boolean
    imageUri: string
    onClose: () => void
}> = ({ visible, imageUri, onClose }) => {
    if (!visible) return null

    if (Platform.OS === "web") {
        return (
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1000,
                }}
                onClick={onClose}
            >
                <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }} onClick={(e) => e.stopPropagation()}>
                    <img
                        src={imageUri || "/placeholder.svg"}
                        alt="Full size"
                        style={{
                            maxWidth: "100%",
                            maxHeight: "90vh",
                            borderRadius: "8px",
                            objectFit: "contain",
                        }}
                    />
                    <button
                        onClick={onClose}
                        style={{
                            position: "absolute",
                            top: "-10px",
                            right: "-10px",
                            backgroundColor: "#fff",
                            border: "none",
                            borderRadius: "20px",
                            width: "40px",
                            height: "40px",
                            fontSize: "18px",
                            fontWeight: "bold",
                            color: "#333",
                            cursor: "pointer",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                        }}
                    >
                        ✕
                    </button>
                </div>
            </div>
        )
    }

    // Native implementation with better Android support
    return (
        <View style={modalStyles.overlay}>
            <TouchableOpacity style={modalStyles.backdrop} onPress={onClose} activeOpacity={1} />
            <View style={modalStyles.container}>
                <View style={modalStyles.imageContainer}>
                    <Image
                        source={{ uri: imageUri }}
                        style={modalStyles.image}
                        resizeMode="contain"
                    />
                </View>
                <TouchableOpacity
                    style={modalStyles.closeButton}
                    onPress={onClose}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                    <Text style={modalStyles.closeButtonText}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
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

    // Animation values for result card
    const resultCardAnim = useRef(new Animated.Value(0)).current
    const resultOpacityAnim = useRef(new Animated.Value(0)).current
    const deleteAnim = useRef(new Animated.Value(1)).current

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
                    setSelectedImage(null)
                    setResult(null)
                    resultCardAnim.setValue(0)
                    resultOpacityAnim.setValue(0)
                    deleteAnim.setValue(1)
                    setIsDeleting(false)
                })
            } else {
                // Reset animation if delete failed
                deleteAnim.setValue(1)
                setIsDeleting(false)
                showMessage({ message: "Failed to delete result" }, true)
            }
        } catch (error) {
            console.error("Error deleting result:", error)
            // Reset animation if error occurred
            deleteAnim.setValue(1)
            setIsDeleting(false)
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
                    setResult(null)
                    resultCardAnim.setValue(0)
                    resultOpacityAnim.setValue(0)
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
            console.error("Error picking image:", error)
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
                setResult(null)
                resultCardAnim.setValue(0)
                resultOpacityAnim.setValue(0)
            }
        } catch (error) {
            console.error("Error launching camera:", error)
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
                setResult(null)
                resultCardAnim.setValue(0)
                resultOpacityAnim.setValue(0)
            }
        } catch (error) {
            console.error("Error launching image library:", error)
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
            console.error("Error processing image:", error)
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
                setSelectedImage(null)
                setResult(null)
                resultCardAnim.setValue(0)
                resultOpacityAnim.setValue(0)
                deleteAnim.setValue(1)
            })
        } else {
            setSelectedImage(null)
            setResult(null)
            resultCardAnim.setValue(0)
            resultOpacityAnim.setValue(0)
            deleteAnim.setValue(1)
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
                calo: Number(calories),
                comment: comment,
            }

            const response = await patchData<PredictionResult>(`${URL_FOOD_CALO_ESTIMATOR}/${result.id}`, updatedData)

            if (response.status === 200) {
                setResult(response.data)
                showMessage({ message: "Updated successfully" }, true)
            }

            setIsEditing(false)
        } catch (error) {
            console.error("Error updating food item:", error)
            showMessage(error)
        }
    }

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
                        activeOpacity={0.8}
                    >
                        <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} resizeMode="contain" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage} activeOpacity={0.7}>
                        <Text style={styles.placeholderIcon}>📷</Text>
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

            {/* Results Card - Now matches history style */}
            {result && !isProcessing && (
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
                                {Platform.OS === "web" ? (
                                    <div style={{ color: "#3498db", cursor: "pointer", fontSize: "18px" }}>✎</div>
                                ) : (
                                    <Text style={sharedStyles.editButtonText}>✎</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[sharedStyles.deleteButton, isDeleting && { opacity: 0.5 }]}
                                onPress={handleDeleteResult}
                                disabled={isDeleting}
                            >
                                {Platform.OS === "web" ? (
                                    <div
                                        style={{
                                            color: "#e74c3c",
                                            cursor: isDeleting ? "not-allowed" : "pointer",
                                            fontSize: "18px",
                                            transform: isDeleting ? "rotate(180deg)" : "rotate(0deg)",
                                            transition: "transform 0.3s ease",
                                            userSelect: "none",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: "100%",
                                            height: "100%",
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            if (!isDeleting) {
                                                handleDeleteResult()
                                            }
                                        }}
                                    >
                                        🗑
                                    </div>
                                ) : (
                                    <Text style={sharedStyles.deleteButtonText}>🗑</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={sharedStyles.foodCalories}>{result.calo} calories</Text>

                    <View style={sharedStyles.imagesContainer}>
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
                    </View>

                    <Text style={sharedStyles.foodDate}>{formatDate(result.createdAt)}</Text>
                    <Text style={sharedStyles.confidenceText}>Confidence: {result.confidencePercentage}</Text>

                    <View style={sharedStyles.commentContainer}>
                        <Text style={sharedStyles.commentLabel}>Notes:</Text>
                        <Text style={sharedStyles.foodComment}>{result.comment ? result.comment : "No notes"}</Text>
                    </View>
                </Animated.View>
            )}

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
    )
}
const modalStyles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        zIndex: 1000,
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
    imageContainer: {
        maxWidth: "90%",
        maxHeight: "80%",
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: 350,
        height: 350,
        maxWidth: "100%",
        maxHeight: "100%",
    },
    closeButton: {
        position: "absolute",
        top: 40,
        right: 20,
        backgroundColor: "#fff",
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
        zIndex: 1001,
    },
    closeButtonText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
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
})

export default Index
