"use client"

import type React from "react"

import { useCallback, useEffect, useRef, useState } from "react"
import { FlatList, Image, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native"

// Import shared utilities
import {
    DatePicker,
    EditModal,
    type FoodItem,
    ImageModal,
    LoadingOverlay,
    MonthPicker,
    type SortOption,
    type TimeUnit,
    UnitDropdown,
    WeekInput,
    formatDate,
    styles as sharedStyles,
    useFoodHistory,
} from "@/utils/food-history-utils"

interface FoodHistoryDateViewProps {
    sortOption: SortOption
    onSortChange: (sortOption: SortOption) => void
    onDataChange: (totalCalories: number) => void
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

    // Get today's date in YYYY-MM-DD format in UTC
    const today = new Date()
    const formattedToday = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(
        2,
        "0",
    )}-${String(today.getUTCDate()).padStart(2, "0")}`

    // State for selected date (day unit)
    const [selectedDate, setSelectedDate] = useState(formattedToday)

    // State for weeks ago (week unit)
    const [weeksAgo, setWeeksAgo] = useState(0)

    // State for selected month (month unit)
    const [selectedMonth, setSelectedMonth] = useState(
        `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`,
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
        try {
            // Validate the date
            const dateObj = new Date(date)
            if (isNaN(dateObj.getTime())) {
                // If invalid date, use today's date
                const today = new Date()
                const utcToday = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(
                    2,
                    "0",
                )}-${String(today.getUTCDate()).padStart(2, "0")}`
                setSelectedDate(utcToday)
            } else {
                setSelectedDate(date)
            }
        } catch (error) {
            // If any error occurs, default to today's date
            const today = new Date()
            const utcToday = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(
                2,
                "0",
            )}-${String(today.getUTCDate()).padStart(2, "0")}`
            setSelectedDate(utcToday)
        }
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

    // Compact time unit selector with inputs in a single row
    const renderCompactTimeSelector = () => {
        return (
            <View style={compactStyles.compactRow}>
                <View style={compactStyles.compactSection}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={compactStyles.compactLabel}>Unit:</Text>
                        <View style={compactStyles.compactDropdownWrapper}>
                            <UnitDropdown value={timeUnit} onChange={handleTimeUnitChange} />
                        </View>
                    </View>
                </View>

                <View style={{ flex: 2 }}>
                    {timeUnit === "day" && (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Text style={compactStyles.compactLabel}>Date:</Text>
                            <DatePicker selectedDate={selectedDate} onDateChange={handleDateChange} />
                        </View>
                    )}
                    {timeUnit === "week" && (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Text style={compactStyles.compactLabel}>Weeks Ago:</Text>
                            <WeekInput weeksAgo={weeksAgo} onWeekChange={handleWeekChange} />
                        </View>
                    )}
                    {timeUnit === "month" && (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Text style={compactStyles.compactLabel}>Month:</Text>
                            <MonthPicker selectedMonth={selectedMonth} onMonthChange={handleMonthChange} />
                        </View>
                    )}
                </View>
            </View>
        )
    }

    // Render a food item
    const renderFoodItem = useCallback(
        ({ item }: { item: FoodItem }) => {
            const formattedDate = formatDate(item.createdAt)

            return (
                <View style={sharedStyles.foodCard}>
                    <View style={sharedStyles.foodCardHeader}>
                        <Text style={sharedStyles.foodName}>{item.predictName}</Text>
                        <View style={sharedStyles.actionButtons}>
                            <TouchableOpacity style={sharedStyles.editButton} onPress={() => startEditing(item)}>
                                {Platform.OS === "web" ? (
                                    <div style={{ color: "#3498db", cursor: "pointer", fontSize: "18px" }}>✎</div>
                                ) : (
                                    <Text style={sharedStyles.editButtonText}>✎</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity style={sharedStyles.deleteButton} onPress={() => handleDeleteItem(item.id)}>
                                {Platform.OS === "web" ? (
                                    <div style={{ color: "#e74c3c", cursor: "pointer", fontSize: "18px" }}>🗑</div>
                                ) : (
                                    <Text style={sharedStyles.deleteButtonText}>🗑</Text>
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

const compactStyles = StyleSheet.create({
    compactRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    compactSection: {
        flex: 1,
        marginRight: 5,
    },
    compactLabel: {
        fontSize: 16,
        fontWeight: "bold",
        marginRight: 5,
    },
    compactDropdownWrapper: {
        flex: 1,
    },
})

export default FoodHistoryDateView
