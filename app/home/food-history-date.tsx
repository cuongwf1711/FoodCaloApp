"use client"

import type React from "react"

import { useCallback, useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    Animated,
    Easing,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

// Import shared utilities
import {
    DatePicker,
    EditModal,
    type FoodItem,
    MonthPicker,
    type SortOption,
    type TimeUnit,
    UnitDropdown,
    WeekInput,
    renderSharedFoodItem,
    styles as sharedStyles,
    useFoodHistory,
} from "@/utils/food-history-utils"

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

interface FoodHistoryDateViewProps {
    sortOption: SortOption
    onSortChange: (sortOption: SortOption) => void
    onDataChange: (totalCalories: number) => void
}

// Enhanced ImageModal with loading animation
const ImageModal: React.FC<{
    visible: boolean
    imageUri: string
    onClose: () => void
}> = ({ visible, imageUri, onClose }) => {
    const [imageLoading, setImageLoading] = useState(true)

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
                    zIndex: 10000,
                    animation: "fadeInUp 0.3s ease-out",
                }}
                onClick={onClose}
            >
                <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }} onClick={(e) => e.stopPropagation()}>
                    {imageLoading && (
                        <div
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                zIndex: 1,
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
                                }}
                            />
                        </div>
                    )}
                    <img
                        src={imageUri || "/placeholder.svg"}
                        alt="Full size"
                        style={{
                            maxWidth: "100%",
                            maxHeight: "90vh",
                            borderRadius: "8px",
                            objectFit: "contain",
                            opacity: imageLoading ? 0.3 : 1,
                            transition: "opacity 0.3s ease",
                        }}
                        onLoad={() => setImageLoading(false)}
                        onError={() => setImageLoading(false)}
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
                            transition: "transform 0.2s ease",
                        }}
                        onMouseEnter={(e) => ((e.target as HTMLElement).style.transform = "scale(1.1)")}
                        onMouseLeave={(e) => ((e.target as HTMLElement).style.transform = "scale(1)")}
                    >
                        ✕
                    </button>
                </div>
            </div>
        )
    }

    return (
        <Animated.View style={modalStyles.overlay}>
            <TouchableOpacity style={modalStyles.backdrop} onPress={onClose} activeOpacity={1} />
            <View style={modalStyles.container}>
                <View style={modalStyles.imageContainer}>
                    {imageLoading && (
                        <View style={modalStyles.imageLoader}>
                            <ActivityIndicator size="large" color="#3498db" />
                        </View>
                    )}
                    <Image
                        source={{ uri: imageUri }}
                        style={[modalStyles.image, { opacity: imageLoading ? 0.3 : 1 }]}
                        resizeMode="contain"
                        onLoad={() => setImageLoading(false)}
                        onError={() => setImageLoading(false)}
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
        </Animated.View>
    )
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

/**
 * Enhanced Component to display food history filtered by date
 * Now includes loading animations and smooth transitions
 */
