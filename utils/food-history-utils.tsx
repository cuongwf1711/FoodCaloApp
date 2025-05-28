"use client"

import type React from "react"

import { URL_FOOD_CALO_ESTIMATOR, URL_USER_PROFILE } from "@/constants/url_constants"
import { deleteData, getData, patchData } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import { useCallback, useEffect, useRef, useState } from "react"
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    type FlatList,
} from "react-native"

// Common Types
export interface FoodItem {
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
    isDeleting?: boolean
}

export interface ApiResponse {
    count: number
    next: string | null
    previous: string | null
    totalCalories: number
    results: FoodItem[]
}

export interface UserProfile {
    calorieLimit: number
    calorieLimitPeriod: string
}

export type SortOption = "newest" | "oldest" | "highest-calories" | "lowest-calories"
export type TimeFilter = "all" | "date"
export type TimeUnit = "day" | "week" | "month"

export interface FoodHistoryProps {
    sortOption?: SortOption
    onSortChange?: (sortOption: SortOption) => void
    onDataChange?: (totalCalories: number) => void
}

// FIXED: Improved useFoodHistory hook with better state management
export const useFoodHistory = (
    initialSortOption: SortOption = "newest",
    externalSortOption?: SortOption,
    onDataChange?: (totalCalories: number) => void,
) => {
    const [foodItems, setFoodItems] = useState<FoodItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [totalCalories, setTotalCalories] = useState(0)
    const [sortOption, setSortOption] = useState<SortOption>(externalSortOption || initialSortOption)
    const [isSortChanging, setIsSortChanging] = useState(false)
    const [scrollPosition, setScrollPosition] = useState(0)

    // Force update counter for Android compatibility
    const [updateCounter, setUpdateCounter] = useState(0)

    // Trong useFoodHistory hook, thêm ref để track fetch state:
    const isFetchingRef = useRef(false)
    const lastFetchParamsRef = useRef<string>("")

    useEffect(() => {
        if (externalSortOption && externalSortOption !== sortOption) {
            setSortOption(externalSortOption)
        }
    }, [externalSortOption, sortOption])

    // FIXED: Improved onDataChange callback with better logging
    useEffect(() => {
        if (onDataChange && totalCalories !== undefined) {
            onDataChange(totalCalories)
        }
    }, [totalCalories, onDataChange])

    // FIXED: Simplified fetchFoodHistory without Android-specific workarounds
    const fetchFoodHistory = useCallback(
        async (
            pageNum = 1,
            shouldRefresh = false,
            sortOpt?: SortOption,
            timeUnit?: TimeUnit,
            dateParam?: string,
            weeksAgo?: number,
            monthParam?: string,
        ) => {
            // Create a unique key for this fetch request
            const fetchKey = `${pageNum}-${shouldRefresh}-${sortOpt || sortOption}-${timeUnit}-${dateParam}-${weeksAgo}-${monthParam}`

            // Prevent duplicate calls with same parameters
            if (isFetchingRef.current && lastFetchParamsRef.current === fetchKey) {
                return
            }

            try {

                isFetchingRef.current = true
                lastFetchParamsRef.current = fetchKey

                if (shouldRefresh) {
                    setIsRefreshing(true)
                    // Clear existing data when refreshing
                    if (pageNum === 1) {
                        setFoodItems([])
                    }
                } else if (pageNum === 1) {
                    setIsLoading(true)
                    setFoodItems([])
                } else {
                    setIsLoadingMore(true)
                }

                setError(null)

                const currentSortOption = sortOpt || sortOption

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

                let apiUrl = URL_FOOD_CALO_ESTIMATOR + "?"

                if (timeUnit) {
                    switch (timeUnit) {
                        case "day":
                            apiUrl += `day=${dateParam}${orderingParam}`
                            break
                        case "week":
                            apiUrl += `week=${weeksAgo}${orderingParam}`
                            break
                        case "month":
                            apiUrl += `month=${monthParam}${orderingParam}`
                            break
                    }
                } else {
                    apiUrl += `page=${pageNum}${orderingParam}`
                }


                const response = await getData<ApiResponse>(apiUrl)
                const newItems = response.data.results
                const newTotalCalories = response.data.totalCalories

                // FIXED: Ensure proper state updates
                if (shouldRefresh || pageNum === 1) {
                    setFoodItems(newItems)
                } else {
                    setFoodItems((prev) => [...prev, ...newItems])
                }

                // FIXED: Always update total calories
                setTotalCalories(newTotalCalories)

                setHasMore(response.data.next !== null)
                setPage(pageNum)

                // Call onDataChange callback
                if (onDataChange) {
                    onDataChange(newTotalCalories)
                }

                // Force update counter for Android compatibility
                setUpdateCounter((prev) => prev + 1)
            } catch (err) {
                setError("Failed to load food history. Please try again.")
            } finally {
                setIsLoading(false)
                setIsLoadingMore(false)
                setIsRefreshing(false)
                setIsSortChanging(false)

                // Reset fetch flag after a short delay
                setTimeout(() => {
                    isFetchingRef.current = false
                }, 100)
            }
        },
        [sortOption, onDataChange],
    )

    const handleDeleteItem = useCallback(async (id: string) => {
        if (Platform.OS === "web") {
            const confirmed = window.confirm("Are you sure you want to delete this food item?")
            if (!confirmed) return
        } else {
            Alert.alert(
                "Delete Food Item",
                "Are you sure you want to delete this food item?",
                [
                    {
                        text: "Cancel",
                        style: "cancel",
                    },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                            await performActualDelete(id)
                        },
                    },
                ],
                { cancelable: true },
            )
            return
        }

        await performActualDelete(id)
    }, [])

    const performActualDelete = async (id: string) => {
        try {
            let itemToDelete: FoodItem | null = null

            setFoodItems((currentItems) => {
                itemToDelete = currentItems.find((item) => item.id === id) ?? null
                if (!itemToDelete) return currentItems

                return currentItems.map((item) => (item.id === id ? { ...item, isDeleting: true } : item))
            })

            if (!itemToDelete) {
                return
            }

            const response = await deleteData(URL_FOOD_CALO_ESTIMATOR, id)

            if (response.status === 204) {
                setFoodItems((prev) => prev.filter((item) => item.id !== id))

                // FIXED: Use functional update for totalCalories
                setTotalCalories((prevTotal) => {
                    const newTotal = prevTotal - itemToDelete!.calo
                    return newTotal
                })

                setUpdateCounter((prev) => prev + 1)
            }
        } catch (error) {
            setFoodItems((prev) => prev.map((item) => (item.id === id ? { ...item, isDeleting: false } : item)))
            showMessage(error)
        }
    }

    const saveEditedItem = useCallback(async (editingItem: FoodItem, calo: string, comment: string) => {
        if (!editingItem) return

        try {
            const updatedData = {
                calo: Number(calo),
                comment: comment,
            }

            const response = await patchData<FoodItem>(`${URL_FOOD_CALO_ESTIMATOR}/${editingItem.id}`, updatedData)

            if (response.status === 200) {
                const updatedItem = response.data

                setFoodItems((prev) => prev.map((item) => (item.id === editingItem.id ? updatedItem : item)))

                // FIXED: Use functional update for totalCalories
                setTotalCalories((prevTotal) => {
                    const newTotal = prevTotal - editingItem.calo + updatedItem.calo
                    return newTotal
                })

                setUpdateCounter((prev) => prev + 1)

                return true
            }
            return false
        } catch (error) {
            setError("Failed to update food item. Please try again.")
            return false
        }
    }, [])

    const handleSortChange = useCallback(
        (newSortOption: SortOption, callback?: (sortOpt: SortOption) => void) => {
            if (isSortChanging || newSortOption === sortOption) return

            setIsSortChanging(true)
            setIsLoading(true)
            setSortOption(newSortOption)

            if (callback) {
                setTimeout(() => {
                    callback(newSortOption)
                }, 300)
            }
        },
        [isSortChanging, sortOption],
    )

    return {
        foodItems,
        isLoading,
        isLoadingMore,
        isRefreshing,
        error,
        page,
        hasMore,
        totalCalories,
        sortOption,
        isSortChanging,
        updateCounter,
        fetchFoodHistory,
        handleDeleteItem,
        saveEditedItem,
        handleSortChange,
        setFoodItems,
        setIsLoading,
        setIsRefreshing,
        setError,
        scrollPosition,
        setScrollPosition,
        scrollToTop: useCallback((flatListRef: React.RefObject<FlatList>, onComplete?: () => void) => {
            if (flatListRef.current) {
                flatListRef.current.scrollToOffset({
                    offset: 0,
                    animated: true,
                })

                if (onComplete) {
                    setTimeout(() => {
                        onComplete()
                    }, 300)
                }
            }
        }, []),
    }
}

