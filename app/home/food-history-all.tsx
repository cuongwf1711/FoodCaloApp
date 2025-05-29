"use client"

import { Ionicons } from "@expo/vector-icons"
import type React from "react"

import { useCallback, useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    Animated,
    Easing,
    FlatList,
    Image,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native"

// Import shared utilities
import {
    EditModal,
    type FoodItem,
    type SortOption,
    formatDate,
    styles as sharedStyles,
    useFoodHistory,
} from "@/utils/food-history-utils"

import { showMessage } from "@/utils/showMessage"
import * as FileSystem from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library'

// Conditional ReactDOM import for web portals
let ReactDOM: any;
if (Platform.OS === 'web') {
  try {
    ReactDOM = require('react-dom');
  } catch (e) {
    console.warn('ReactDOM is not available. Web modal portal might not work.');
  }
}

// Platform-specific module imports for gesture handling
let GestureHandlerModule: any; // Renamed to avoid conflict if GestureHandler is a type
if (Platform.OS !== "web") {
    try {
        GestureHandlerModule = require("react-native-gesture-handler");
    } catch (error) {
        console.warn("react-native-gesture-handler not available. Pinch-to-zoom will not work.");
        GestureHandlerModule = null;
    }
}

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
const EnhancedLoadingOverlay: React.FC<{ message?: string }> = ({ message = "Loading data..." }) => {
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
                sharedStyles.loadingOverlay,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <Animated.View
                style={[
                    sharedStyles.loadingCard,
                    {
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={sharedStyles.loadingOverlayText}>{message}</Text>
            </Animated.View>
        </Animated.View>
    )
}

// Enhanced Delete Loading Overlay similar to EnhancedLoadingOverlay
const DeleteLoadingOverlay: React.FC<{ message?: string }> = ({ message = "Deleting..." }) => {
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
                    borderRadius: "12px",
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
                        boxShadow: "0 4px 20px rgba(231, 76, 60, 0.25)",
                        minWidth: "180px",
                        animation: "pulse 2s infinite",
                        border: "2px solid #e74c3c",
                    }}
                >
                    <div
                        style={{
                            width: "40px",
                            height: "40px",
                            border: "4px solid #f3f3f3",
                            borderTop: "4px solid #e74c3c",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                            marginBottom: "16px",
                        }}
                    />
                    <div
                        style={{
                            fontSize: "16px",
                            color: "#e74c3c",
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
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 999,
                    borderRadius: 12,
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
                        backgroundColor: '#fff',
                        borderRadius: 12,
                        padding: 24,
                        alignItems: 'center',
                        shadowColor: '#e74c3c',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 20,
                        elevation: 8,
                        minWidth: 180,
                        borderWidth: 2,
                        borderColor: '#e74c3c',
                    },
                    {
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <ActivityIndicator size="large" color="#e74c3c" />
                <Text style={{
                    marginTop: 16,
                    fontSize: 16,
                    color: '#e74c3c',
                    fontWeight: '500',
                }}>{message}</Text>
            </Animated.View>
        </Animated.View>
    )
}

interface FoodHistoryAllViewProps {
    sortOption: SortOption
    onSortChange: (sortOption: SortOption) => void
    onDataChange: (totalCalories: number) => void
    onRegisterRefreshTrigger?: (triggerFn: () => void) => void
    key?: string // Add key prop to interface
}

// Define modalStyles BEFORE ImageModal component
const modalStyles = StyleSheet.create({
    modalOverlay: { 
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    topRightButtonContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40, // Adjust for status bar
        right: 20,
        flexDirection: 'row',
        zIndex: 10,
        gap: 15, // Space between buttons
    },
    iconButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 25, // Make it circular
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    imageGestureContainer: { // Renamed from imageContainerNative, centers the fixed-size image
        flex: 1, // Allows centering within the modalOverlay
        width: "100%", 
        justifyContent: 'center', 
        alignItems: 'center', 
    },
    fullImageNative: { // Style for the image itself, fixed dimensions for gesture handling
        borderRadius: 8,
        width: 300, 
        height: 300, 
    },
});

// New ImageModal (inspired by index.tsx and food-history-utils.tsx)
const ImageModal: React.FC<{
    visible: boolean
    imageUri: string
    onClose: () => void
}> = ({ visible, imageUri, onClose }) => {

    // Animated values for zoom and pan (from index.tsx)
    const scale = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const lastScale = useRef(1);
    const lastTranslateX = useRef(0);
    const lastTranslateY = useRef(0);

    useEffect(() => {
        if (visible) {
            // Reset to initial state when modal becomes visible
            scale.setValue(1);
            translateX.setValue(0);
            translateY.setValue(0);
            lastScale.current = 1;
            lastTranslateX.current = 0;
            lastTranslateY.current = 0;
        }
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        if (visible && Platform.OS === "web") {
            document.addEventListener("keydown", handleEscape);
            return () => document.removeEventListener("keydown", handleEscape);
        }
    }, [visible, onClose, scale, translateX, translateY]);

    const downloadImage = async () => {
        if (!imageUri) return;
        try {
            if (Platform.OS === "web") {
                const response = await fetch(imageUri);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;

                const urlParts = imageUri.split('/');
                let filename = urlParts[urlParts.length - 1].split('?')[0] || 'image'; // Remove query params
                if (!filename.includes('.') && blob.type && blob.type.includes('/')) {
                    const extension = blob.type.split('/')[1];
                    if (extension && !['*', 'octet-stream'].includes(extension)) {
                        filename += `.${extension}`;
                    }
                }
                link.download = filename;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                showMessage({ message: "Image downloaded successfully" }, true);
            } else { // Native
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status !== "granted") {
                    showMessage({ message: "Permission to access media library is required!" }, false);
                    return;
                }
                
                let fileUriToSave = imageUri;
                let temporaryFile = false;

                if (!imageUri.startsWith('file://')) {
                    const randomName = Math.random().toString(36).substring(7);
                    const uriParts = imageUri.split('.');
                    const extension = uriParts.length > 1 ? uriParts.pop()?.split('?')[0] : 'jpg';
                    const tempFileName = `${randomName}.${extension}`;

                    const downloadResult = await FileSystem.downloadAsync(
                        imageUri,
                        FileSystem.documentDirectory + tempFileName
                    );
                    if (downloadResult.status !== 200) {
                        showMessage({ message: "Failed to download image" }, false);
                        return;
                    }
                    fileUriToSave = downloadResult.uri;
                    temporaryFile = true;
                }
                
                await MediaLibrary.createAssetAsync(fileUriToSave);
                showMessage({ message: "Image saved to gallery" }, true);

                if (temporaryFile) {
                     try {
                        await FileSystem.deleteAsync(fileUriToSave, { idempotent: true });
                    } catch (cleanupError) {
                        console.log('Cleanup error (non-critical):', cleanupError);
                    }
                }
            }
        } catch (error: any) {
            console.error('Download error:', error);
            showMessage({ message: `Error downloading image: ${error.message || 'Unknown error'}` }, false);
        }
    };

    if (!visible) return null;

    if (Platform.OS === "web") {
        const modalContent = (
            <div
                style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.9)", display: "flex",
                    justifyContent: "center", alignItems: "center", zIndex: 100000,
                }}
                onClick={onClose}
            >
                <div 
                    style={{ position: "relative", maxWidth: "90%", maxHeight: "90%", display: "flex", flexDirection: "column", alignItems: "center" }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <img
                        src={imageUri || "/placeholder.svg"}
                        alt="Full size"
                        style={{ maxWidth: "100%", maxHeight: "calc(90vh - 50px)", borderRadius: 8, objectFit: "contain" }}
                    />
                    <div style={{
                        display: "flex", gap: "10px", zIndex: 100001,
                        padding: "10px", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: "0 0 8px 8px", marginTop: "auto"
                    }}>
                        <button
                            onClick={downloadImage}
                            style={{ padding: '8px 12px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Download
                        </button>
                        <button
                            onClick={onClose}
                            style={{ padding: '8px 12px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
        if (typeof document !== "undefined" && ReactDOM) {
            return ReactDOM.createPortal(modalContent, document.body);
        }
        return modalContent; 
    }

    // Native part with Gesture Handler
    if (GestureHandlerModule) { // Use the renamed variable
        const { PinchGestureHandler, PanGestureHandler, State, GestureHandlerRootView } = GestureHandlerModule; // Destructure here

        const onPinchEvent = Animated.event(
            [{ nativeEvent: { scale: scale } }],
            { useNativeDriver: true }
        );

        const onPinchStateChange = (event: any) => {
            if (event.nativeEvent.oldState === State.ACTIVE) {
                lastScale.current *= event.nativeEvent.scale;
                scale.setValue(lastScale.current);
            }
        };

        const onPanEvent = Animated.event(
            [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
            { useNativeDriver: true }
        );

        const onPanStateChange = (event: any) => {
            if (event.nativeEvent.oldState === State.ACTIVE) {
                lastTranslateX.current += event.nativeEvent.translationX;
                lastTranslateY.current += event.nativeEvent.translationY;
                translateX.setValue(lastTranslateX.current);
                translateY.setValue(lastTranslateY.current);
            }
        };
        
        const onDoubleTap = () => {
            Animated.parallel([
                Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
                Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
            ]).start();
            lastScale.current = 1;
            lastTranslateX.current = 0;
            lastTranslateY.current = 0;
        };

        return (
            <Modal
                visible={visible}
                transparent={true}
                animationType="fade"
                onRequestClose={onClose}
                statusBarTranslucent={true}
            >
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <View style={modalStyles.modalOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={onClose}
                        />
                        <View style={modalStyles.topRightButtonContainer}>
                            <TouchableOpacity style={modalStyles.iconButton} onPress={downloadImage}>
                                <Ionicons name="download-outline" size={24} color="#333" />
                            </TouchableOpacity>
                            <TouchableOpacity style={modalStyles.iconButton} onPress={onClose}>
                                <Ionicons name="close-outline" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={modalStyles.imageGestureContainer} pointerEvents="box-none">
                            <PanGestureHandler
                                onGestureEvent={onPanEvent}
                                onHandlerStateChange={onPanStateChange}
                            >
                                <Animated.View>
                                    <PinchGestureHandler
                                        onGestureEvent={onPinchEvent}
                                        onHandlerStateChange={onPinchStateChange}
                                    >
                                        {/* Corrected: PinchGestureHandler now wraps Animated.View */}
                                        <Animated.View>
                                            <TouchableOpacity onPress={onDoubleTap} activeOpacity={1}>
                                                <Animated.Image
                                                    source={{ uri: imageUri }}
                                                    style={[
                                                        modalStyles.fullImageNative, // This has width: 300, height: 300
                                                        {
                                                            transform: [
                                                                { scale: scale },
                                                                { translateX: translateX },
                                                                { translateY: translateY },
                                                            ],
                                                        },
                                                    ]}
                                                    resizeMode="contain"
                                                />
                                            </TouchableOpacity>
                                        </Animated.View>
                                    </PinchGestureHandler>
                                </Animated.View>
                            </PanGestureHandler>
                        </View>
                    </View>
                </GestureHandlerRootView>
            </Modal>
        );
    }

    // Fallback Native part (no gestures)
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={modalStyles.modalOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={modalStyles.topRightButtonContainer}>
                    <TouchableOpacity style={modalStyles.iconButton} onPress={downloadImage}>
                        <Ionicons name="download-outline" size={24} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style={modalStyles.iconButton} onPress={onClose}>
                        {/* Corrected: Ionicons inside TouchableOpacity */}
                        <Ionicons name="close-outline" size={28} color="#333" />
                    </TouchableOpacity>
                </View>
                <View style={modalStyles.imageGestureContainer} pointerEvents="box-none">
                     <Image
                        source={{ uri: imageUri }}
                        style={modalStyles.fullImageNative}
                        resizeMode="contain"
                    />
                </View>
            </View>
        </Modal>
    );
};


/**
 * Component to display all food history items
 * Supports sorting, pagination, and item editing/deletion
 */
const FoodHistoryAllView: React.FC<FoodHistoryAllViewProps> = ({
    sortOption,
    onSortChange,
    onDataChange,
    onRegisterRefreshTrigger,
}) => {
    const {
        foodItems,
        isLoading,
        isLoadingMore,
        isRefreshing,
        error,
        page,
        hasMore,
        totalCalories,
        updateCounter,
        fetchFoodHistory,
        handleDeleteItem,
        saveEditedItem,
        handleSortChange,
        scrollToTop: scrollToTopUtil,
    } = useFoodHistory("newest", sortOption, onDataChange)

    // UI state management
    const [modalVisible, setModalVisible] = useState(false)
    const [modalImageUri, setModalImageUri] = useState("")
    const [editingItem, setEditingItem] = useState<FoodItem | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [showScrollToTop, setShowScrollToTop] = useState(false)
    const flatListRef = useRef<FlatList>(null)

    // Animation states
    const [isDataChanging, setIsDataChanging] = useState(false)
    const [isSortChanging, setIsSortChanging] = useState(false)

    // FIXED: Simplified force re-render for Android compatibility
    const [, forceUpdate] = useState({})
    useEffect(() => {
        if (Platform.OS === "android") {
            forceUpdate({})
        }
    }, [updateCounter, totalCalories])

    const isInitialMountRef = useRef(true)
    const lastFetchTimeRef = useRef(0)

    // Initial data load - only run once on mount
    useEffect(() => {
        if (isInitialMountRef.current) {
            fetchFoodHistory(1, true)
            isInitialMountRef.current = false
        }
    }, [])

    // Add useEffect mới để register refresh trigger:
    useEffect(() => {
        const refreshTrigger = () => {
            const now = Date.now()
            // Prevent rapid successive calls (debounce 1 second)
            if (now - lastFetchTimeRef.current < 1000) {
                return
            }

            lastFetchTimeRef.current = now
            fetchFoodHistory(1, true)
        }

        if (onRegisterRefreshTrigger) {
            onRegisterRefreshTrigger(refreshTrigger)
        }
    }, [onRegisterRefreshTrigger, fetchFoodHistory])

    // FIXED: Handle sort option change with better logging
    useEffect(() => {
        if (sortOption) {
            handleSortChange(sortOption, (sortOpt) => {
                if (flatListRef.current) {
                    scrollToTopUtil(flatListRef as React.RefObject<FlatList<any>>)
                }
                setShowScrollToTop(false)
                fetchFoodHistory(1, true, sortOpt)
            })
        }
    }, [sortOption, handleSortChange, fetchFoodHistory, scrollToTopUtil])

    // Handle refresh (pull to refresh)
    const handleRefresh = useCallback(() => {
        if (!isRefreshing) {
            // Force a complete refresh
            fetchFoodHistory(1, true)
        }
        setShowScrollToTop(false)
    }, [fetchFoodHistory, isRefreshing])

    // Handle pagination when scrolling to bottom
    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && hasMore && !isRefreshing) {
            fetchFoodHistory(page + 1)
        }
    }, [fetchFoodHistory, isLoadingMore, hasMore, isRefreshing, page])

    // Open image modal
    const openImageModal = useCallback((uri: string) => {
        setModalImageUri(uri)
        setModalVisible(true)
    }, [])

    // Close image modal
    const closeImageModal = useCallback(() => {
        setModalVisible(false)
    }, [])

    // Start editing an item
    const startEditing = useCallback((item: FoodItem) => {
        setEditingItem(item)
        setIsEditing(true)
    }, [])

    // Save edited item
    const handleSaveEditedItem = useCallback(
        async (calories: string, comment: string) => {
            if (!editingItem) return

            const success = await saveEditedItem(editingItem, calories, comment)
            if (success) {
                setIsEditing(false)
                setEditingItem(null)
                // Hide scroll-to-top button after edit
                setShowScrollToTop(false)
            }
        },
        [editingItem, saveEditedItem],
    )

    // Cancel editing
    const cancelEditing = useCallback(() => {
        setIsEditing(false)
        setEditingItem(null)
    }, [])

    // Handle scroll events
    const handleScroll = useCallback((event: any) => {
        const scrollY = event.nativeEvent.contentOffset.y
        setShowScrollToTop(scrollY > 300)
    }, [])

    // Scroll to top function
    const scrollToTop = useCallback(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
    }, [])

    // Enhanced render food item with new delete effect
    const renderFoodItem = useCallback(
        ({ item }: { item: FoodItem }) => {
            const formattedDate = formatDate(item.createdAt)
            const isDeleting = item.isDeleting || false

            return (
                <View style={[sharedStyles.foodCard, isDeleting && { opacity: 0.9 }]}>
                    {/* Delete Loading Overlay */}
                    {isDeleting && <DeleteLoadingOverlay/>}

                    <View style={sharedStyles.foodCardHeader}>
                        <Text style={sharedStyles.foodName}>{item.predictName}</Text>
                        <View style={sharedStyles.actionButtons}>
                            <TouchableOpacity
                                style={sharedStyles.editButton}
                                onPress={() => startEditing(item)}
                                disabled={isDeleting}
                            >
                                {Platform.OS === "web" ? (
                                    <div
                                        style={{
                                            color: isDeleting ? "#ccc" : "#3498db",
                                            cursor: isDeleting ? "not-allowed" : "pointer",
                                            fontSize: "18px",
                                        }}
                                    >
                                        ✎
                                    </div>
                                ) : (
                                    <Ionicons name="create-outline" size={18} color={isDeleting ? "#ccc" : "#3498db"} />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[sharedStyles.deleteButton, isDeleting && { opacity: 0.5 }]}
                                onPress={async () => {
                                    await handleDeleteItem(item.id)
                                    // Hide scroll-to-top button after delete
                                    setShowScrollToTop(false)
                                }}
                                disabled={isDeleting}
                            >
                                {Platform.OS === "web" ? (
                                    <div style={{ color: "#e74c3c", cursor: isDeleting ? "not-allowed" : "pointer", fontSize: "18px" }}>🗑</div>
                                ) : isDeleting ? (
                                    <Ionicons name="reload-outline" size={18} color="#e74c3c" />
                                ) : (
                                    <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={sharedStyles.foodCalories}>{item.calo} calories</Text>

                    <View style={sharedStyles.imagesContainer}>
                        <TouchableOpacity
                            style={sharedStyles.imageWrapper}
                            onPress={() => openImageModal(item.publicUrl.originImage)}
                            activeOpacity={0.9}
                            disabled={isDeleting}
                        >
                            <Image
                                source={{ uri: item.publicUrl.originImage }}
                                style={sharedStyles.thumbnailImage}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={sharedStyles.imageWrapper}
                            onPress={() => openImageModal(item.publicUrl.segmentationImage)}
                            activeOpacity={0.9}
                            disabled={isDeleting}
                        >
                            <Image
                                source={{ uri: item.publicUrl.segmentationImage }}
                                style={sharedStyles.thumbnailImage}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>

                    <Text style={sharedStyles.foodDate}>{formattedDate}</Text>
                    <Text style={sharedStyles.confidenceText}>Confidence: {item.confidencePercentage}</Text>

                    <View style={sharedStyles.commentContainer}>
                        <Text style={sharedStyles.commentLabel}>Notes:</Text>
                        <Text style={sharedStyles.foodComment}>{item.comment ? item.comment : "No notes"}</Text>
                    </View>
                </View>
            )
        },
        [openImageModal, handleDeleteItem, startEditing],
    )

    // Render footer (loading indicator for pagination)
    const renderFooter = useCallback(() => {
        if (!isLoadingMore) return null

        return (
            <View style={sharedStyles.footerLoader}>
                <ActivityIndicator size="small" color="#0066CC" />
                <Text style={sharedStyles.loadingMoreText}>Loading more...</Text>
            </View>
        )
    }, [isLoadingMore])

    // Render end of list message
    const renderEndOfList = useCallback(() => {
        if (isLoadingMore || hasMore || foodItems.length === 0) return null

        return (
            <View style={sharedStyles.endOfListContainer}>
                <Text style={sharedStyles.endOfListText}>No more items to load</Text>
            </View>
        )
    }, [isLoadingMore, hasMore, foodItems.length])

    // Render empty state
    const renderEmpty = useCallback(() => {
        if (isLoading) return null

        return (
            <View style={sharedStyles.emptyContainer}>
                <Text style={sharedStyles.emptyText}>No food history found</Text>
                <TouchableOpacity style={sharedStyles.retryButton} onPress={() => fetchFoodHistory()}>
                    <Text style={sharedStyles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        )
    }, [isLoading, fetchFoodHistory])

    // Main render
    if (isLoading) {
        return (
            <View style={sharedStyles.container}>
                <EnhancedLoadingOverlay />
            </View>
        )
    }

    if (error) {
        return (
            <View style={sharedStyles.errorContainer}>
                <Text style={sharedStyles.errorText}>{error}</Text>
                <TouchableOpacity style={sharedStyles.retryButton} onPress={() => fetchFoodHistory()}>
                    <Text style={sharedStyles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <View style={sharedStyles.container} key={updateCounter}>
            <FlatList
                ref={flatListRef}
                data={foodItems}
                renderItem={renderFoodItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={sharedStyles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={() => (
                    <>
                        {renderFooter()}
                        {renderEndOfList()}
                    </>
                )}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={["#3498db"]}
                        tintColor="#3498db"
                    />
                }
                extraData={updateCounter}
            />

            {showScrollToTop && (
                <TouchableOpacity style={sharedStyles.scrollToTopButton} onPress={scrollToTop} activeOpacity={0.8}>
                    {Platform.OS === "web" ? (
                        <div style={{ color: "#fff", fontSize: "20px" }}>↑</div>
                    ) : (
                        <Ionicons name="chevron-up" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            )}

            <ImageModal visible={modalVisible} imageUri={modalImageUri} onClose={closeImageModal} />
            {editingItem && (
                <EditModal
                    visible={isEditing}
                    initialCalo={editingItem.calo.toString()}
                    initialComment={editingItem.comment || ""}
                    onSave={handleSaveEditedItem}
                    onCancel={cancelEditing}
                />
            )}
            {/* Loading overlay for data changes */}
            {(isDataChanging || isSortChanging) && <EnhancedLoadingOverlay />}
        </View>
    )
}

export default FoodHistoryAllView