"use client"

import { URL_FOOD_CALO_ESTIMATOR, URL_USER_PROFILE } from "@/constants/url_constants"
import { deleteData, getData, patchData } from "@/context/request_context"
import { StatusBar } from "expo-status-bar"
import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

// Types
interface FoodItem {
    id: string
    predict: number
    confidencePercentage: string
    createdAt: string
    publicUrl: {
        originImage: string
        segmentationImage: string
    }
    predictName: string
    comment: string
    calo: number
}

interface ApiResponse {
    count: number
    next: string | null
    previous: string | null
    totalCalories: number
    results: FoodItem[]
}

interface UserProfile {
    calorieLimit: number
    calorieLimitPeriod: string
}

// Type for sorting options
type SortOption = "newest" | "oldest" | "highest-calories" | "lowest-calories"

// Image Modal Component
const ImageModal: React.FC<{
    visible: boolean
    imageUri: string
    onClose: () => void
}> = ({ visible, imageUri, onClose }) => {
    if (Platform.OS === "web") {
        if (!visible) return null
        return (
            <div style={webModalStyles.overlay} onClick={onClose}>
                <div style={webModalStyles.content} onClick={(e) => e.stopPropagation()}>
                    <img src={imageUri || "/placeholder.svg"} alt="Full size" style={webModalStyles.image} />
                    <button onClick={onClose} style={webModalStyles.closeButton}>
                        ✕
                    </button>
                </div>
            </div>
        )
    }

    const { width, height } = Dimensions.get("window")
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
                <View style={styles.modalContent}>
                    <Image
                        source={{ uri: imageUri }}
                        style={[styles.fullImage, { maxWidth: width - 40, maxHeight: height - 100 }]}
                        resizeMode="contain"
                    />
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    )
}