export const useUserProfile = () => {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

    const fetchUserProfile = useCallback(async () => {
        try {
            const response = await getData<UserProfile>(URL_USER_PROFILE)
            setUserProfile(response.data)
        } catch (error) {
            console.error("Error fetching user profile:", error)
        }
    }, [])

    return { userProfile, fetchUserProfile }
}

// Enhanced ImageModal Component
export const ImageModal: React.FC<{
    visible: boolean
    imageUri: string
    onClose: () => void
}> = ({ visible, imageUri, onClose }) => {
    const [isModalVisible, setIsModalVisible] = useState(visible)

    useEffect(() => {
        setIsModalVisible(visible)
    }, [visible])

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose()
            }
        }

        if (Platform.OS === "web" && isModalVisible) {
            document.addEventListener("keydown", handleEscape)
            return () => document.removeEventListener("keydown", handleEscape)
        }
    }, [isModalVisible, onClose])

    if (Platform.OS === "web") {
        if (!isModalVisible) return null

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

    const { width, height } = Dimensions.get("window")

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: imageUri }}
                            style={[
                                styles.fullImage,
                                {
                                    maxWidth: width - 40,
                                    maxHeight: height - 100,
                                },
                            ]}
                            resizeMode="contain"
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    )
}

export const EditModal: React.FC<{
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
                <TouchableWithoutFeedback>
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
                </TouchableWithoutFeedback>
            </TouchableOpacity>
        </Modal>
    )
}

