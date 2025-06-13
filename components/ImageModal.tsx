"use client"

import { downloadFile } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import { Ionicons } from "@expo/vector-icons"
import React, { useEffect, useRef } from "react"
import {
    Animated,
    Image,
    Modal,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native"

// Platform-specific module imports
let GestureHandler: any
let ReactDOM: any
let FileSystem: any
let MediaLibrary: any

if (Platform.OS === "web") {
    try {
        ReactDOM = require("react-dom")
    } catch (e) {
        console.warn("ReactDOM is not available. Web modal portal might not work.")
    }
} else {
    try {
        FileSystem = require("expo-file-system")
        MediaLibrary = require("expo-media-library")
    } catch (error) {
        console.warn("FileSystem or MediaLibrary not available")
    }
    
    // Import gesture handler for native platforms
    try {
        GestureHandler = require("react-native-gesture-handler")
    } catch (error) {
        console.warn("react-native-gesture-handler not available")
        GestureHandler = null
    }
}

interface ImageModalProps {
    visible: boolean
    imageUri: string
    onClose: () => void
}

/**
 * Enhanced ImageModal with proper cross-platform support and pinch-to-zoom
 * Reusable component for displaying images in a modal with download functionality
 */
const ImageModal: React.FC<ImageModalProps> = ({ visible, imageUri, onClose }) => {
    // Animated values for zoom only (remove pan completely)
    const scale = useRef(new Animated.Value(1)).current
    const lastScale = useRef(1)

    // Reset zoom when modal opens/closes
    useEffect(() => {
        if (visible) {
            // Reset to initial state
            scale.setValue(1)
            lastScale.current = 1
        }
    }, [visible, scale])

    // Create gesture handlers for native platforms (pinch only)
    const createGestureHandlers = () => {
        if (!GestureHandler || Platform.OS === "web") {
            return null
        }

        const { PinchGestureHandler, State } = GestureHandler

        const onPinchEvent = Animated.event(
            [{ nativeEvent: { scale: scale } }],
            { useNativeDriver: true }
        )

        const onPinchStateChange = (event: any) => {
            if (event.nativeEvent.oldState === State.ACTIVE) {
                lastScale.current *= event.nativeEvent.scale
                scale.setValue(lastScale.current)
            }
        }

        // Double tap to reset zoom
        const onDoubleTap = () => {
            Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
            }).start()
            
            lastScale.current = 1
        }

        return {
            PinchGestureHandler,
            onPinchEvent,
            onPinchStateChange,
            onDoubleTap,
        }
    }

    const gestureHandlers = createGestureHandlers()

    // Web-specific effects
    useEffect(() => {
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
    
    const downloadImage = async () => {
        if (!imageUri) return

        try {
            if (Platform.OS === "web") {
                // Web download implementation using axios
                const response = await downloadFile(imageUri)
                const blob = response.data
                
                // Create download link
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                
                // Extract filename from URL without adding extension
                const urlParts = imageUri.split('/')
                const filename = urlParts[urlParts.length - 1] || 'image'
                link.download = filename
                
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
                
                // showMessage({ message: "Image downloaded successfully" }, true)
            } else {
                // Native download implementation
                const { status } = await MediaLibrary.requestPermissionsAsync()
                if (status !== "granted") {
                    showMessage({ message: "Permission required to save images" }, true)
                    return
                }
                
                // Check if it's a local file URI or remote URL
                if (imageUri.startsWith('file://') || (!imageUri.startsWith('http://') && !imageUri.startsWith('https://'))) {
                    // It's a local file, copy directly to gallery
                    try {
                        await MediaLibrary.createAssetAsync(imageUri)
                        showMessage({ message: "Image saved to gallery" }, true)
                        return
                    } catch (localError) {
                        console.error('Local save error:', localError)
                        showMessage({ message: "Error saving local image" }, true)
                        return
                    }
                }

                // It's a remote URL, download first then save
                try {
                    // Extract filename from URL without adding extension
                    const urlParts = imageUri.split('/')
                    const filename = urlParts[urlParts.length - 1] || 'image'
                    
                    const fileUri = FileSystem.documentDirectory + filename
                    const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri)
                    
                    if (downloadResult.status === 200) {
                        // Save to device gallery using MediaLibrary
                        await MediaLibrary.createAssetAsync(downloadResult.uri)
                        showMessage({ message: "Image saved to gallery" }, true)
                        
                        // Clean up the temporary file
                        try {
                            await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true })
                        } catch (cleanupError) {
                            console.log('Cleanup error (non-critical):', cleanupError)
                        }
                    } else {
                        showMessage({ message: "Failed to download image" }, true)
                    }
                } catch (downloadError) {
                    console.error('Remote download error:', downloadError)
                    showMessage({ message: "Error downloading remote image" }, true)
                }
            }
        } catch (error) {
            console.error('Download error:', error)
            showMessage({ message: "Error downloading image" }, true)
        }
    }

    if (Platform.OS === "web") {
        if (!visible) return null

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
                    backgroundColor: "rgba(0,0,0,0.9)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 999999,
                    margin: 0,
                    padding: 0,
                }}
                onClick={onClose}
            >
                {/* Button container */}
                <div style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    display: "flex",
                    gap: "8px",
                    zIndex: 1000000,
                }}>
                    {/* Download button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            downloadImage()
                        }}
                        style={{
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            border: "none",
                            borderRadius: "50%",
                            width: "40px",
                            height: "40px",
                            fontSize: "18px",
                            color: "#333",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(52, 152, 219, 0.9)"
                            e.currentTarget.style.color = "#fff"
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)"
                            e.currentTarget.style.color = "#333"
                        }}
                        title="Download image"
                    >
                        <Ionicons name="download-outline" size={20} color="currentColor" />
                    </button>
                    
                    {/* Close button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                        }}
                        style={{
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            border: "none",
                            borderRadius: "50%",
                            width: "40px",
                            height: "40px",
                            fontSize: "20px",
                            color: "#333",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(231, 76, 60, 0.9)"
                            e.currentTarget.style.color = "#fff"
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)"
                            e.currentTarget.style.color = "#333"
                        }}
                        title="Close"
                    >
                        <Ionicons name="close" size={20} color="currentColor" />
                    </button>
                </div>

                <img
                    onClick={(e) => e.stopPropagation()}
                    src={imageUri}
                    style={{
                        maxWidth: "100%",
                        maxHeight: "80%",
                        objectFit: "contain",
                        borderRadius: 8,
                        boxShadow: "none",
                    }}
                    alt="Preview"
                />
            </div>
        )

        // Use React portal to render outside of current component tree
        if (typeof document !== "undefined" && ReactDOM) {
            const portalRoot = document.body
            return ReactDOM.createPortal(modalContent, portalRoot)
        }

        return modalContent
    }

    // Native version using Modal component with gesture support (pinch only)
    if (gestureHandlers) {
        const {
            PinchGestureHandler,
            onPinchEvent,
            onPinchStateChange,
            onDoubleTap,
        } = gestureHandlers

        const { GestureHandlerRootView } = GestureHandler

        return (
            <Modal
                visible={visible}
                transparent={true}
                animationType="fade"
                onRequestClose={onClose}
                statusBarTranslucent={true}
            >
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <View style={modalStyles.overlay}>
                        {/* Background touchable area */}
                        <TouchableOpacity 
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={onClose}
                        />

                        {/* Button container */}
                        <View style={modalStyles.buttonContainer}>
                            {/* Download button */}
                            <TouchableOpacity
                                style={[modalStyles.actionButton, modalStyles.downloadButton]}
                                onPress={downloadImage}
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            >
                                <Ionicons name="download-outline" size={24} color="#333" />
                            </TouchableOpacity>

                            {/* Close button */}
                            <TouchableOpacity
                                style={[modalStyles.actionButton, modalStyles.closeButton]}
                                onPress={onClose}
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Image container */}
                        <View style={modalStyles.imageContainer} pointerEvents="box-none">
                            <PinchGestureHandler
                                onGestureEvent={onPinchEvent}
                                onHandlerStateChange={onPinchStateChange}
                            >
                                <Animated.View style={{ transform: [{ scale }] }}>
                                    <TouchableOpacity onPress={onDoubleTap} activeOpacity={1}>
                                        <Image
                                            source={{ uri: imageUri }}
                                            style={{
                                                width: 300,
                                                height: 300,
                                                objectFit: "contain",
                                                borderRadius: 8,
                                            }}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>
                                </Animated.View>
                            </PinchGestureHandler>
                        </View>
                    </View>
                </GestureHandlerRootView>
            </Modal>
        )
    }

    // Fallback native version without gesture support
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={modalStyles.overlay}>
                {/* Background touchable area */}
                <TouchableOpacity 
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />

                {/* Button container */}
                <View style={modalStyles.buttonContainer}>
                    {/* Download button */}
                    <TouchableOpacity
                        style={[modalStyles.actionButton, modalStyles.downloadButton]}
                        onPress={downloadImage}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Ionicons name="download-outline" size={24} color="#333" />
                    </TouchableOpacity>

                    {/* Close button */}
                    <TouchableOpacity
                        style={[modalStyles.actionButton, modalStyles.closeButton]}
                        onPress={onClose}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {/* Image container */}
                <View style={modalStyles.imageContainer} pointerEvents="box-none">
                    <Image
                        source={{ uri: imageUri }}
                        style={{
                            width: 300,
                            height: 300,
                            objectFit: "contain",
                            borderRadius: 8,
                        }}
                        resizeMode="contain"
                    />
                </View>
            </View>
        </Modal>
    )
}

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    buttonContainer: {
        position: "absolute",
        top: 50,
        right: 20,
        flexDirection: "row",
        gap: 8,
        zIndex: 1001,
    },
    actionButton: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    downloadButton: {
        // Specific styles for download button if needed
    },
    closeButton: {
        // Specific styles for close button if needed
    },
    imageContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
})

export default ImageModal