// Edit Modal Component
const EditModal: React.FC<{
    visible: boolean
    initialCalo: string
    initialComment: string
    onSave: (calo: string, comment: string) => void
    onCancel: () => void
}> = ({ visible, initialCalo, initialComment, onSave, onCancel }) => {
    const [editedCalo, setEditedCalo] = useState(initialCalo)
    const [editedComment, setEditedComment] = useState(initialComment)

    useEffect(() => {
        setEditedCalo(initialCalo)
        setEditedComment(initialComment)
    }, [initialCalo, initialComment, visible])

    const handleSave = () => {
        onSave(editedCalo, editedComment)
    }

    if (!visible) return null

    if (Platform.OS === "web") {
        return (
            <div style={webModalStyles.overlay} onClick={onCancel}>
                <div style={webModalStyles.editContent} onClick={(e) => e.stopPropagation()}>
                    <h3 style={{ marginBottom: "15px", fontSize: "18px" }}>Edit Food Item</h3>

                    <div style={{ marginBottom: "15px" }}>
                        <label style={{ display: "block", marginBottom: "5px" }}>Calories:</label>
                        <input
                            type="number"
                            value={editedCalo}
                            onChange={(e) => setEditedCalo(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", marginBottom: "5px" }}>Comment:</label>
                        <textarea
                            value={editedComment}
                            onChange={(e) => setEditedComment(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                                minHeight: "80px",
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <button
                            onClick={onCancel}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                                background: "#f5f5f5",
                                cursor: "pointer",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "4px",
                                border: "none",
                                background: "#3498db",
                                color: "white",
                                cursor: "pointer",
                            }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <TouchableOpacity style={styles.modalOverlay} onPress={onCancel} activeOpacity={1}>
                <View style={styles.editModalContent}>
                    <Text style={styles.editModalTitle}>Edit Food Item</Text>

                    <View style={styles.editInputGroup}>
                        <Text style={styles.editInputLabel}>Calories:</Text>
                        <TextInput
                            style={styles.editInput}
                            value={editedCalo}
                            onChangeText={setEditedCalo}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.editInputGroup}>
                        <Text style={styles.editInputLabel}>Comment:</Text>
                        <TextInput
                            style={[styles.editInput, styles.editTextarea]}
                            value={editedComment}
                            onChangeText={setEditedComment}
                            multiline
                        />
                    </View>

                    <View style={styles.editButtonGroup}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    )
}

// Sorting Dropdown Component
const SortingDropdown: React.FC<{
    value: SortOption
    onChange: (value: SortOption) => void
}> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false)

    const options: { value: SortOption; label: string }[] = [
        { value: "newest", label: "Newest First" },
        { value: "oldest", label: "Oldest First" },
        { value: "highest-calories", label: "Highest Calories" },
        { value: "lowest-calories", label: "Lowest Calories" },
    ]

    const selectedLabel = options.find((opt) => opt.value === value)?.label || "Newest First"

    if (Platform.OS === "web") {
        return (
            <div
                style={{
                    position: "relative",
                    minWidth: "120px",
                }}
            >
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value as SortOption)}
                    style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#fff",
                        border: "1px solid #e1e1e1",
                        fontSize: "14px",
                        color: "#333",
                        cursor: "pointer",
                        appearance: "none",
                        backgroundImage:
                            'url(\'data:image/svg+xml;utf8,<svg fill="%23333" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>\')',
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 8px center",
                        paddingRight: "30px",
                    }}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        )
    }

    return (
        <View style={styles.dropdownContainer}>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setIsOpen(!isOpen)}>
                <Text style={styles.dropdownButtonText}>{selectedLabel}</Text>
                <Text style={styles.dropdownIcon}>{isOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {isOpen && (
                <View style={styles.dropdownOptions}>
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[styles.dropdownOption, value === option.value && styles.dropdownOptionSelected]}
                            onPress={() => {
                                onChange(option.value)
                                setIsOpen(false)
                            }}
                        >
                            <Text style={[styles.dropdownOptionText, value === option.value && styles.dropdownOptionTextSelected]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    )
}

const FoodHistoryNoneView: React.FC = () => {
    const [foodItems, setFoodItems] = useState<FoodItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [totalCalories, setTotalCalories] = useState(0)
    const [modalVisible, setModalVisible] = useState(false)
    const [modalImageUri, setModalImageUri] = useState("")
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [editingItem, setEditingItem] = useState<FoodItem | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [showScrollToTop, setShowScrollToTop] = useState(false)
    const flatListRef = useRef<FlatList>(null)
    const [sortOption, setSortOption] = useState<SortOption>("newest")
    const [isSortChanging, setIsSortChanging] = useState(false)

    // Fetch user profile data
    const fetchUserProfile = useCallback(async () => {
        try {
            const response = await getData<UserProfile>(URL_USER_PROFILE)
            setUserProfile(response.data)
        } catch (error) {
            console.error("Error fetching user profile:", error)
        }
    }, [])

    // Fetch data with time filter
    const fetchFoodHistory = useCallback(
        async (pageNum = 1, shouldRefresh = false, sortOpt?: SortOption) => {
            try {
                if (shouldRefresh) {
                    setIsRefreshing(true)
                } else if (pageNum === 1) {
                    setIsLoading(true)
                } else {
                    setIsLoadingMore(true)
                }

                setError(null)

                // Use the provided sortOpt if available, otherwise use the state value
                const currentSortOption = sortOpt || sortOption

                // Determine ordering parameter based on sort option
                let orderingParam = ""
                switch (currentSortOption) {
                    case "newest":
                        orderingParam = ""
                        break
                    case "oldest":
                        orderingParam = "&ordering=created_at"
                        break
                    case "highest-calories":
                        orderingParam = "&ordering=-calo"
                        break
                    case "lowest-calories":
                        orderingParam = "&ordering=calo"
                        break
                }

                // Fetch data using the utility function from request_context
                const response = await getData<ApiResponse>(`${URL_FOOD_CALO_ESTIMATOR}?page=${pageNum}${orderingParam}`)

                const newItems = response.data.results

                if (shouldRefresh || pageNum === 1) {
                    setFoodItems(newItems)
                } else {
                    setFoodItems((prev) => [...prev, ...newItems])
                }

                setTotalCalories(response.data.totalCalories)
                setHasMore(response.data.next !== null)
                setPage(pageNum)
            } catch (err) {
                setError("Failed to load food history. Please try again.")
                console.error("Error fetching food history:", err)
            } finally {
                setIsLoading(false)
                setIsLoadingMore(false)
                setIsRefreshing(false)
                setIsSortChanging(false)
            }
        },
        [sortOption],
    )

    // Initial data load - only run once on mount
    useEffect(() => {
        fetchFoodHistory(1, true)
        fetchUserProfile()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Empty dependency array to run only once

    // Handle refresh (pull to refresh)
    const handleRefresh = useCallback(() => {
        if (!isRefreshing) {
            fetchFoodHistory(1, true)
            fetchUserProfile()
        }
    }, [fetchFoodHistory, fetchUserProfile, isRefreshing])

    // Handle loading more (pagination)
    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && hasMore && !isRefreshing && !isSortChanging) {
            fetchFoodHistory(page + 1)
        }
    }, [fetchFoodHistory, isLoadingMore, hasMore, isRefreshing, page, isSortChanging])

    // Open image modal
    const openImageModal = useCallback((uri: string) => {
        setModalImageUri(uri)
        setModalVisible(true)
    }, [])

    // Close image modal
    const closeImageModal = useCallback(() => {
        setModalVisible(false)
    }, [])

    // Delete food item
    const handleDeleteItem = useCallback(
        async (id: string) => {
            try {
                const response = await deleteData(URL_FOOD_CALO_ESTIMATOR, id)
                if (response.status === 204) {
                    // Remove the item from the list
                    setFoodItems((prev) => prev.filter((item) => item.id !== id))
                    // Update total calories
                    setTotalCalories((prev) => {
                        const deletedItem = foodItems.find((item) => item.id === id)
                        return deletedItem ? prev - deletedItem.calo : prev
                    })
                }
            } catch (error) {
                console.error("Error deleting food item:", error)
                setError("Failed to delete food item. Please try again.")
            }
        },
        [foodItems],
    )

    // Start editing an item
    const startEditing = useCallback((item: FoodItem) => {
        setEditingItem(item)
        setIsEditing(true)
    }, [])

    // Save edited item
    const saveEditedItem = useCallback(
        async (calo: string, comment: string) => {
            if (!editingItem) return

            try {
                const updatedData = {
                    calo: Number(calo),
                    comment: comment,
                }

                const response = await patchData<FoodItem>(`${URL_FOOD_CALO_ESTIMATOR}/${editingItem.id}`, updatedData)

                if (response.status === 200) {
                    // Update the item in the list with the response data
                    const updatedItem = response.data

                    setFoodItems((prev) => prev.map((item) => (item.id === editingItem.id ? updatedItem : item)))

                    // Update total calories
                    setTotalCalories((prev) => prev - editingItem.calo + updatedItem.calo)
                }

                // Close the editing mode
                setIsEditing(false)
                setEditingItem(null)
            } catch (error) {
                console.error("Error updating food item:", error)
                setError("Failed to update food item. Please try again.")
            }
        },
        [editingItem],
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

    // Format date to match the screenshot
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const day = date.getDate()
        const month = date.getMonth() + 1
        const year = date.getFullYear()
        const hours = date.getHours()
        const minutes = String(date.getMinutes()).padStart(2, "0")
        return `${day}/${month}/${year} • ${hours}:${minutes}`
    }

    // Render a food item
    const renderFoodItem = useCallback(
        ({ item }: { item: FoodItem }) => {
            const formattedDate = formatDate(item.createdAt)

            return (
                <View style={styles.foodCard}>
                    <View style={styles.foodCardHeader}>
                        <Text style={styles.foodName}>{item.predictName}</Text>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.editButton} onPress={() => startEditing(item)}>
                                {Platform.OS === "web" ? (
                                    <div style={{ color: "#3498db", cursor: "pointer", fontSize: "18px" }}>✎</div>
                                ) : (
                                    <Text style={styles.editButtonText}>✎</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteItem(item.id)}>
                                {Platform.OS === "web" ? (
                                    <div style={{ color: "#e74c3c", cursor: "pointer", fontSize: "18px" }}>🗑</div>
                                ) : (
                                    <Text style={styles.deleteButtonText}>🗑</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={styles.foodCalories}>{item.calo} calories</Text>

                    <View style={styles.imagesContainer}>
                        <TouchableOpacity
                            style={styles.imageWrapper}
                            onPress={() => openImageModal(item.publicUrl.originImage)}
                            activeOpacity={0.9}
                        >
                            <Image source={{ uri: item.publicUrl.originImage }} style={styles.thumbnailImage} resizeMode="contain" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.imageWrapper}
                            onPress={() => openImageModal(item.publicUrl.segmentationImage)}
                            activeOpacity={0.9}
                        >
                            <Image
                                source={{ uri: item.publicUrl.segmentationImage }}
                                style={styles.thumbnailImage}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.foodDate}>{formattedDate}</Text>
                    <Text style={styles.confidenceText}>Confidence: {item.confidencePercentage}</Text>

                    <View style={styles.commentContainer}>
                        <Text style={styles.commentLabel}>Ghi chú:</Text>
                        <Text style={styles.foodComment}>{item.comment ? item.comment : "Không có ghi chú"}</Text>
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
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#0066CC" />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
        )
    }, [isLoadingMore])

    // Render end of list message
    const renderEndOfList = useCallback(() => {
        if (isLoadingMore || hasMore || foodItems.length === 0) return null

        return (
            <View style={styles.endOfListContainer}>
                <Text style={styles.endOfListText}>No more items to load</Text>
            </View>
        )
    }, [isLoadingMore, hasMore, foodItems.length])

    // Render empty state
    const renderEmpty = useCallback(() => {
        if (isLoading) return null

        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No food history found</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => fetchFoodHistory()}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        )
    }, [isLoading, fetchFoodHistory])

    // Handle sort option change
    const handleSortChange = useCallback(
        (newSortOption: SortOption) => {
            // Skip if already sorting or if the option is the same
            if (isSortChanging || newSortOption === sortOption) return

            // Set loading states
            setIsSortChanging(true)
            setIsLoading(true)

            // Change the sort option
            setSortOption(newSortOption)

            // Reset to page 1
            setPage(1)

            // Scroll to top immediately
            if (flatListRef.current) {
                flatListRef.current.scrollToOffset({ offset: 0, animated: true })
            }

            // Add a slight delay for visual effect before fetching new data
            setTimeout(() => {
                // Pass the new sort option directly to fetchFoodHistory
                fetchFoodHistory(1, true, newSortOption)
            }, 300)
        },
        [fetchFoodHistory, sortOption, isSortChanging],
    )

    // Add a new loading overlay component for sort transitions
    const LoadingOverlay = () => {
        return (
            <View style={styles.loadingOverlay}>
                <View style={styles.loadingCard}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={styles.loadingOverlayText}>Sorting items...</Text>
                </View>
            </View>
        )
    }

    // Main render
    if (isLoading) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <View style={styles.infoRow}>
                    <View style={styles.totalCaloriesContainer}>
                        <Text style={styles.totalCaloriesLabel}>Total Calories:</Text>
                        <Text style={styles.totalCaloriesValue}>{totalCalories}</Text>
                    </View>
                    <View style={styles.sortingWrapper}>
                        <Text style={styles.sortingLabel}>Sort by:</Text>
                        <View style={styles.dropdownWrapper}>
                            <SortingDropdown value={sortOption} onChange={handleSortChange} />
                        </View>
                    </View>
                </View>
                <LoadingOverlay />
            </View>
        )
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => fetchFoodHistory()}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.infoRow}>
                <View style={styles.totalCaloriesContainer}>
                    <Text style={styles.totalCaloriesLabel}>Total Calories:</Text>
                    <Text style={styles.totalCaloriesValue}>{totalCalories}</Text>
                </View>
                <View style={styles.sortingWrapper}>
                    <Text style={styles.sortingLabel}>Sort by:</Text>
                    <View style={styles.dropdownWrapper}>
                        <SortingDropdown value={sortOption} onChange={handleSortChange} />
                    </View>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={foodItems}
                renderItem={renderFoodItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
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
                <TouchableOpacity style={styles.scrollToTopButton} onPress={scrollToTop} activeOpacity={0.8}>
                    {Platform.OS === "web" ? (
                        <div style={{ color: "#fff", fontSize: "20px" }}>↑</div>
                    ) : (
                        <Text style={styles.scrollToTopButtonText}>↑</Text>
                    )}
                </TouchableOpacity>
            )}

            <ImageModal visible={modalVisible} imageUri={modalImageUri} onClose={closeImageModal} />
            {editingItem && (
                <EditModal
                    visible={isEditing}
                    initialCalo={editingItem.calo.toString()}
                    initialComment={editingItem.comment || ""}
                    onSave={saveEditedItem}
                    onCancel={cancelEditing}
                />
            )}
        </View>
    )
}