// Fixed SortingDropdown with disabled state support
export const SortingDropdown: React.FC<{
    value: SortOption
    onChange: (value: SortOption) => void
    disabled?: boolean
}> = ({ value, onChange, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false)

    const options: { value: SortOption; label: string }[] = [
        { value: "newest", label: "Newest" },
        { value: "oldest", label: "Oldest" },
        { value: "highest-calories", label: "High Calo" },
        { value: "lowest-calories", label: "Low Calo" },
    ]

    const selectedLabel = options.find((opt) => opt.value === value)?.label || "Newest"

    if (Platform.OS === "web") {
        return (
            <div style={{ position: "relative", minWidth: "110px" }}>
                <select
                    value={value}
                    onChange={(e) => !disabled && onChange(e.target.value as SortOption)}
                    disabled={disabled}
                    style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        backgroundColor: disabled ? "#f5f5f5" : "#fff",
                        border: "1px solid #e1e1e1",
                        fontSize: "14px",
                        color: disabled ? "#999" : "#333",
                        cursor: disabled ? "not-allowed" : "pointer",
                        appearance: "none",
                        backgroundImage: disabled
                            ? "none"
                            : 'url(\'data:image/svg+xml;utf8,<svg fill="%2333" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>\')',
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 8px center",
                        paddingRight: "30px",
                        whiteSpace: "nowrap",
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
            <TouchableOpacity
                style={[styles.dropdownButton, disabled && styles.dropdownButtonDisabled]}
                onPress={() => !disabled && setIsOpen(!isOpen)}
                activeOpacity={disabled ? 1 : 0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={disabled}
            >
                <Text style={[styles.dropdownButtonText, disabled && styles.dropdownButtonTextDisabled]}>{selectedLabel}</Text>
                <Text style={[styles.dropdownIcon, disabled && styles.dropdownIconDisabled]}>{isOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            <Modal
                visible={isOpen && !disabled}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <TouchableOpacity style={styles.dropdownModalOverlay} activeOpacity={1} onPress={() => setIsOpen(false)}>
                    <View style={styles.dropdownModalContent}>
                        <Text style={styles.dropdownModalTitle}>Sort by</Text>
                        {options.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[styles.dropdownModalOption, value === option.value && styles.dropdownModalOptionSelected]}
                                onPress={() => {
                                    onChange(option.value)
                                    setIsOpen(false)
                                }}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.dropdownModalOptionText,
                                        value === option.value && styles.dropdownModalOptionTextSelected,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                                {value === option.value && <Text style={styles.dropdownModalCheckmark}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    )
}

// Fixed FilterDropdown with better Android support
export const FilterDropdown: React.FC<{
    value: TimeFilter
    onChange: (value: TimeFilter) => void
}> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false)

    const options: { value: TimeFilter; label: string }[] = [
        { value: "all", label: "All" },
        { value: "date", label: "Date" },
    ]

    const selectedLabel = options.find((opt) => opt.value === value)?.label || "All"

    if (Platform.OS === "web") {
        return (
            <div style={{ position: "relative", minWidth: "120px" }}>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value as TimeFilter)}
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
            <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setIsOpen(!isOpen)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Text style={styles.dropdownButtonText}>{selectedLabel}</Text>
                <Text style={styles.dropdownIcon}>{isOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            <Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={() => setIsOpen(false)}>
                <TouchableOpacity style={styles.dropdownModalOverlay} activeOpacity={1} onPress={() => setIsOpen(false)}>
                    <View style={styles.dropdownModalContent}>
                        <Text style={styles.dropdownModalTitle}>Filter by</Text>
                        {options.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[styles.dropdownModalOption, value === option.value && styles.dropdownModalOptionSelected]}
                                onPress={() => {
                                    onChange(option.value)
                                    setIsOpen(false)
                                }}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.dropdownModalOptionText,
                                        value === option.value && styles.dropdownModalOptionTextSelected,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                                {value === option.value && <Text style={styles.dropdownModalCheckmark}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    )
}

// UnitDropdown component
export const UnitDropdown: React.FC<{
    value: TimeUnit
    onChange: (value: TimeUnit) => void
}> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false)

    const options: { value: TimeUnit; label: string }[] = [
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
    ]

    const selectedLabel = options.find((opt) => opt.value === value)?.label || "Day"

    if (Platform.OS === "web") {
        return (
            <div style={{ position: "relative", minWidth: "100px" }}>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value as TimeUnit)}
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
            <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setIsOpen(!isOpen)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Text style={styles.dropdownButtonText}>{selectedLabel}</Text>
                <Text style={styles.dropdownIcon}>{isOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            <Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={() => setIsOpen(false)}>
                <TouchableOpacity style={styles.dropdownModalOverlay} activeOpacity={1} onPress={() => setIsOpen(false)}>
                    <View style={styles.dropdownModalContent}>
                        <Text style={styles.dropdownModalTitle}>Select Unit</Text>
                        {options.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[styles.dropdownModalOption, value === option.value && styles.dropdownModalOptionSelected]}
                                onPress={() => {
                                    onChange(option.value)
                                    setIsOpen(false)
                                }}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.dropdownModalOptionText,
                                        value === option.value && styles.dropdownModalOptionTextSelected,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                                {value === option.value && <Text style={styles.dropdownModalCheckmark}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    )
}

// DatePicker component
export const DatePicker: React.FC<{
    selectedDate: string
    onDateChange: (date: string) => void
}> = ({ selectedDate, onDateChange }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const formatDisplayDate = (dateString: string) => {
        const [year, month, day] = dateString.split("-")
        return `${day}/${month}/${year}`
    }

    if (Platform.OS === "web") {
        return (
            <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    border: "1px solid #e1e1e1",
                    fontSize: "14px",
                    color: "#333",
                    cursor: "pointer",
                }}
            />
        )
    }

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    }

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth)
        const firstDay = getFirstDayOfMonth(currentMonth)
        const today = new Date()
        const selectedDateObj = new Date(selectedDate)

        const days = []

        // Empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(
                <TouchableOpacity key={`empty-${i}`} style={styles.calendarDay}>
                    <Text style={styles.calendarDayTextEmpty}>0</Text>
                </TouchableOpacity>,
            )
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            const isToday = dayDate.toDateString() === today.toDateString()
            const isSelected = dayDate.toDateString() === selectedDateObj.toDateString()

            days.push(
                <TouchableOpacity
                    key={day}
                    style={[
                        styles.calendarDay,
                        isSelected && styles.calendarDaySelected,
                        isToday && !isSelected && styles.calendarDayToday,
                    ]}
                    onPress={() => {
                        const newDate = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                        onDateChange(newDate)
                        setIsOpen(false)
                    }}
                >
                    <Text
                        style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                            isToday && !isSelected && styles.calendarDayTextToday,
                        ]}
                    >
                        {day}
                    </Text>
                </TouchableOpacity>,
            )
        }

        return days
    }

    return (
        <View style={styles.datePickerContainer}>
            <TouchableOpacity style={styles.datePickerButton} onPress={() => setIsOpen(!isOpen)} activeOpacity={0.7}>
                <Text style={styles.datePickerButtonText}>{formatDisplayDate(selectedDate)}</Text>
                <Text style={styles.datePickerIcon}>📅</Text>
            </TouchableOpacity>

            <Modal visible={isOpen} transparent={true} animationType="slide" onRequestClose={() => setIsOpen(false)}>
                <View style={styles.datePickerModalOverlay}>
                    <View style={styles.datePickerModalContent}>
                        <View style={styles.datePickerHeader}>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <Text style={styles.datePickerCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.datePickerTitle}>Select Date</Text>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <Text style={styles.datePickerDone}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.calendarContainer}>
                            <View style={styles.monthNavigation}>
                                <TouchableOpacity
                                    style={styles.monthNavButton}
                                    onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                >
                                    <Text style={styles.monthNavButtonText}>‹</Text>
                                </TouchableOpacity>
                                <Text style={styles.monthYearText}>
                                    {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                                </Text>
                                <TouchableOpacity
                                    style={styles.monthNavButton}
                                    onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                >
                                    <Text style={styles.monthNavButtonText}>›</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.dayNamesRow}>
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                    <Text key={day} style={styles.dayNameText}>
                                        {day}
                                    </Text>
                                ))}
                            </View>

                            <View style={styles.calendarGrid}>{renderCalendar()}</View>

                            <TouchableOpacity
                                style={styles.todayButton}
                                onPress={() => {
                                    const today = new Date()
                                    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
                                    onDateChange(todayString)
                                    setCurrentMonth(today)
                                    setIsOpen(false)
                                }}
                            >
                                <Text style={styles.todayButtonText}>Today</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

