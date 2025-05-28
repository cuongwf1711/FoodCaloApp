"use client"

import React from "react"

import { URL_FOOD_CALO_ESTIMATOR } from "@/constants/url_constants"
import { deleteData, patchData, postData } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import { useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

// Import shared utilities
import { useTabReload } from "@/hooks/use-tab-reload"
import { formatDate, styles as sharedStyles } from "@/utils/food-history-utils"

// Add CSS animation for web spinning effect - only on client side
if (typeof window !== "undefined" && Platform.OS === "web") {
    const style = document.createElement("style")
    style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes fadeInUp {
      from { 
        opacity: 0; 
        transform: translateY(20px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `
    document.head.appendChild(style)
}

// Enhanced Loading Component with better animations
const EnhancedLoadingOverlay: React.FC<{ message?: string }> = ({ message = "Processing image..." }) => {
    const [fadeAnim] = useState(new Animated.Value(0))
    const [scaleAnim] = useState(new Animated.Value(0.8))

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start()
    }, [])

    if (Platform.OS === "web") {
        return (
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 999,
                    animation: "fadeInUp 0.3s ease-out",
                }}
            >
                <div
                    style={{
                        backgroundColor: "#fff",
                        borderRadius: "12px",
                        padding: "24px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                        minWidth: "200px",
                        animation: "pulse 2s infinite",
                    }}
                >
                    <div
                        style={{
                            width: "40px",
                            height: "40px",
                            border: "4px solid #f3f3f3",
                            borderTop: "4px solid #3498db",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                            marginBottom: "16px",
                        }}
                    />
                    <div
                        style={{
                            fontSize: "16px",
                            color: "#666",
                            fontWeight: "500",
                        }}
                    >
                        {message}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <Animated.View
            style={[
                {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 999,
                },
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <Animated.View
                style={[
                    {
                        backgroundColor: "#fff",
                        borderRadius: 12,
                        padding: 24,
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 20,
                        elevation: 8,
                        minWidth: 200,
                    },
                    {
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={{
                    marginTop: 16,
                    fontSize: 16,
                    color: "#666",
                    fontWeight: "500",
                }}>{message}</Text>
            </Animated.View>
        </Animated.View>
    )
}

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

// Add ReactDOM import for web portal
let ReactDOM: any
if (Platform.OS === "web") {
    ReactDOM = require("react-dom")
}

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

// Enhanced ImageModal with better web positioning and portal rendering
const ImageModal: React.FC<{
    visible: boolean
    imageUri: string
    onClose: () => void
}> = ({ visible, imageUri, onClose }) => {
    React.useEffect(() => {
        if (Platform.OS === "web") {
            if (visible) {
                // Prevent scrolling on the background
                document.body.style.overflow = "hidden"
                document.body.style.position = "fixed"
                document.body.style.width = "100%"

                // Add escape key listener
                const handleEscape = (e: KeyboardEvent) => {
                    if (e.key === "Escape") {
                        onClose()
                    }
                }
                document.addEventListener("keydown", handleEscape)

                return () => {
                    document.body.style.overflow = ""
                    document.body.style.position = ""
                    document.body.style.width = ""
                    document.removeEventListener("keydown", handleEscape)
                }
            }
        }
    }, [visible, onClose])

    if (!visible) return null

    if (Platform.OS === "web") {
        // Create portal to render modal at document.body level
        const modalContent = (
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: "100vw",
                    height: "100vh",
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 999999,
                    margin: 0,
                    padding: "20px",
                    boxSizing: "border-box",
                }}
                onClick={onClose}
            >
                {/* Top close button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                    }}
                    style={{
                        position: "absolute",
                        top: "20px",
                        right: "20px",
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        border: "none",
                        borderRadius: "50%",
                        width: "50px",
                        height: "50px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "#333",
                        cursor: "pointer",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000000,
                        transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#fff"
                        e.currentTarget.style.transform = "scale(1.1)"
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)"
                        e.currentTarget.style.transform = "scale(1)"
                    }}
                >
                    ✕
                </button>

                <div
                    style={{
                        position: "relative",
                        maxWidth: "90vw",
                        maxHeight: "80vh",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <img
                        src={imageUri || "/placeholder.svg"}
                        alt="Full size"
                        style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            borderRadius: "8px",
                            objectFit: "contain",
                            display: "block",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                        }}
                    />
                </div>
            </div>
        )

        // Use React portal to render outside of current component tree
        if (typeof document !== "undefined") {
            const portalRoot = document.body
            return ReactDOM.createPortal(modalContent, portalRoot)
        }

        return modalContent
    }

    // Native implementation remains the same
    return (
        <View style={modalStyles.overlay}>
            <TouchableOpacity style={modalStyles.backdrop} onPress={onClose} activeOpacity={1} />

            <TouchableOpacity
                style={[modalStyles.closeButton, { top: 40, right: 20 }]}
                onPress={onClose}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
                <Text style={modalStyles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <View style={modalStyles.container}>
                <View style={modalStyles.imageContainer}>
                    <Image source={{ uri: imageUri }} style={modalStyles.image} resizeMode="contain" />
                </View>
            </View>
        </View>
    )
}

// Enhanced EditModal with same behavior as ImageModal
const EditModal: React.FC<{
    visible: boolean
    initialCalo: string
    initialComment: string
    onSave: (calories: string, comment: string) => void
    onCancel: () => void
}> = ({ visible, initialCalo, initialComment, onSave, onCancel }) => {
    const [calories, setCalories] = useState(initialCalo)
    const [comment, setComment] = useState(initialComment)

    // Reset values when modal becomes visible
    React.useEffect(() => {
        if (visible) {
            setCalories(initialCalo)
            setComment(initialComment)
        }
    }, [visible, initialCalo, initialComment])

    React.useEffect(() => {
        if (Platform.OS === "web") {
            if (visible) {
                // Prevent scrolling on the background
                document.body.style.overflow = "hidden"
                document.body.style.position = "fixed"
                document.body.style.width = "100%"

                // Add escape key listener
                const handleEscape = (e: KeyboardEvent) => {
                    if (e.key === "Escape") {
                        onCancel()
                    }
                }
                document.addEventListener("keydown", handleEscape)

                return () => {
                    document.body.style.overflow = ""
                    document.body.style.position = ""
                    document.body.style.width = ""
                    document.removeEventListener("keydown", handleEscape)
                }
            }
        }
    }, [visible, onCancel])

    const handleSave = () => {
        onSave(calories, comment)
    }

    if (!visible) return null

    if (Platform.OS === "web") {
        // Create portal to render modal at document.body level
        const modalContent = (
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: "100vw",
                    height: "100vh",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 999999,
                    margin: 0,
                    padding: "20px",
                    boxSizing: "border-box",
                }}
                onClick={onCancel}
            >
                <div
                    style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "24px",
                        maxWidth: "500px",
                        width: "100%",
                        maxHeight: "80vh",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                        position: "relative",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onCancel}
                        style={{
                            position: "absolute",
                            top: "12px",
                            right: "12px",
                            backgroundColor: "transparent",
                            border: "none",
                            fontSize: "20px",
                            color: "#666",
                            cursor: "pointer",
                            width: "30px",
                            height: "30px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f0f0f0"
                            e.currentTarget.style.color = "#333"
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent"
                            e.currentTarget.style.color = "#666"
                        }}
                    >
                        ✕
                    </button>

                    <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600", color: "#333" }}>
                        Edit Food Details
                    </h3>

                    <div style={{ marginBottom: "16px" }}>
                        <label
                            style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#555" }}
                        >
                            Calories:
                        </label>
                        <input
                            type="number"
                            value={calories}
                            onChange={(e) => setCalories(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "12px",
                                border: "2px solid #e1e5e9",
                                borderRadius: "8px",
                                fontSize: "16px",
                                outline: "none",
                                transition: "border-color 0.2s ease",
                                boxSizing: "border-box",
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = "#3498db"
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#e1e5e9"
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "24px" }}>
                        <label
                            style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#555" }}
                        >
                            Comment:
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            style={{
                                width: "100%",
                                padding: "12px",
                                border: "2px solid #e1e5e9",
                                borderRadius: "8px",
                                fontSize: "16px",
                                outline: "none",
                                transition: "border-color 0.2s ease",
                                resize: "vertical",
                                minHeight: "100px",
                                boxSizing: "border-box",
                                fontFamily: "inherit",
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = "#3498db"
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#e1e5e9"
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                        <button
                            onClick={onCancel}
                            style={{
                                padding: "12px 24px",
                                border: "2px solid #e1e5e9",
                                borderRadius: "8px",
                                backgroundColor: "white",
                                color: "#666",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f8f9fa"
                                e.currentTarget.style.borderColor = "#d1d5db"
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "white"
                                e.currentTarget.style.borderColor = "#e1e5e9"
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            style={{
                                padding: "12px 24px",
                                border: "none",
                                borderRadius: "8px",
                                backgroundColor: "#3498db",
                                color: "white",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#2980b9"
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#3498db"
                            }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        )

        // Use React portal to render outside of current component tree
        if (typeof document !== "undefined") {
            const portalRoot = document.body
            return ReactDOM.createPortal(modalContent, portalRoot)
        }

        return modalContent
    }

    // Native implementation
    return (
        <View style={editModalStyles.overlay}>
            <TouchableOpacity style={editModalStyles.backdrop} onPress={onCancel} activeOpacity={1} />

            <View style={editModalStyles.container}>
                <View style={editModalStyles.modal}>
                    <TouchableOpacity
                        style={editModalStyles.closeButton}
                        onPress={onCancel}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Text style={editModalStyles.closeButtonText}>✕</Text>
                    </TouchableOpacity>

                    <Text style={editModalStyles.title}>Edit Food Details</Text>

                    <View style={editModalStyles.inputContainer}>
                        <Text style={editModalStyles.label}>Calories:</Text>
                        <TextInput
                            style={editModalStyles.input}
                            value={calories}
                            onChangeText={setCalories}
                            keyboardType="numeric"
                            placeholder="Enter calories"
                        />
                    </View>

                    <View style={editModalStyles.inputContainer}>
                        <Text style={editModalStyles.label}>Comment:</Text>
                        <TextInput
                            style={[editModalStyles.input, editModalStyles.textArea]}
                            value={comment}
                            onChangeText={setComment}
                            multiline
                            numberOfLines={4}
                            placeholder="Enter comment"
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={editModalStyles.buttonContainer}>
                        <TouchableOpacity style={editModalStyles.cancelButton} onPress={onCancel}>
                            <Text style={editModalStyles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={editModalStyles.saveButton} onPress={handleSave}>
                            <Text style={editModalStyles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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

    // Use tab reload hook
    const { isReloading, animatedStyle } = useTabReload("index", {
        onReload: async () => {
            // Reset all state when tab is reloaded
            clearAllState()
        },
    })

    // Centralized function to clear all state like reset
    const clearAllState = () => {
        setSelectedImage(null)
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
                    clearAllState()
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
                calo: Number(calories),
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
            }
        } catch (error) {
            // Clear everything if error occurred during edit
            setIsEditing(false)
            clearAllState()
            showMessage(error)
        }
    }

    const cancelEditing = () => {
        setIsEditing(false)
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
                        <EnhancedLoadingOverlay message="Analyzing your food image..." />
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
                        <EnhancedLoadingOverlay message="Deleting result..." />
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

const editModalStyles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    modal: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 24,
        maxWidth: 500,
        width: "100%",
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
    input: {
        borderWidth: 2,
        borderColor: "#e1e5e9",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: "white",
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 24,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderWidth: 2,
        borderColor: "#e1e5e9",
        borderRadius: 8,
        backgroundColor: "white",
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
        backgroundColor: "#3498db",
    },
    saveButtonText: {
        color: "white",
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
        color: "#2c3e50",
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#6c757d",
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
        fontSize: 48,
        color: "#adb5bd",
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
    loadingResultCard: {
        minHeight: 200,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
})

export default Index
