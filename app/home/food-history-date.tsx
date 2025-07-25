"use client"

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    View
} from "react-native";

// Added imports from food-history-utils
import ImageModal from "@/components/ImageModal";
import { DeleteLoadingOverlay, EnhancedLoadingOverlay } from "@/components/LoadingOverlays";
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
import { formatDecimalDisplay } from "@/utils/number-utils";

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

/**
 * Enhanced Component to display food history filtered by date
 * Now includes loading animations and smooth transitions
 */
const FoodHistoryDateView: React.FC<FoodHistoryDateViewProps> = ({
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
        isLoadingMore,
        hasMore,
        page, // This 'page' is from useFoodHistory, representing the current page number.
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
    const getTimePeriodLabel = useCallback(() => {
        switch (timeUnit) {
            case "day":
                if (!selectedDate) return "Food History";
                const [y1, m1, d1] = selectedDate.split("-")
                return `Food History for ${d1}-${m1}-${y1}`
            case "week":
                return `Food History for ${weeksAgo} weeks ago`
            case "month":
                if (!selectedDate) return "Food History";
                const [y2, m2] = selectedMonth.split("-")
                return `Food History for ${m2}-${y2}`
            default:
                return "Food History"
        }
    }, [timeUnit, selectedDate, weeksAgo, selectedMonth])

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
            // Ensure only page 1 is fetched on initial load
            // Pass refresh: true for initial load to set up pagination correctly.
            fetchFoodHistory(1, true, undefined, timeUnit, selectedDate, weeksAgo, selectedMonth);
            setIsInitialized(true);
        }
        // Dependencies are correct for an initial load effect.
    }, [fetchFoodHistory, isInitialized, timeUnit, selectedDate, weeksAgo, selectedMonth])

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
            // Pass true for refresh to ensure pagination is reset in useFoodHistory
            // when filter parameters change.
            fetchData(true, undefined, true)
        }
    }, [timeUnit, selectedDate, weeksAgo, selectedMonth, fetchData, isInitialized]);

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
        setTimeUnit(unit);
        // The fetchFoodHistory call is removed from here.
        // The useEffect that depends on [timeUnit, selectedDate, weeksAgo, selectedMonth]
        // will now be solely responsible for fetching data when these change.

        // Reset weeks to 0 when switching to week unit
        if (unit === "week") {
            setWeeksAgo(0);
        }
    }, []) // setTimeUnit and setWeeksAgo are stable, so dependencies can be empty.

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
            // Reset page to 1 and ensure only page 1 is fetched
            fetchFoodHistory(1, true, sortOption, timeUnit, selectedDate, weeksAgo, selectedMonth)
        }
    }, [fetchFoodHistory, isRefreshing, sortOption, timeUnit, selectedDate, weeksAgo, selectedMonth])

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

    // Handle delete with confirmation - simplified to use hook's confirmation
    const handleDeleteWithConfirmation = useCallback(async (item: FoodItem) => {
        await handleDeleteItem(item.id);
    }, [handleDeleteItem]); 

    // Handle load more function for pagination
    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && hasMore && !isRefreshing) {
            // Fetch next page only when not refreshing
            fetchFoodHistory(page + 1, false, sortOption, timeUnit, selectedDate, weeksAgo, selectedMonth)
        }
    }, [isLoadingMore, hasMore, isRefreshing, fetchFoodHistory, page, sortOption, timeUnit, selectedDate, weeksAgo, selectedMonth])

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

    // Define props for FoodItemCard
    interface FoodItemCardProps {
        item: FoodItem;
        index: number;
        listFadeAnim: Animated.Value;
        listSlideAnim: Animated.Value;
        onOpenImage: (uri: string) => void;
        onStartEdit: (item: FoodItem) => void;
        onDeleteItemConfirmation: (item: FoodItem) => void;
    }

    // Custom comparison function for FoodItemCard
    const areFoodItemCardsEqual = (
        prevProps: Readonly<FoodItemCardProps>,
        nextProps: Readonly<FoodItemCardProps>,
    ): boolean => {
        // If item IDs are different, they are different items, so re-render.
        if (prevProps.item.id !== nextProps.item.id) {
            return false;
        }

        if (
            prevProps.onOpenImage !== nextProps.onOpenImage ||
            prevProps.onStartEdit !== nextProps.onStartEdit ||
            prevProps.onDeleteItemConfirmation !== nextProps.onDeleteItemConfirmation
        ) {
            // console.warn("Callback changed reference, re-rendering FoodItemCard"); // For debugging
            return false;
        }

        const pItem = prevProps.item;
        const nItem = nextProps.item;

        // Compare all relevant item properties
        const contentIsSame =
            pItem.predictName === nItem.predictName &&
            pItem.calo === nItem.calo &&
            pItem.comment === nItem.comment &&
            pItem.createdAt === nItem.createdAt &&
            pItem.confidencePercentage === nItem.confidencePercentage &&
            pItem.isDeleting === nItem.isDeleting &&
            pItem.imagesReady === nItem.imagesReady && // Added imagesReady comparison
            pItem.publicUrl.originImage === nItem.publicUrl.originImage &&
            pItem.publicUrl.segmentationImage === nItem.publicUrl.segmentationImage;

        return contentIsSame;
    };

