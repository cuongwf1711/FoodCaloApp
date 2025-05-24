"use client"

import type React from "react"

import { useCallback, useEffect, useRef, useState } from "react"
import { FlatList, Image, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native"

// Import shared utilities
import {
    DatePicker,
    EditModal,
    type FoodItem,
    LoadingOverlay,
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
  `
    document.head.appendChild(style)
}

interface FoodHistoryDateViewProps {
    sortOption: SortOption
    onSortChange: (sortOption: SortOption) => void
    onDataChange: (totalCalories: number) => void
}

// Enhanced ImageModal matching all view implementation
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
                    zIndex: 10000,
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

    return (
        <View style={modalStyles.overlay}>
            <TouchableOpacity style={modalStyles.backdrop} onPress={onClose} activeOpacity={1} />
            <View style={modalStyles.container}>
                <View style={modalStyles.imageContainer}>
                    <Image
                        source={{ uri: imageUri }}
                        style={modalStyles.image}
                        resizeMode="contain"
                        onError={(error) => {
                            console.log("Image load error:", error)
                        }}
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
 * Component to display food history filtered by date
 * Supports day, week, and month filtering
 */
const FoodHistoryDateView: React.FC<FoodHistoryDateViewProps> = ({ sortOption, onSortChange, onDataChange }) => {
    const {
        foodItems,
        isLoading,
        isRefreshing,
        error,
        totalCalories,
        fetchFoodHistory,
        handleDeleteItem,
        saveEditedItem,
        handleSortChange,
    } = useFoodHistory("newest", sortOption, onDataChange)

    // UI state management
    const [modalVisible, setModalVisible] = useState(false)
    const [modalImageUri, setModalImageUri] = useState("")
    const [editingItem, setEditingItem] = useState<FoodItem | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [showScrollToTop, setShowScrollToTop] = useState(false)
    const flatListRef = useRef<FlatList>(null)

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

    // Fetch data based on time unit
    const fetchData = useCallback(
        (refresh = false, sortOpt?: SortOption) => {
            fetchFoodHistory(1, refresh, sortOpt, timeUnit, selectedDate, weeksAgo, selectedMonth)
        },
        [fetchFoodHistory, timeUnit, selectedDate, weeksAgo, selectedMonth],
    )

    // Initial data load - only run once on mount
    useEffect(() => {
        if (!isInitialized) {
            fetchData(false)
            setIsInitialized(true)
        }
    }, [fetchData, isInitialized])

    // Fetch data when time unit or related parameters change (but not on initial mount)
    useEffect(() => {
        if (isInitialized) {
            fetchData(false)
        }
    }, [timeUnit, selectedDate, weeksAgo, selectedMonth])

    // Handle sort option change - only when sortOption actually changes
    useEffect(() => {
        if (isInitialized && sortOption) {
            handleSortChange(sortOption, (sortOpt) => {
                // Scroll to top immediately
                if (flatListRef.current) {
                    flatListRef.current.scrollToOffset({ offset: 0, animated: true })
                }
                fetchData(true, sortOpt)
            })
        }
    }, [sortOption])

    // Handle time unit change
    const handleTimeUnitChange = useCallback((unit: TimeUnit) => {
        setTimeUnit(unit)
    }, [])

    // Handle date change (for day unit)
    const handleDateChange = useCallback((date: string) => {
        setSelectedDate(date)
    }, [])

    // Handle week change (for week unit)
    const handleWeekChange = useCallback((weeks: number) => {
        setWeeksAgo(weeks)
    }, [])

    // Handle month change (for month unit)
    const handleMonthChange = useCallback((month: string) => {
        setSelectedMonth(month)
    }, [])

    // Handle refresh (pull to refresh)
    const handleRefresh = useCallback(() => {
        if (!isRefreshing) {
            fetchData(true)
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
        setShowScrollToTop(scrollY > 300) // Show button when scrolled down 300px
    }, [])

    // Scroll to top function
    const scrollToTop = useCallback(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
    }, [])

    // Fixed compact time unit selector with better layout and z-index
    const renderCompactTimeSelector = () => {
        return (
            <View style={[compactStyles.compactContainer]}>
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
            </View>
        )
    }

    // Use SHARED render function - EXACTLY THE SAME AS ALL VIEW
    const renderFoodItem = useCallback(
        ({ item }: { item: FoodItem }) => {
            return renderSharedFoodItem(item, openImageModal, handleDeleteItem, startEditing)
        },
        [openImageModal, handleDeleteItem, startEditing],
    )

    // Render empty state
    const renderEmpty = useCallback(() => {
        if (isLoading) return null

        return (
            <View style={sharedStyles.emptyContainer}>
                <Text style={sharedStyles.emptyText}>No food history found for this {timeUnit}</Text>
                <TouchableOpacity style={sharedStyles.retryButton} onPress={() => fetchData()}>
                    <Text style={sharedStyles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        )
    }, [isLoading, fetchData, timeUnit])

    // Main render
    if (isLoading && !isInitialized) {
        return (
            <View style={sharedStyles.container}>
                {renderCompactTimeSelector()}
                <LoadingOverlay />
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

            <View style={sharedStyles.periodHeaderContainer}>
                <Text style={sharedStyles.periodHeaderText}>{getTimePeriodLabel()}</Text>
            </View>

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
                    />
                }
            />

            {showScrollToTop && (
                <TouchableOpacity style={sharedStyles.scrollToTopButton} onPress={scrollToTop} activeOpacity={0.8}>
                    {Platform.OS === "web" ? (
                        <div style={{ color: "#fff", fontSize: "20px" }}>↑</div>
                    ) : (
                        <Text style={sharedStyles.scrollToTopButtonText}>↑</Text>
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
})

export default FoodHistoryDateView