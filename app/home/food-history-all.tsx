"use client"

import type React from "react"

import { useCallback, useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

// Import shared utilities
import {
    EditModal,
    type FoodItem,
    ImageModal,
    LoadingOverlay,
    type SortOption,
    formatDate,
    styles as sharedStyles,
    useFoodHistory,
} from "@/utils/food-history-utils"

interface FoodHistoryAllViewProps {
    sortOption: SortOption
    onSortChange: (sortOption: SortOption) => void
    onDataChange: (totalCalories: number) => void
}

/**
 * Component to display all food history items
 * Supports sorting, pagination, and item editing/deletion
 */
const FoodHistoryAllView: React.FC<FoodHistoryAllViewProps> = ({ sortOption, onSortChange, onDataChange }) => {
    const {
        foodItems,
        isLoading,
        isLoadingMore,
        isRefreshing,
        error,
        page,
        hasMore,
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

    // Initial data load - only run once on mount
    useEffect(() => {
        fetchFoodHistory(1, true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Empty dependency array to run only once

    // Handle sort option change - this is the key fix
    useEffect(() => {
        if (sortOption) {
            handleSortChange(sortOption, (sortOpt) => {
                // Scroll to top immediately
                if (flatListRef.current) {
                    flatListRef.current.scrollToOffset({ offset: 0, animated: true })
                }
                fetchFoodHistory(1, true, sortOpt)
            })
        }
    }, [sortOption, handleSortChange, fetchFoodHistory])

    // Handle refresh (pull to refresh)
    const handleRefresh = useCallback(() => {
        if (!isRefreshing) {
            fetchFoodHistory(1, true)
        }
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
                <LoadingOverlay />
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

export default FoodHistoryAllView