const FoodItemCard: React.FC<FoodItemCardProps> = React.memo(
    ({
        item,
        index,
        listFadeAnim,
        listSlideAnim,
        onOpenImage,
        onStartEdit,
        onDeleteItemConfirmation,
    }) => {
        const formattedDate = useMemo(() => formatDate(item.createdAt), [item.createdAt]);
        const isDeleting = item.isDeleting || false

        // Callbacks specific to this item, using the passed-in handlers
        const handleOpenOriginImage = useCallback(() => {
            onOpenImage(item.publicUrl.originImage);
        }, [onOpenImage, item.publicUrl.originImage]);

        const handleOpenSegmentationImage = useCallback(() => {
            onOpenImage(item.publicUrl.segmentationImage);
        }, [onOpenImage, item.publicUrl.segmentationImage]);
        
        const handleEdit = useCallback(() => {
            onStartEdit(item);
        }, [onStartEdit, item]);

        const handleDelete = useCallback(() => {
            onDeleteItemConfirmation(item);
        }, [onDeleteItemConfirmation, item]);


        return (
            <Animated.View
                style={{
                    opacity: listFadeAnim,
                    transform: [
                        { translateY: listSlideAnim },
                    ],
                }}
            >
                <View style={[sharedStyles.foodCard, isDeleting && { opacity: 0.9 }]}>
                    {isDeleting && <DeleteLoadingOverlay />}

                    <View style={sharedStyles.foodCardHeader}>
                        <Text style={sharedStyles.foodName}>{item.predictName}</Text>
                        <View style={sharedStyles.actionButtons}>
                            <TouchableOpacity
                                style={sharedStyles.editButton}
                                onPress={handleEdit} // Use internal handler
                                disabled={isDeleting}
                            >
                                <Ionicons name="create-outline" size={18} color={isDeleting ? "#ccc" : "#3498db"} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[sharedStyles.deleteButton, isDeleting && { opacity: 0.5 }]}
                                onPress={handleDelete} // Use internal handler
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <Ionicons name="reload-outline" size={18} color="#e74c3c" />
                                ) : (
                                    <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={sharedStyles.foodCalories}>{formatDecimalDisplay(item.calo)} kcal</Text>                    
                    <View style={sharedStyles.imagesContainer}>
                        {!item.imagesReady ? (
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
                                    onPress={handleOpenOriginImage} // Use internal handler
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
                                    onPress={handleOpenSegmentationImage} // Use internal handler
                                    activeOpacity={0.9}
                                    disabled={isDeleting}
                                >
                                    <Image
                                        source={{ uri: item.publicUrl.segmentationImage }}
                                        style={sharedStyles.thumbnailImage}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            </>
                        )}                   
                    </View>

                    <View style={sharedStyles.dateConfidenceRow}>
                        <Text style={sharedStyles.foodDate}>{formattedDate}</Text>
                        <Text style={sharedStyles.confidenceText}>Confidence: {item.confidencePercentage}</Text>
                    </View>

                    <View style={sharedStyles.commentContainer}>
                        <Text style={sharedStyles.commentLabel}>Notes:</Text>
                        <Text style={sharedStyles.foodComment}>{item.comment ? item.comment : "No notes"}</Text>
                    </View>
                </View>
            </Animated.View>
        )
    },
    areFoodItemCardsEqual // Attach the custom comparison function here
)

    // Ensure renderItem is memoized and optimized
    const renderFoodItem = useCallback(
        ({ item, index }: { item: FoodItem; index: number }) => (
            <FoodItemCard
                item={item}
                index={index}
                listFadeAnim={listFadeAnim}
                listSlideAnim={listSlideAnim}
                onOpenImage={openImageModal}
                onStartEdit={startEditing}
                onDeleteItemConfirmation={handleDeleteWithConfirmation}
            />
        ),
        [listFadeAnim, listSlideAnim, openImageModal, startEditing, handleDeleteWithConfirmation]
    );

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
                <TouchableOpacity style={sharedStyles.retryButton} onPress={() => fetchData(true, undefined, true)}>
                    <Text style={sharedStyles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </Animated.View>
        )    }, [isLoading, fetchData, timeUnit, listFadeAnim, listSlideAnim])
    const uniqueFoodItems = useMemo(() => {
        const seenIds = new Set<string>();
        return foodItems.filter(item => {
            if (seenIds.has(item.id)) {
                // console.warn(`Duplicate item ID found and removed: ${item.id}`); // Optional: for debugging
                return false;
            }
            seenIds.add(item.id);
            return true;
        });
    }, [foodItems]);

    // Stable keyExtractor
    const keyExtractor = useCallback((item: FoodItem) => item.id, []);

    // Footer component for loading more data
    const renderFooter = useCallback(() => {
        if (!isLoadingMore) return null;

        return (
            <View style={sharedStyles.footerLoader}>
                <ActivityIndicator size="small" color="#0066CC" />
            </View>
        );
    }, [isLoadingMore]);

    // Render end of list message
    const renderEndOfList = useCallback(() => {
        // Use uniqueFoodItems.length to check if the list is empty
        if (isLoadingMore || hasMore || uniqueFoodItems.length === 0) return null;

        return (
            <View style={sharedStyles.endOfListContainer}>
                <Text style={sharedStyles.endOfListText}>No more items to load</Text>
            </View>
        );
    }, [isLoadingMore, hasMore, uniqueFoodItems.length]); // Add uniqueFoodItems.length

    // Stable ListFooterComponent renderer
    const listFooterComponentRenderer = useCallback(() => {
        return (
            <View> 
                {renderFooter()}
                {renderEndOfList()}
            </View>
        );
    }, [renderFooter, renderEndOfList]); // Removed uniqueFoodItems.length, not directly needed for this structure

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
    );
    return (
        <View style={sharedStyles.container}>
            <FlatList
                ref={flatListRef}
                data={uniqueFoodItems}
                renderItem={renderFoodItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={
                    sharedStyles.listContainer
                    // Removed paddingBottom: Math.ceil(uniqueFoodItems.length / 10) * 30 
                }
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmpty}
                ListHeaderComponent={ListHeaderComponent}
                ListFooterComponent={listFooterComponentRenderer} // Updated to use the combined renderer
                onScroll={handleScroll}
                scrollEventThrottle={16}                
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                initialNumToRender={8} 
                windowSize={10} // Reduced from 21 for better performance
                maxToRenderPerBatch={5} // Reduced from 10 for better performance
                updateCellsBatchingPeriod={100} // Adjusted for smoother updates
                removeClippedSubviews={Platform.OS === 'android'} // Only enable on Android
                legacyImplementation={false}
                disableVirtualization={false}
                getItemLayout={undefined}
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
                        <Ionicons name="chevron-up" size={20} color="#fff" />
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

// Change from named export to default export
export default FoodHistoryDateView;

// Also keep named export for backward compatibility
export { FoodHistoryDateView };

