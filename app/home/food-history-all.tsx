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
    EditModal,
    type FoodItem,
    type SortOption,
    formatDate,
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

// Simple ImageModal for Android compatibility
const ImageModal: React.FC<{
    visible: boolean
    imageUri: string
    onClose: () => void
}> = ({ visible, imageUri, onClose }) => {
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose()
            }
        }

        if (visible && Platform.OS === "web") {
            document.addEventListener("keydown", handleEscape)
            return () => document.removeEventListener("keydown", handleEscape)
        }
    }, [visible, onClose])

    useEffect(() => {
        if (Platform.OS === "web" && typeof document !== "undefined") {
            const existingStyle = document.getElementById("spin-animation")
            if (!existingStyle) {
                const style = document.createElement("style")
                style.id = "spin-animation"
                style.textContent = `
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `
                document.head.appendChild(style)
            }
        }
    }, [])

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
                    <Image source={{ uri: imageUri }} style={modalStyles.image} resizeMode="contain" />
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
                                    <Text style={[sharedStyles.editButtonText, { color: isDeleting ? "#ccc" : "#3498db" }]}>✎</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[sharedStyles.deleteButton, isDeleting && { opacity: 0.5 }]}
                                onPress={() => handleDeleteItem(item.id)}
                                disabled={isDeleting}
                            >
                                {Platform.OS === "web" ? (
                                    <div style={{ color: "#e74c3c", cursor: isDeleting ? "not-allowed" : "pointer", fontSize: "18px" }}>🗑</div>
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
            {/* Loading overlay for data changes */}
            {(isDataChanging || isSortChanging) && <EnhancedLoadingOverlay />}
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

export default FoodHistoryAllView