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

type TimeFilter = "none" | "day" | "week" | "month"

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

// Dropdown Component
const FilterDropdown: React.FC<{
    value: TimeFilter
    onChange: (value: TimeFilter) => void
}> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false)

    const options: { value: TimeFilter; label: string }[] = [
        { value: "none", label: "None" },
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
    ]

    const selectedLabel = options.find((opt) => opt.value === value)?.label || "None"

    if (Platform.OS === "web") {
        return (
            <div style={webDropdownStyles.container}>
                <select value={value} onChange={(e) => onChange(e.target.value as TimeFilter)} style={webDropdownStyles.select}>
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

const FoodHistoryScreen: React.FC = () => {
    const [foodItems, setFoodItems] = useState<FoodItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [totalCalories, setTotalCalories] = useState(0)
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("none")
    const [modalVisible, setModalVisible] = useState(false)
    const [modalImageUri, setModalImageUri] = useState("")
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [editingItem, setEditingItem] = useState<FoodItem | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [showScrollToTop, setShowScrollToTop] = useState(false)
    const flatListRef = useRef<FlatList>(null)

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
        async (pageNum = 1, shouldRefresh = false) => {
            try {
                if (shouldRefresh) {
                    setIsRefreshing(true)
                } else if (pageNum === 1) {
                    setIsLoading(true)
                } else {
                    setIsLoadingMore(true)
                }

                setError(null)

                // Build query params based on time filter
                let timeFilterParam = ""
                if (timeFilter !== "none") {
                    timeFilterParam = `&timeFilter=${timeFilter}`
                }

                // Fetch data using the utility function from request_context
                const response = await getData<ApiResponse>(`${URL_FOOD_CALO_ESTIMATOR}?page=${pageNum}${timeFilterParam}`)

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
            }
        },
        [timeFilter],
    )

    // Initial data load
    useEffect(() => {
        fetchFoodHistory(1, true)
        fetchUserProfile()
    }, [fetchFoodHistory, fetchUserProfile])

    // Handle refresh (pull to refresh)
    const handleRefresh = useCallback(() => {
        if (!isRefreshing) {
            fetchFoodHistory(1, true)
            fetchUserProfile()
        }
    }, [fetchFoodHistory, fetchUserProfile, isRefreshing])

    // Handle loading more (pagination)
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

    // Get period label
    const getPeriodLabel = (period: string) => {
        switch (period) {
            case "day":
                return "Day"
            case "week":
                return "Week"
            case "month":
                return "Month"
            default:
                return "Day"
        }
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
                    {item.comment ? <Text style={styles.foodComment}>{item.comment}</Text> : null}
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

    // Main render
    if (isLoading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Loading food history...</Text>
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

            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Food History</Text>
                    <View style={styles.filterWrapper}>
                        <Text style={styles.filterText}>Filter by:</Text>
                        <FilterDropdown value={timeFilter} onChange={setTimeFilter} />
                    </View>
                </View>

                <View style={styles.calorieInfoContainer}>
                    <View style={styles.calorieRow}>
                        <Text style={styles.totalCaloriesLabel}>Total Calories:</Text>
                        <Text style={styles.totalCaloriesValue}>{totalCalories}</Text>
                    </View>

                    {userProfile && (
                        <View style={styles.calorieRow}>
                            <Text style={styles.calorieLimitLabel}>Calorie Limit:</Text>
                            <Text style={styles.calorieLimitValue}>
                                {userProfile.calorieLimit} / {getPeriodLabel(userProfile.calorieLimitPeriod)}
                            </Text>
                        </View>
                    )}
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
        position: "relative" as const,
    },
    select: {
        padding: "8px 12px",
        borderRadius: "8px",
        backgroundColor: "#fff",
        border: "1px solid #e1e1e1",
        fontSize: "14px",
        color: "#333",
        cursor: "pointer",
        minWidth: "120px",
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
    calorieInfoContainer: {
        backgroundColor: "#f8f9fa",
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e5e5e5",
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
    foodComment: {
        fontSize: 14,
        color: "#666",
        fontStyle: "italic",
        marginTop: 8,
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
})

export default FoodHistoryScreen
