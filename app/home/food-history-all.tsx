"use client"

import { Ionicons } from "@expo/vector-icons";
import React from "react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react"; // Added useMemo
import {
    ActivityIndicator,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    Text,
    TouchableOpacity,
    View
} from "react-native";

// Import shared utilities
import ImageModal from "@/components/ImageModal";
import { DeleteLoadingOverlay, EnhancedLoadingOverlay } from "@/components/LoadingOverlays";
import {
    EditModal,
    type FoodItem,
    type SortOption,
    formatDate,
    styles as sharedStyles,
    useFoodHistory,
} from "@/utils/food-history-utils";
import { formatDecimalDisplay } from "@/utils/number-utils";

interface FoodHistoryAllViewProps {
    sortOption: SortOption
    onSortChange: (sortOption: SortOption) => void
    onDataChange: (totalCalories: number) => void
    onRegisterRefreshTrigger?: (triggerFn: () => void) => void
    key?: string // Add key prop to interface
}

// Define props for the FoodHistoryItem component
interface FoodHistoryItemProps {
    item: FoodItem;
    onOpenImageModal: (uri: string) => void;
    onDeleteItemPress: (itemId: string) => Promise<void>;
    onStartEditing: (item: FoodItem) => void;
}

// Custom comparison function for FoodHistoryItem
const areFoodHistoryItemsEqual = (prevProps: Readonly<FoodHistoryItemProps>, nextProps: Readonly<FoodHistoryItemProps>): boolean => {
    if (prevProps.item === nextProps.item &&
        prevProps.onOpenImageModal === nextProps.onOpenImageModal &&
        prevProps.onDeleteItemPress === nextProps.onDeleteItemPress &&
        prevProps.onStartEditing === nextProps.onStartEditing) {
        return true;
    }

    if (
        prevProps.onOpenImageModal !== nextProps.onOpenImageModal ||
        prevProps.onDeleteItemPress !== nextProps.onDeleteItemPress ||
        prevProps.onStartEditing !== nextProps.onStartEditing
    ) {
        return false;
    }

    const pItem = prevProps.item;
    const nItem = nextProps.item;

    return pItem.id === nItem.id &&
        pItem.predictName === nItem.predictName &&
        pItem.calo === nItem.calo &&
        pItem.comment === nItem.comment &&
        pItem.createdAt === nItem.createdAt && // Direct comparison for string
        pItem.confidencePercentage === nItem.confidencePercentage &&
        pItem.isDeleting === nItem.isDeleting &&
        pItem.imagesReady === nItem.imagesReady && // Added imagesReady comparison
        pItem.publicUrl.originImage === nItem.publicUrl.originImage &&
        pItem.publicUrl.segmentationImage === nItem.publicUrl.segmentationImage;
};