// Web-specific styles
const webModalStyles = {
    overlay: {
        position: "fixed" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    content: {
        position: "relative" as const,
        maxWidth: "90%",
        maxHeight: "90%",
    },
    image: {
        maxWidth: "100%",
        maxHeight: "90vh",
        borderRadius: "8px",
        objectFit: "contain" as const,
    },
    closeButton: {
        position: "absolute" as const,
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
    },
    editContent: {
        position: "relative" as const,
        backgroundColor: "#fff",
        padding: "20px",
        borderRadius: "8px",
        maxWidth: "400px",
        width: "90%",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    },
}

const webDropdownStyles = {
    container: {
        marginBottom: "15px",
    },
    select: {
        width: "100%",
        padding: "8px",
        borderRadius: "4px",
        border: "1px solid #ddd",
        backgroundColor: "#fff",
        fontSize: "16px",
        color: "#333",
        cursor: "pointer",
    },
}

const { width } = Dimensions.get("window")
const isWeb = Platform.OS === "web"

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    header: {
        paddingTop: isWeb ? 20 : 60,
        paddingBottom: 15,
        paddingHorizontal: 20,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5E5",
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#2c3e50",
    },
    filterWrapper: {
        flexDirection: "row",
        alignItems: "center",
    },
    filterText: {
        fontSize: 16,
        color: "#666666",
        marginRight: 10,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 10,
        marginHorizontal: 10,
        marginVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e5e5e5",
    },
    totalCaloriesContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    sortingWrapper: {
        flexDirection: "row",
        alignItems: "center",
    },
    dropdownWrapper: {
        minWidth: 120,
    },
    calorieInfoContainer: {
        backgroundColor: "#f8f9fa",
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e5e5e5",
        margin: 10,
    },
    calorieRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5,
    },
    totalCaloriesLabel: {
        fontSize: 14,
        color: "#666666",
        marginRight: 5,
    },
    totalCaloriesValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#e74c3c",
    },
    calorieLimitLabel: {
        fontSize: 14,
        color: "#666666",
    },
    calorieLimitValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#3498db",
    },
    progressContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
    },
    progressBar: {
        flex: 1,
        height: 10,
        backgroundColor: "#e5e5e5",
        borderRadius: 5,
        marginRight: 10,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#2ecc71",
        borderRadius: 5,
    },
    progressWarning: {
        backgroundColor: "#f39c12",
    },
    progressDanger: {
        backgroundColor: "#e74c3c",
    },
    progressText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#666",
        width: 40,
        textAlign: "right",
    },
    dropdownContainer: {
        position: "relative",
        zIndex: 100,
    },
    dropdownButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e1e1e1",
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 100,
    },
    dropdownButtonText: {
        fontSize: 14,
        color: "#333",
        flex: 1,
    },
    dropdownIcon: {
        fontSize: 12,
        color: "#666",
        marginLeft: 5,
    },
    dropdownOptions: {
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e1e1e1",
        marginTop: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 101,
    },
    dropdownOption: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    dropdownOptionSelected: {
        backgroundColor: "#f0f8ff",
    },
    dropdownOptionText: {
        fontSize: 14,
        color: "#333",
    },
    dropdownOptionTextSelected: {
        color: "#3498db",
        fontWeight: "bold",
    },
    listContainer: {
        padding: 16,
        paddingBottom: 30,
    },
    foodCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        marginBottom: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        padding: 16,
    },
    foodCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    foodName: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#2c3e50",
        textTransform: "capitalize",
    },
    foodCalories: {
        fontSize: 16,
        fontWeight: "600",
        color: "#e74c3c",
        marginTop: 4,
        marginBottom: 16,
    },
    imagesContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    imageWrapper: {
        width: "48%",
        borderRadius: 8,
        overflow: "hidden",
        height: undefined, // Let height be determined by the image
    },
    thumbnailImage: {
        width: "100%",
        height: undefined, // Let height be determined by the image
        aspectRatio: 1.33, // This is a common aspect ratio (4:3) but will be overridden by the actual image
    },
    foodDate: {
        fontSize: 14,
        color: "#666",
        marginBottom: 8,
    },
    confidenceText: {
        fontSize: 14,
        color: "#3498db",
    },
    commentContainer: {
        marginTop: 8,
        backgroundColor: "#f5f5f5",
        padding: 8,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: "#3498db",
    },
    commentLabel: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    foodComment: {
        fontSize: 14,
        color: "#666",
        fontStyle: "italic",
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#666",
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    loadingMoreText: {
        marginLeft: 8,
        fontSize: 14,
        color: "#666",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: "#666",
        marginBottom: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#f8f9fa",
    },
    errorText: {
        fontSize: 16,
        color: "#e74c3c",
        textAlign: "center",
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: "#3498db",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        position: "relative",
        maxWidth: "90%",
        maxHeight: "90%",
    },
    fullImage: {
        borderRadius: 8,
        width: "100%",
        height: "100%",
        resizeMode: "contain",
    },
    closeButton: {
        position: "absolute",
        top: -10,
        right: -10,
        backgroundColor: "#fff",
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    closeButtonText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    actionButtons: {
        flexDirection: "row",
        alignItems: "center",
    },
    editButton: {
        marginRight: 10,
    },
    deleteButton: {
        // No specific styles needed
    },
    editButtonText: {
        fontSize: 18,
        color: "#3498db",
    },
    deleteButtonText: {
        fontSize: 18,
        color: "#e74c3c",
    },
    editModalContent: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        width: "90%",
        maxWidth: 400,
    },
    editModalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 15,
        color: "#2c3e50",
    },
    editInputGroup: {
        marginBottom: 15,
    },
    editInputLabel: {
        fontSize: 14,
        color: "#666",
        marginBottom: 5,
    },
    editInput: {
        borderWidth: 1,
        borderColor: "#e1e1e1",
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
    },
    editTextarea: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    editButtonGroup: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e1e1e1",
        backgroundColor: "#f5f5f5",
    },
    cancelButtonText: {
        color: "#666",
        fontSize: 16,
    },
    saveButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: "#3498db",
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    endOfListContainer: {
        paddingVertical: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    endOfListText: {
        fontSize: 14,
        color: "#666",
        fontStyle: "italic",
    },
    scrollToTopButton: {
        position: "absolute",
        bottom: 20,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#3498db",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
        zIndex: 999,
    },
    scrollToTopButtonText: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
    },
    sortingContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 10,
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e5e5e5",
    },
    sortingLabel: {
        fontSize: 14,
        color: "#666666",
        marginRight: 10,
    },
    loadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
    },
    loadingCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        minWidth: 200,
    },
    loadingOverlayText: {
        marginTop: 12,
        fontSize: 16,
        color: "#666",
        fontWeight: "500",
    },
})

export default FoodHistoryNoneView