// WeekInput component
export const WeekInput: React.FC<{
    weeksAgo: number
    onWeekChange: (weeks: number) => void
}> = ({ weeksAgo, onWeekChange }) => {
    const handleDecrease = () => {
        if (weeksAgo > 0) {
            onWeekChange(weeksAgo - 1)
        }
    }

    const handleIncrease = () => {
        onWeekChange(weeksAgo + 1)
    }

    const handleTextChange = (text: string) => {
        const num = Number.parseInt(text) || 0
        if (num >= 0) {
            onWeekChange(num)
        }
    }

    return (
        <View style={styles.weekStepperContainer}>
            <TouchableOpacity
                style={[styles.weekStepperButton, weeksAgo === 0 && styles.weekStepperButtonDisabled]}
                onPress={handleDecrease}
                disabled={weeksAgo === 0}
            >
                <Text style={[styles.weekStepperButtonText, weeksAgo === 0 && styles.weekStepperButtonTextDisabled]}>-</Text>
            </TouchableOpacity>

            <TextInput
                style={styles.weekStepperInput}
                value={weeksAgo.toString()}
                onChangeText={handleTextChange}
                keyboardType="number-pad"
                textAlign="center"
            />

            <TouchableOpacity style={styles.weekStepperButton} onPress={handleIncrease}>
                <Text style={styles.weekStepperButtonText}>+</Text>
            </TouchableOpacity>

            <Text style={styles.weekStepperLabel}>weeks ago</Text>
        </View>
    )
}