// Memoized FoodHistoryItem component
const FoodHistoryItem: React.FC<FoodHistoryItemProps> = React.memo(({
    item,
    onOpenImageModal,
    onDeleteItemPress,
    onStartEditing
}) => {
    const formattedDate = useMemo(() => formatDate(item.createdAt), [item.createdAt]);
    const isDeleting = item.isDeleting || false;

    const handleStartEditing = useCallback(() => {
        onStartEditing(item);
    }, [onStartEditing, item]);

    const handleDeletePress = useCallback(async () => {
        // Ensure item.id is stable or use item directly if the whole item is needed for context
        await onDeleteItemPress(item.id);
    }, [onDeleteItemPress, item.id]); // Assuming item.id is sufficient and stable

    const handleOpenOriginImage = useCallback(() => {
        onOpenImageModal(item.publicUrl.originImage);
    }, [onOpenImageModal, item.publicUrl.originImage]);

    const handleOpenSegmentationImage = useCallback(() => {
        onOpenImageModal(item.publicUrl.segmentationImage);
    }, [onOpenImageModal, item.publicUrl.segmentationImage]);

    return (
        <View style={[sharedStyles.foodCard, isDeleting && { opacity: 0.9 }]}>
            {/* Delete Loading Overlay */}
            {isDeleting && <DeleteLoadingOverlay />}

            <View style={sharedStyles.foodCardHeader}>
                <Text style={sharedStyles.foodName}>{item.predictName}</Text>
                <View style={sharedStyles.actionButtons}>
                    <TouchableOpacity
                        style={sharedStyles.editButton}
                        onPress={handleStartEditing}
                        disabled={isDeleting}
                    >
                        <Ionicons name="create-outline" size={18} color={isDeleting ? "#ccc" : "#3498db"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[sharedStyles.deleteButton, isDeleting && { opacity: 0.5 }]}
                        onPress={handleDeletePress}
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
                {/* Conditional rendering based on imagesReady state */}
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
                            onPress={handleOpenOriginImage}
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
                            onPress={handleOpenSegmentationImage}
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
    );
}, areFoodHistoryItemsEqual);


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

    const isInitialMountRef = useRef(true)
    const lastFetchTimeRef = useRef(0)

    // Memoize unique food items to prevent duplicate keys in FlatList
    const uniqueFoodItems = useMemo(() => {
        const seenIds = new Set<string>();
        return foodItems.filter(item => {
            if (seenIds.has(item.id)) {
                return false;
            }
            seenIds.add(item.id);
            return true;
        });
    }, [foodItems]);

    // Initial data load - only run once on mount
    useEffect(() => {
        if (isInitialMountRef.current) {
            // Ensure only page 1 is fetched on initial load
            fetchFoodHistory(1, true);
            isInitialMountRef.current = false;
        }
    }, [fetchFoodHistory])

    // Add new useEffect to register refresh trigger:
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
            // Reset page to 1 and ensure only page 1 is fetched
            fetchFoodHistory(1, true)
        }
    }, [fetchFoodHistory, isRefreshing])

    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && hasMore && !isRefreshing) {
            // Fetch next page only when not refreshing
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
                // Refresh data after successful edit
                fetchFoodHistory(1, true)
            }
        },
        [editingItem, saveEditedItem, fetchFoodHistory],
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

    // Callback for deleting an item, to be passed to FoodHistoryItem
    const handleDeleteItemPress = useCallback(async (itemId: string) => {
        await handleDeleteItem(itemId); // handleDeleteItem from useFoodHistory
    }, [handleDeleteItem]); // Depends on handleDeleteItem from useFoodHistory

    // Enhanced render food item with new delete effect
    const renderFoodItem = useCallback(
        ({ item }: { item: FoodItem }) => (
            <FoodHistoryItem
                item={item}
                onOpenImageModal={openImageModal}
                onDeleteItemPress={handleDeleteItemPress}
                onStartEditing={startEditing}
            />
        ),
        [openImageModal, handleDeleteItemPress, startEditing], // Dependencies for the renderItem callback
    )

    // Stable keyExtractor
    const keyExtractor = useCallback((item: FoodItem) => item.id, []);

    // Render footer (loading indicator for pagination)
    const renderFooter = useCallback(() => {
        if (!isLoadingMore) return null

        return (
            <View style={sharedStyles.footerLoader}>
                <ActivityIndicator size="small" color="#0066CC" />
            </View>
        )
    }, [isLoadingMore])

    // Render end of list message
    const renderEndOfList = useCallback(() => {
        if (isLoadingMore || hasMore || uniqueFoodItems.length === 0) return null; // Use uniqueFoodItems.length

        return (
            <View style={sharedStyles.endOfListContainer}>
                <Text style={sharedStyles.endOfListText}>No more items to load</Text>
            </View>
        )
    }, [isLoadingMore, hasMore, uniqueFoodItems.length]); // Use uniqueFoodItems.length

    // Stable ListFooterComponent renderer
    const listFooterComponentRenderer = useCallback(() => {
        // renderFooter and renderEndOfList are already memoized.
        // This function's reference will be stable if renderFooter and renderEndOfList references are stable.
        return (
            <>
                {renderFooter()}
                {renderEndOfList()}
            </>
        );
    }, [renderFooter, renderEndOfList]);

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
        <View style={sharedStyles.container}>
            <FlatList
                ref={flatListRef}
                data={uniqueFoodItems}
                renderItem={renderFoodItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={sharedStyles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={listFooterComponentRenderer}
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
                initialNumToRender={8}
                maxToRenderPerBatch={5}
                windowSize={10}
                removeClippedSubviews={Platform.OS === 'android'}
                updateCellsBatchingPeriod={100}
                disableVirtualization={false}
                getItemLayout={undefined}
                legacyImplementation={false}
            />

            {showScrollToTop && (
                <TouchableOpacity style={sharedStyles.scrollToTopButton} onPress={scrollToTop} activeOpacity={0.8}>
                    <Ionicons name="chevron-up" size={20} color="#fff" />
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
