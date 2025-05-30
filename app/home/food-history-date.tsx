"use client"

import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react"; // Added React hooks
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native"; // Added Alert

import { showMessage } from "@/utils/showMessage";
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from "react-native";
// Added imports from food-history-utils
import {
    DatePicker,
    EditModal,
    type FoodItem,
    formatDate,
    MonthPicker,
    styles as sharedStyles,
    SortOption,
    type TimeUnit, // Import sharedStyles
    UnitDropdown,
    useFoodHistory,
    WeekInput,
} from "@/utils/food-history-utils";

// Platform-specific module imports for gesture handling
let GestureHandlerModule: any; // Renamed to avoid conflict
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

// Conditional ReactDOM import for web portals
let ReactDOM: any;
if (Platform.OS === 'web') {
    try {
        ReactDOM = require('react-dom');
    } catch (e) {
        console.warn('ReactDOM is not available. Web modal portal might not work.');
    }
}

interface FoodHistoryDateViewProps {
    sortOption: SortOption
    onSortChange: (sortOption: SortOption) => void
    onDataChange: (totalCalories: number) => void
    onRegisterRefreshTrigger?: (triggerFn: () => void) => void
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
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        flexDirection: 'row',
        zIndex: 10,
        gap: 15,
    },
    iconButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    imageGestureContainer: {
        flex: 1,
        width: "100%",
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImageNative: {
        borderRadius: 8,
        width: 300,
        height: 300,
    },
})