// MonthPicker component
export const MonthPicker: React.FC<{
    selectedMonth: string
    onMonthChange: (month: string) => void
}> = ({ selectedMonth, onMonthChange }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

    const formatDisplayMonth = (monthString: string) => {
        const [year, month] = monthString.split("-")
        const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1)
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    }

    if (Platform.OS === "web") {
        return (
            <input
                type="month"
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    border: "1px solid #e1e1e1",
                    fontSize: "14px",
                    color: "#333",
                    cursor: "pointer",
                }}
            />
        )
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    return (
        <View style={styles.monthPickerContainer}>
            <TouchableOpacity style={styles.monthPickerButton} onPress={() => setIsOpen(!isOpen)} activeOpacity={0.7}>
                <Text style={styles.monthPickerButtonText}>{formatDisplayMonth(selectedMonth)}</Text>
                <Text style={styles.monthPickerIcon}>📅</Text>
            </TouchableOpacity>

            <Modal visible={isOpen} transparent={true} animationType="slide" onRequestClose={() => setIsOpen(false)}>
                <View style={styles.monthPickerModalOverlay}>
                    <View style={styles.monthPickerModalContent}>
                        <View style={styles.monthPickerHeader}>
                            <TouchableOpacity style={styles.monthPickerHeaderButton} onPress={() => setIsOpen(false)}>
                                <Text style={styles.monthPickerCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.monthPickerTitle}>Select Month</Text>
                            <TouchableOpacity style={styles.monthPickerHeaderButton} onPress={() => setIsOpen(false)}>
                                <Text style={styles.monthPickerDone}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.monthCalendarContainer}>
                            <View style={styles.yearNavigation}>
                                <TouchableOpacity style={styles.yearNavButton} onPress={() => setCurrentYear(currentYear - 1)}>
                                    <Text style={styles.yearNavButtonText}>‹</Text>
                                </TouchableOpacity>
                                <Text style={styles.yearText}>{currentYear}</Text>
                                <TouchableOpacity style={styles.yearNavButton} onPress={() => setCurrentYear(currentYear + 1)}>
                                    <Text style={styles.yearNavButtonText}>›</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.monthGrid}>
                                {months.map((month, index) => {
                                    const monthValue = `${currentYear}-${String(index + 1).padStart(2, "0")}`
                                    const isSelected = monthValue === selectedMonth

                                    return (
                                        <TouchableOpacity
                                            key={month}
                                            style={[styles.monthGridItem, isSelected && styles.monthGridItemSelected]}
                                            onPress={() => {
                                                onMonthChange(monthValue)
                                                setIsOpen(false)
                                            }}
                                        >
                                            <Text style={[styles.monthGridItemText, isSelected && styles.monthGridItemTextSelected]}>
                                                {month}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>

                            <TouchableOpacity
                                style={styles.currentMonthButton}
                                onPress={() => {
                                    const now = new Date()
                                    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
                                    onMonthChange(currentMonth)
                                    setCurrentYear(now.getFullYear())
                                    setIsOpen(false)
                                }}
                            >
                                <Text style={styles.currentMonthButtonText}>Current Month</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

// Loading overlay component
export const LoadingOverlay: React.FC = () => (
    <View style={styles.loadingOverlay}>
        <View style={styles.loadingCard}>
            <Text style={styles.loadingOverlayText}>Loading...</Text>
        </View>
    </View>
)

// Shared food item renderer
export const renderSharedFoodItem = (
    item: FoodItem,
    openImageModal: (uri: string) => void,
    handleDeleteItem: (id: string) => void,
    startEditing: (item: FoodItem) => void,
) => {
    const formattedDate = formatDate(item.createdAt)
    const isDeleting = item.isDeleting || false

    return (
        <View style={[styles.foodCard, isDeleting && { opacity: 0.7 }]}>
            <View style={styles.foodCardHeader}>
                <Text style={styles.foodName}>{item.predictName}</Text>
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.editButton} onPress={() => startEditing(item)} disabled={isDeleting}>
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
                            <Text style={[styles.editButtonText, { color: isDeleting ? "#ccc" : "#3498db" }]}>✎</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.deleteButton, isDeleting && { opacity: 0.5 }]}
                        onPress={() => handleDeleteItem(item.id)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            Platform.OS === "web" ? (
                                <div
                                    style={{
                                        fontSize: "18px",
                                        animation: "spin 1s linear infinite",
                                        display: "inline-block",
                                    }}
                                >
                                    ⟳
                                </div>
                            ) : (
                                <Text style={[styles.deleteButtonText, { fontSize: 18 }]}>⟳</Text>
                            )
                        ) : Platform.OS === "web" ? (
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
                    disabled={isDeleting}
                >
                    <Image source={{ uri: item.publicUrl.originImage }} style={styles.thumbnailImage} resizeMode="contain" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.imageWrapper}
                    onPress={() => openImageModal(item.publicUrl.segmentationImage)}
                    activeOpacity={0.9}
                    disabled={isDeleting}
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
                <Text style={styles.commentLabel}>Notes:</Text>
                <Text style={styles.foodComment}>{item.comment ? item.comment : "No notes"}</Text>
            </View>
        </View>
    )
}

// Helper Functions
export const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${day}/${month}/${year} • ${hours}:${minutes}`
}

export const getPeriodLabel = (period: string) => {
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

// Web-specific styles
export const webModalStyles = {
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

const isWeb = Platform.OS === "web"

// Updated styles with disabled states
export const styles = StyleSheet.create({
    // Dropdown disabled states
    dropdownButtonDisabled: {
        backgroundColor: "#f5f5f5",
        borderColor: "#ddd",
    },
    dropdownButtonTextDisabled: {
        color: "#999",
    },
    dropdownIconDisabled: {
        color: "#ccc",
    },
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    animatedContainer: {
        flex: 1,
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
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#2c3e50",
    },
    headerRightSection: {
        flexDirection: "row",
        alignItems: "center",
    },
    calorieLimitContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 15,
    },
    calorieLimitLabel: {
        fontSize: 14,
        color: "#666666",
        marginRight: 5,
    },
    calorieLimitValue: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#3498db",
    },
    filterWrapper: {
        flexDirection: "row",
        alignItems: "center",
    },
    filterText: {
        fontSize: 14,
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
        minWidth: 110,
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
    sortingLabel: {
        fontSize: 14,
        color: "#666666",
        marginRight: 10,
    },
    dropdownContainer: {
        position: "relative",
    },
    dropdownButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e1e1e1",
        paddingHorizontal: 12,
        paddingVertical: 10,
        minWidth: 110,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    dropdownButtonText: {
        fontSize: 14,
        color: "#333",
        flex: 1,
        flexShrink: 0,
    },
    dropdownIcon: {
        fontSize: 12,
        color: "#666",
        marginLeft: 5,
    },
    // Modal-based dropdown styles for Android
    dropdownModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    dropdownModalContent: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        width: "80%",
        maxWidth: 300,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    dropdownModalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center",
        marginBottom: 20,
    },
    dropdownModalOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    dropdownModalOptionSelected: {
        backgroundColor: "#f0f8ff",
    },
    dropdownModalOptionText: {
        fontSize: 16,
        color: "#333",
    },
    dropdownModalOptionTextSelected: {
        color: "#3498db",
        fontWeight: "bold",
    },
    dropdownModalCheckmark: {
        fontSize: 16,
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
        height: undefined,
    },
    thumbnailImage: {
        width: "100%",
        height: undefined,
        aspectRatio: 1.33,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalBackdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    imageContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    fullImage: {
        borderRadius: 8,
        resizeMode: "contain",
    },
    closeButton: {
        position: "absolute",
        top: 50,
        right: 20,
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
        zIndex: 1000,
    },
    closeButtonText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    actionButtons: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
    },
    editButton: {
        marginRight: 8,
        padding: 4,
    },
    deleteButton: {
        padding: 4,
    },
    editButtonText: {
        fontSize: 18,
        color: "#3498db",
        fontWeight: "bold",
    },
    deleteButtonText: {
        fontSize: 18,
        color: "#e74c3c",
        fontWeight: "bold",
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
    loadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
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
    unitSelectorRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        padding: 10,
        marginHorizontal: 10,
        marginTop: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e5e5e5",
    },
    unitLabel: {
        fontSize: 14,
        color: "#666666",
        fontWeight: "500",
    },
    datePickerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        padding: 10,
        marginHorizontal: 10,
        marginTop: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e5e5e5",
    },
    dateLabel: {
        fontSize: 14,
        color: "#666666",
        fontWeight: "500",
    },
    datePickerContainer: {
        position: "relative",
    },
    datePickerButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e1e1e1",
        paddingHorizontal: 12,
        paddingVertical: 10,
        minWidth: 140,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    datePickerButtonText: {
        fontSize: 14,
        color: "#333",
        flex: 1,
    },
    datePickerIcon: {
        fontSize: 14,
        color: "#666",
        marginLeft: 5,
    },
    datePickerModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    datePickerModalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 20,
        maxHeight: "80%",
    },
    calendarContainer: {
        padding: 20,
    },
    monthNavigation: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    monthNavButton: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: "#f0f0f0",
    },
    monthNavButtonText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    monthYearText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    dayNamesRow: {
        flexDirection: "row",
        marginBottom: 10,
    },
    dayNameText: {
        flex: 1,
        textAlign: "center",
        fontSize: 12,
        fontWeight: "bold",
        color: "#666",
        paddingVertical: 5,
    },
    calendarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    calendarDay: {
        width: "14.28%",
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
        marginBottom: 2,
    },
    calendarDaySelected: {
        backgroundColor: "#3498db",
    },
    calendarDayToday: {
        backgroundColor: "#e8f4fd",
        borderWidth: 1,
        borderColor: "#3498db",
    },
    calendarDayText: {
        fontSize: 14,
        color: "#333",
    },
    calendarDayTextSelected: {
        color: "#fff",
        fontWeight: "bold",
    },
    calendarDayTextToday: {
        color: "#3498db",
        fontWeight: "bold",
    },
    calendarDayTextEmpty: {
        color: "transparent",
    },
    todayButton: {
        backgroundColor: "#3498db",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    todayButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    weekStepperContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    weekStepperButton: {
        backgroundColor: "#fff",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#e1e1e1",
        paddingHorizontal: 12,
        paddingVertical: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    weekStepperButtonDisabled: {
        backgroundColor: "#f5f5f5",
        borderColor: "#ddd",
    },
    weekStepperButtonText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    weekStepperButtonTextDisabled: {
        color: "#ccc",
    },
    weekStepperInput: {
        backgroundColor: "#fff",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#e1e1e1",
        paddingHorizontal: 8,
        paddingVertical: 8,
        width: 60,
        fontSize: 14,
        color: "#333",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    weekStepperLabel: {
        fontSize: 13,
        color: "#666",
        marginLeft: 8,
        flex: 1,
    },
    periodHeaderContainer: {
        backgroundColor: "#e8f4fd",
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#c5e1f9",
    },
    periodHeaderText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#2c3e50",
        textAlign: "center",
    },
    datePickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5",
        backgroundColor: "#fff",
    },
    datePickerCancel: {
        color: "#999",
        fontSize: 16,
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    datePickerDone: {
        color: "#3498db",
        fontSize: 16,
        fontWeight: "bold",
    },
    // Month Picker Header Styles
    monthPickerContainer: {
        position: "relative",
    },
    monthPickerButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e1e1e1",
        paddingHorizontal: 12,
        paddingVertical: 10,
        minWidth: 140,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    monthPickerButtonText: {
        fontSize: 14,
        color: "#333",
        flex: 1,
    },
    monthPickerIcon: {
        fontSize: 14,
        color: "#666",
        marginLeft: 5,
    },
    monthPickerModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    monthPickerModalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 20,
        maxHeight: "70%",
    },
    monthPickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5",
        backgroundColor: "#fff",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    monthPickerHeaderButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    monthPickerCancel: {
        color: "#999",
        fontSize: 16,
    },
    monthPickerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    monthPickerDone: {
        color: "#3498db",
        fontSize: 16,
        fontWeight: "bold",
    },
    monthCalendarContainer: {
        padding: 20,
    },
    yearNavigation: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    yearNavButton: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: "#f0f0f0",
    },
    yearNavButtonText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    yearText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    monthGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    monthGridItem: {
        width: "30%",
        aspectRatio: 2,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
        marginBottom: 10,
        backgroundColor: "#f8f9fa",
    },
    monthGridItemSelected: {
        backgroundColor: "#3498db",
    },
    monthGridItemText: {
        fontSize: 14,
        color: "#333",
        fontWeight: "500",
    },
    monthGridItemTextSelected: {
        color: "#fff",
        fontWeight: "bold",
    },
    currentMonthButton: {
        backgroundColor: "#3498db",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    currentMonthButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
})