const FoodHistoryDateView: React.FC<FoodHistoryDateViewProps> = ({ sortOption, onSortChange, onDataChange }) => {
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
                return `Food History for ${selectedDate}`
            case "week":
                return `Food History for ${weeksAgo} weeks ago`
            case "month":
                return `Food History for ${selectedMonth}`
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
                // Scroll to top immediately
                if (flatListRef.current) {
                    flatListRef.current.scrollToOffset({ offset: 0, animated: true })
                }
                fetchData(true, sortOpt, true)
            })
        }
    }, [sortOption])

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

    // Enhanced compact time unit selector with loading states
    const renderCompactTimeSelector = () => {
        return (
            <View style={[compactStyles.compactContainer, isDataChanging && compactStyles.compactContainerLoading]}>
                <View style={compactStyles.compactRow}>
                    <View style={compactStyles.unitSection}>
                        <Text style={compactStyles.compactLabel}>Unit:</Text>
                        <View style={[compactStyles.compactDropdownWrapper, compactStyles.dropdownContainer]}>
                            <UnitDropdown value={timeUnit} onChange={handleTimeUnitChange} />
                        </View>
                    </View>

                    <View style={compactStyles.inputSection}>
                        {timeUnit === "day" && (
                            <View style={compactStyles.inputRow}>
                                <Text style={compactStyles.compactLabel}>Date:</Text>
                                <DatePicker selectedDate={selectedDate} onDateChange={handleDateChange} />
                            </View>
                        )}
                        {timeUnit === "week" && (
                            <View style={compactStyles.inputRow}>
                                <Text style={compactStyles.compactLabel}>Weeks Ago:</Text>
                                <WeekInput weeksAgo={weeksAgo} onWeekChange={handleWeekChange} />
                            </View>
                        )}
                        {timeUnit === "month" && (
                            <View style={compactStyles.inputRow}>
                                <Text style={compactStyles.compactLabel}>Month:</Text>
                                <MonthPicker selectedMonth={selectedMonth} onMonthChange={handleMonthChange} />
                            </View>
                        )}
                    </View>
                </View>

                {isDataChanging && (
                    <View style={compactStyles.loadingIndicator}>
                        <ActivityIndicator size="small" color="#3498db" />
                        <Text style={compactStyles.loadingText}>Loading...</Text>
                    </View>
                )}
            </View>
        )
    }

    // Enhanced render function with animations
    const renderFoodItem = useCallback(
        ({ item, index }: { item: FoodItem; index: number }) => {
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
                    {renderSharedFoodItem(item, openImageModal, handleDeleteItem, startEditing)}
                </Animated.View>
            )
        },
        [openImageModal, handleDeleteItem, startEditing, listFadeAnim, listSlideAnim],
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
                {renderCompactTimeSelector()}
                <EnhancedLoadingOverlay message="Loading food history..." />
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

    return (
        <View style={sharedStyles.container}>
            {renderCompactTimeSelector()}

            <Animated.View
                style={[
                    sharedStyles.periodHeaderContainer,
                    {
                        opacity: listFadeAnim,
                        transform: [{ translateY: listSlideAnim }],
                    },
                ]}
            >
                <Text style={sharedStyles.periodHeaderText}>{getTimePeriodLabel()}</Text>
            </Animated.View>

            <Animated.View
                style={[
                    { flex: 1 },
                    {
                        opacity: listFadeAnim,
                        transform: [{ translateY: listSlideAnim }],
                    },
                ]}
            >
                <FlatList
                    ref={flatListRef}
                    data={foodItems}
                    renderItem={renderFoodItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={sharedStyles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmpty}
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
            </Animated.View>

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
                            <Text style={sharedStyles.scrollToTopButtonText}>↑</Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Loading overlay for data changes */}
            {(isDataChanging || isSortChanging) && <EnhancedLoadingOverlay message="Loading data..." />}

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

const modalStyles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        zIndex: 10000,
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
        position: "relative",
    },
    image: {
        width: 350,
        height: 350,
        maxWidth: "100%",
        maxHeight: "100%",
    },
    imageLoader: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -20 }, { translateY: -20 }],
        zIndex: 1,
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
        zIndex: 10001,
    },
    closeButtonText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
})

const compactStyles = StyleSheet.create({
    compactContainer: {
        backgroundColor: "#f8f9fa",
        borderBottomWidth: 1,
        borderBottomColor: "#e9ecef",
        paddingVertical: 12,
        paddingHorizontal: 16,
        overflow: "hidden",
        zIndex: 999,
        position: "relative",
    },
    compactContainerLoading: {
        backgroundColor: "#f0f8ff",
    },
    compactRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    unitSection: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 16,
    },
    inputSection: {
        flex: 2,
        alignItems: "flex-end",
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    compactLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#495057",
        marginRight: 8,
    },
    compactDropdownWrapper: {
        minWidth: 80,
        maxWidth: 100,
        overflow: "hidden",
    },
    dropdownContainer: {
        position: "relative",
        zIndex: 1001,
        overflow: "hidden",
    },
    loadingIndicator: {
        position: "absolute",
        top: 8,
        right: 16,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(52, 152, 219, 0.1)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    loadingText: {
        fontSize: 12,
        color: "#3498db",
        marginLeft: 6,
        fontWeight: "500",
    },
})

export default FoodHistoryDateView