// New ImageModal (inspired by index.tsx and food-history-utils.tsx)
// This is the same modal as in food-history-all.tsx
const ImageModal: React.FC<{
    visible: boolean
    imageUri: string
    onClose: () => void
}> = ({ visible, imageUri, onClose }) => {
    // Animated values for zoom only (remove pan completely)
    const scale = useRef(new Animated.Value(1)).current;
    const lastScale = useRef(1);

    useEffect(() => {
        if (visible) {
            // Reset to initial state when modal becomes visible
            scale.setValue(1);
            lastScale.current = 1;
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
    }, [visible, onClose, scale]);

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

    // Native part with Gesture Handler (only pinch, no pan)
    if (GestureHandlerModule) { // Use the renamed variable
        const { PinchGestureHandler, State, GestureHandlerRootView } = GestureHandlerModule; // Destructure here

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

        const onDoubleTap = () => {
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
            lastScale.current = 1;
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
                            <PinchGestureHandler
                                onGestureEvent={onPinchEvent}
                                onHandlerStateChange={onPinchStateChange}
                            >
                                <Animated.View style={{ transform: [{ scale }] }}>
                                    <TouchableOpacity onPress={onDoubleTap} activeOpacity={1}>
                                        <Image
                                            source={{ uri: imageUri }}
                                            style={modalStyles.fullImageNative}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>
                                </Animated.View>
                            </PinchGestureHandler>
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

/**
 * Enhanced Component to display food history filtered by date
 * Now includes loading animations and smooth transitions
 */
export const FoodHistoryDateView: React.FC<FoodHistoryDateViewProps> = ({
    sortOption,
    onSortChange,
    onDataChange,
    onRegisterRefreshTrigger,
}) => {
    const {
        foodItems,
        isLoading,
        isRefreshing,
        error,
        fetchFoodHistory,
        handleDeleteItem,
        saveEditedItem,
        handleSortChange,
        isSortChanging,
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
    const [listFadeAnim] = useState(new Animated.Value(1))
    const [listSlideAnim] = useState(new Animated.Value(0))
    const [isDataChanging, setIsDataChanging] = useState(false)

    // Time unit state
    const [timeUnit, setTimeUnit] = useState<TimeUnit>("day")

    // Get today's date in YYYY-MM-DD format
    const today = new Date()
    const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    // State for selected date (day unit)
    const [selectedDate, setSelectedDate] = useState(formattedToday)

    // State for weeks ago (week unit)
    const [weeksAgo, setWeeksAgo] = useState(0)

    // State for selected month (month unit)
    const [selectedMonth, setSelectedMonth] = useState(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
    )

    // Track if component has been initialized to prevent double API calls
    const [isInitialized, setIsInitialized] = useState(false)

    // Function to get time period label
    const getTimePeriodLabel = () => {
        switch (timeUnit) {
            case "day":
                const [y1, m1, d1] = selectedDate.split("-")
                return `Food History for ${d1}-${m1}-${y1}`
            case "week":
                return `Food History for ${weeksAgo} weeks ago`
            case "month":
                const [y2, m2] = selectedMonth.split("-")
                return `Food History for ${m2}-${y2}`
            default:
                return "Food History"
        }
    }

    // Enhanced fetch data with animations
    const fetchData = useCallback(
        async (refresh = false, sortOpt?: SortOption, showAnimation = true) => {
            if (showAnimation && !refresh) {
                setIsDataChanging(true)

                // Animate list out
                Animated.parallel([
                    Animated.timing(listFadeAnim, {
                        toValue: 0.3,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(listSlideAnim, {
                        toValue: -20,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start()
            }

            try {
                await fetchFoodHistory(1, refresh, sortOpt, timeUnit, selectedDate, weeksAgo, selectedMonth)

                if (showAnimation && !refresh) {
                    // Animate list back in
                    setTimeout(() => {
                        Animated.parallel([
                            Animated.timing(listFadeAnim, {
                                toValue: 1,
                                duration: 300,
                                useNativeDriver: true,
                                easing: Easing.out(Easing.ease),
                            }),
                            Animated.timing(listSlideAnim, {
                                toValue: 0,
                                duration: 300,
                                useNativeDriver: true,
                                easing: Easing.out(Easing.ease),
                            }),
                        ]).start(() => {
                            setIsDataChanging(false)
                        })
                    }, 100)
                }
            } catch (error) {
                setIsDataChanging(false)
                // Reset animations on error
                listFadeAnim.setValue(1)
                listSlideAnim.setValue(0)
            }
        },
        [fetchFoodHistory, timeUnit, selectedDate, weeksAgo, selectedMonth, listFadeAnim, listSlideAnim],
    )

    // Initial data load - only run once on mount
    useEffect(() => {
        if (!isInitialized) {
            fetchData(false, undefined, false)
            setIsInitialized(true)
        }
    }, [fetchData, isInitialized])

    // FIXED: Register refresh trigger function
    useEffect(() => {
        const refreshTrigger = () => {
            fetchData(true, undefined, false)
        }

        if (onRegisterRefreshTrigger) {
            onRegisterRefreshTrigger(refreshTrigger)
        }
    }, [onRegisterRefreshTrigger, fetchData])

    // Fetch data when time unit or related parameters change (but not on initial mount)
    useEffect(() => {
        if (isInitialized) {
            fetchData(false, undefined, true)
        }
    }, [timeUnit, selectedDate, weeksAgo, selectedMonth])

    // Handle sort option change with enhanced animations
    useEffect(() => {
        if (isInitialized && sortOption) {
            handleSortChange(sortOption, (sortOpt) => {
                // Scroll to top immediately and hide scroll button
                if (flatListRef.current) {
                    scrollToTopUtil(flatListRef as React.RefObject<FlatList<any>>)
                }
                setShowScrollToTop(false) // Hide scroll to top button
                fetchData(true, sortOpt, true)
            })
        }
    }, [sortOption, scrollToTopUtil])

    // Handle time unit change with animation
    const handleTimeUnitChange = useCallback((unit: TimeUnit) => {
        setTimeUnit(unit)
    }, [])

    // Handle date change with animation
    const handleDateChange = useCallback((date: string) => {
        setSelectedDate(date)
    }, [])

    // Handle week change with animation
    const handleWeekChange = useCallback((weeks: number) => {
        setWeeksAgo(weeks)
    }, [])

    // Handle month change with animation
    const handleMonthChange = useCallback((month: string) => {
        setSelectedMonth(month)
    }, [])

    // Enhanced refresh with better feedback
    const handleRefresh = useCallback(() => {
        if (!isRefreshing) {
            fetchData(true, undefined, false)
        }
    }, [fetchData, isRefreshing])

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
                // Hide scroll-to-top button after edit and refresh data like all view
                setShowScrollToTop(false)
                // Call API refresh like in all view
                fetchData(true, undefined, false)
            }
        },
        [editingItem, saveEditedItem, fetchData],
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

    // Handle delete with confirmation
    const handleDeleteWithConfirmation = useCallback(async (item: FoodItem) => {
        if (Platform.OS === "web") {
            const confirmed = window.confirm(`Are you sure you want to delete "${item.predictName}"?`);
            if (confirmed) {
                await handleDeleteItem(item.id);
                // Hide scroll-to-top button after delete and refresh data
                setShowScrollToTop(false);
                // Call API refresh
                fetchData(true, undefined, false);
            }
        } else {
            Alert.alert(
                "Delete Food Item",
                `Are you sure you want to delete "${item.predictName}"?`,
                [
                    {
                        text: "Cancel",
                        style: "cancel",
                    },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                            await handleDeleteItem(item.id);
                            // Hide scroll-to-top button after delete and refresh data
                            setShowScrollToTop(false);
                            // Call API refresh
                            fetchData(true, undefined, false);
                        },
                    },
                ],
            );
        }
    }, [handleDeleteItem, fetchData]);

    // Enhanced compact time unit selector with loading states
    const renderCompactTimeSelector = () => {
        return (
            <View style={[compactStyles.compactContainer, isDataChanging && compactStyles.compactContainerLoading]}>
                <View style={compactStyles.compactRow}>
                    <View style={compactStyles.unitSectionCompact}>
                        <Text style={compactStyles.compactLabel}>Unit:</Text>
                        <View style={[compactStyles.compactDropdownWrapper, compactStyles.dropdownContainer]}>
                            <UnitDropdown value={timeUnit} onChange={handleTimeUnitChange} />
                        </View>
                    </View>

                    <View style={compactStyles.inputSection}>
                        {timeUnit === "day" && (
                            <DatePicker selectedDate={selectedDate} onDateChange={handleDateChange} />
                        )}
                        {timeUnit === "week" && (
                            <WeekInput weeksAgo={weeksAgo} onWeekChange={handleWeekChange} />
                        )}
                        {timeUnit === "month" && (
                            <MonthPicker selectedMonth={selectedMonth} onMonthChange={handleMonthChange} />
                        )}
                    </View>
                </View>
            </View>
        )
    }

    // Enhanced render function with animations
    const renderFoodItem = useCallback(
        ({ item, index }: { item: FoodItem; index: number }) => {
            const formattedDate = formatDate(item.createdAt)
            const isDeleting = item.isDeleting || false

            return (
                <Animated.View
                    style={{
                        opacity: listFadeAnim,
                        transform: [
                            { translateY: listSlideAnim },
                            {
                                translateY: listSlideAnim.interpolate({
                                    inputRange: [-20, 0],
                                    outputRange: [-20 + index * 2, index * 2],
                                    extrapolate: "clamp",
                                }),
                            },
                        ],
                    }}
                >
                    <View style={[sharedStyles.foodCard, isDeleting && { opacity: 0.9 }]}>
                        {/* Delete Loading Overlay */}
                        {isDeleting && <DeleteLoadingOverlay />}

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
                                    onPress={() => handleDeleteWithConfirmation(item)}
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
                </Animated.View>
            )
        },
        [openImageModal, handleDeleteItem, startEditing, listFadeAnim, listSlideAnim, fetchData, handleDeleteWithConfirmation],
    )

    // Enhanced empty state with animation
    const renderEmpty = useCallback(() => {
        if (isLoading) return null

        return (
            <Animated.View
                style={[
                    sharedStyles.emptyContainer,
                    {
                        opacity: listFadeAnim,
                        transform: [{ translateY: listSlideAnim }],
                    },
                ]}
            >
                <Text style={sharedStyles.emptyText}>No food history found for this {timeUnit}</Text>
                <TouchableOpacity style={sharedStyles.retryButton} onPress={() => fetchData(false, undefined, true)}>
                    <Text style={sharedStyles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </Animated.View>
        )
    }, [isLoading, fetchData, timeUnit, listFadeAnim, listSlideAnim])

    // Main render with enhanced loading states
    if (isLoading && !isInitialized) {
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
                <TouchableOpacity style={sharedStyles.retryButton} onPress={() => fetchData()}>
                    <Text style={sharedStyles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        )
    }

    // Create header component for FlatList
    const ListHeaderComponent = () => (
        <View>
            {renderCompactTimeSelector()}
            <View style={sharedStyles.periodHeaderContainer}>
                <Text style={sharedStyles.periodHeaderText}>{getTimePeriodLabel()}</Text>
            </View>
        </View>
    )

    return (
        <View style={sharedStyles.container}>
            <FlatList
                ref={flatListRef}
                data={foodItems}
                renderItem={renderFoodItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={sharedStyles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmpty}
                ListHeaderComponent={ListHeaderComponent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={["#3498db"]}
                        tintColor="#3498db"
                        title="Pull to refresh"
                        titleColor="#666"
                    />
                }
            />

            {showScrollToTop && (
                <Animated.View
                    style={[
                        sharedStyles.scrollToTopButton,
                        {
                            opacity: listFadeAnim,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}
                        onPress={scrollToTop}
                        activeOpacity={0.8}
                    >
                        {Platform.OS === "web" ? (
                            <div style={{ color: "#fff", fontSize: "20px" }}>↑</div>
                        ) : (
                            <Ionicons name="chevron-up" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Loading overlay for data changes */}
            {(isDataChanging || isSortChanging) && <EnhancedLoadingOverlay />}

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
        </View>
    )
}

const compactStyles = StyleSheet.create({
    compactContainer: {
        backgroundColor: "#f8f9fa",
        marginBottom: 10,
    },
    compactContainerLoading: {
        backgroundColor: "#f0f8ff",
    },
    compactRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    unitSectionCompact: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        maxWidth: "40%",
    },
    inputSection: {
        flex: 2,
        alignItems: "flex-end",
        maxWidth: "60%",
    },
    compactLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#495057",
        marginRight: 6,
    },
    compactDropdownWrapper: {
        minWidth: 70,
        maxWidth: 85,
    },
    dropdownContainer: {
        position: "relative",
    },
})
