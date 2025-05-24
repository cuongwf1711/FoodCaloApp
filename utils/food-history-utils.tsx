"use client"

import type React from "react"

import { URL_FOOD_CALO_ESTIMATOR, URL_USER_PROFILE } from "@/constants/url_constants"
import { deleteData, getData, patchData } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import { useCallback, useEffect, useState } from "react"
import {
    ActivityIndicator,
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
    isDeleting?: boolean // Add this optional property
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

// Type for sorting options
export type SortOption = "newest" | "oldest" | "highest-calories" | "lowest-calories"

// Type for time filter
export type TimeFilter = "all" | "date"

// Type for time unit
export type TimeUnit = "day" | "week" | "month"

// Add new props for parent-controlled state
export interface FoodHistoryProps {
    sortOption?: SortOption
    onSortChange?: (sortOption: SortOption) => void
    onDataChange?: (totalCalories: number) => void
}

// API Hooks
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

    // Update sortOption when external prop changes
    useEffect(() => {
        if (externalSortOption && externalSortOption !== sortOption) {
            setSortOption(externalSortOption)
        }
    }, [externalSortOption, sortOption])

    // Notify parent of data changes
    useEffect(() => {
        if (onDataChange) {
            onDataChange(totalCalories)
        }
    }, [totalCalories, onDataChange])

    // Fetch data with time filter
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

                // Build API URL based on time unit
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

                // Fetch data using the utility function from request_context
                const response = await getData<ApiResponse>(apiUrl)

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

    // Delete food item with confirmation and loading animation
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
            // Find the item to show loading state
            const itemToDelete = foodItems.find((item) => item.id === id)
            if (!itemToDelete) return

            // Update the item to show loading state
            setFoodItems((prev) => prev.map((item) => (item.id === id ? { ...item, isDeleting: true } : item)))

            const response = await deleteData(URL_FOOD_CALO_ESTIMATOR, id)
            if (response.status === 204) {
                // Remove the item from the list
                setFoodItems((prev) => prev.filter((item) => item.id !== id))
                // Update total calories
                setTotalCalories((prev) => {
                    const deletedItem = foodItems.find((item) => item.id === id)
                    return deletedItem ? prev - deletedItem.calo : prev
                })
                // No success message needed
            }
        } catch (error) {
            console.error("Error deleting food item:", error)
            // Remove loading state on error
            setFoodItems((prev) => prev.map((item) => (item.id === id ? { ...item, isDeleting: false } : item)))
            showMessage(error)
        }
    }

    // Save edited item
    const saveEditedItem = useCallback(async (editingItem: FoodItem, calo: string, comment: string) => {
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

                return true
            }
            return false
        } catch (error) {
            console.error("Error updating food item:", error)
            setError("Failed to update food item. Please try again.")
            return false
        }
    }, [])

    // Handle sort option change
    const handleSortChange = useCallback(
        (newSortOption: SortOption, callback?: (sortOpt: SortOption) => void) => {
            // Skip if already sorting or if the option is the same
            if (isSortChanging || newSortOption === sortOption) return

            // Set loading states
            setIsSortChanging(true)
            setIsLoading(true)

            // Change the sort option
            setSortOption(newSortOption)

            // Call the callback if provided
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
        fetchFoodHistory,
        handleDeleteItem,
        saveEditedItem,
        handleSortChange,
        setFoodItems,
        setIsLoading,
        setIsRefreshing,
        setError,
    }
}

export const useUserProfile = () => {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

    // Fetch user profile data
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

// Enhanced ImageModal Component with better Android support
export const ImageModal: React.FC<{
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
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.modalBackdrop} />
                </TouchableWithoutFeedback>

                <View style={styles.modalContent} pointerEvents="box-none">
                    <TouchableWithoutFeedback>
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
                                onError={(error) => {
                                    console.log("Image load error:", error)
                                }}
                            />
                        </View>
                    </TouchableWithoutFeedback>

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
            </View>
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

export const SortingDropdown: React.FC<{
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
                    zIndex: 1000, // Added z-index for web
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
                        zIndex: 1001, // High z-index for select element
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
        <View style={[styles.dropdownContainer, { zIndex: isOpen ? 1001 : 1000 }]}>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setIsOpen(!isOpen)}>
                <Text style={styles.dropdownButtonText}>{selectedLabel}</Text>
                <Text style={styles.dropdownIcon}>{isOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {isOpen && (
                <View style={[styles.dropdownOptions, { zIndex: 1002 }]}>
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
            <div
                style={{
                    ...webDropdownStyles.container,
                    zIndex: 1000, // Added z-index for web
                }}
            >
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value as TimeFilter)}
                    style={{
                        ...webDropdownStyles.select,
                        zIndex: 1001, // High z-index for select element
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
        <View style={[styles.dropdownContainer, { zIndex: isOpen ? 1002 : 1001 }]}>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setIsOpen(!isOpen)}>
                <Text style={styles.dropdownButtonText}>{selectedLabel}</Text>
                <Text style={styles.dropdownIcon}>{isOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {isOpen && (
                <View style={[styles.dropdownOptions, { zIndex: 1003 }]}>
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
            <div
                style={{
                    position: "relative",
                    minWidth: "120px",
                }}
            >
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

export const DatePicker: React.FC<{
    selectedDate: string
    onDateChange: (date: string) => void
}> = ({ selectedDate, onDateChange }) => {
    const [showNativePicker, setShowNativePicker] = useState(false)

    // Format date for display
    const formatDisplayDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr)
            if (isNaN(date.getTime())) {
                const today = new Date()
                return `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1)
                    .toString()
                    .padStart(2, "0")}/${today.getFullYear()}`
            }
            const day = date.getDate().toString().padStart(2, "0")
            const month = (date.getMonth() + 1).toString().padStart(2, "0")
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
        } catch (error) {
            const today = new Date()
            return `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1)
                .toString()
                .padStart(2, "0")}/${today.getFullYear()}`
        }
    }

    // Convert date to UTC format for API
    const convertToUTCFormat = (dateStr: string) => {
        try {
            const date = new Date(dateStr)
            if (isNaN(date.getTime())) {
                const today = new Date()
                return `${today.getUTCFullYear()}-${(today.getUTCMonth() + 1).toString().padStart(2, "0")}-${today
                    .getUTCDate()
                    .toString()
                    .padStart(2, "0")}`
            }
            return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date
                .getUTCDate()
                .toString()
                .padStart(2, "0")}`
        } catch (error) {
            const today = new Date()
            return `${today.getUTCFullYear()}-${(today.getUTCMonth() + 1).toString().padStart(2, "0")}-${today
                .getUTCDate()
                .toString()
                .padStart(2, "0")}`
        }
    }

    // Handle date change
    const handleDateChange = (event: any, date?: Date) => {
        setShowNativePicker(false)
        if (date) {
            const utcDate = convertToUTCFormat(date.toISOString())
            onDateChange(utcDate)
        }
    }

    // Handle web date input change
    const handleWebDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputDate = e.target.value
        if (inputDate) {
            const utcDate = convertToUTCFormat(inputDate)
            onDateChange(utcDate)
        } else {
            const today = new Date()
            const utcToday = convertToUTCFormat(today.toISOString())
            onDateChange(utcToday)
        }
    }

    // For web platform
    if (Platform.OS === "web") {
        return (
            <div style={{ position: "relative" }}>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={handleWebDateChange}
                    style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#fff",
                        border: "1px solid #e1e1e1",
                        fontSize: "14px",
                        color: "#333",
                        cursor: "pointer",
                        minWidth: "140px",
                    }}
                />
            </div>
        )
    }

    // For native platforms
    return (
        <View style={styles.datePickerContainer}>
            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowNativePicker(true)}>
                <Text style={styles.datePickerButtonText}>{formatDisplayDate(selectedDate)}</Text>
                <Text style={styles.datePickerIcon}>📅</Text>
            </TouchableOpacity>

            {Platform.OS === "ios" || Platform.OS === "android"
                ? showNativePicker && (
                    <Modal
                        transparent={true}
                        animationType="slide"
                        visible={showNativePicker}
                        onRequestClose={() => setShowNativePicker(false)}
                    >
                        <TouchableOpacity
                            style={styles.datePickerModalOverlay}
                            activeOpacity={1}
                            onPress={() => setShowNativePicker(false)}
                        >
                            <View style={styles.datePickerModalContent}>
                                {Platform.OS === "ios" && (
                                    <View style={styles.datePickerHeader}>
                                        <TouchableOpacity onPress={() => setShowNativePicker(false)}>
                                            <Text style={styles.datePickerCancel}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowNativePicker(false)
                                            }}
                                        >
                                            <Text style={styles.datePickerDone}>Done</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View style={styles.datePickerPlaceholder}>
                                    <Text>Date Picker Would Appear Here</Text>
                                    <Text>Selected: {formatDisplayDate(selectedDate)}</Text>

                                    <View style={styles.datePickerButtonRow}>
                                        <TouchableOpacity
                                            style={styles.datePickerActionButton}
                                            onPress={() => {
                                                const date = new Date(selectedDate)
                                                date.setDate(date.getDate() - 1)
                                                const utcDate = convertToUTCFormat(date.toISOString())
                                                onDateChange(utcDate)
                                                setShowNativePicker(false)
                                            }}
                                        >
                                            <Text style={styles.datePickerActionButtonText}>Previous Day</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.datePickerActionButton}
                                            onPress={() => {
                                                const date = new Date(selectedDate)
                                                date.setDate(date.getDate() + 1)
                                                const utcDate = convertToUTCFormat(date.toISOString())
                                                onDateChange(utcDate)
                                                setShowNativePicker(false)
                                            }}
                                        >
                                            <Text style={styles.datePickerActionButtonText}>Next Day</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.datePickerActionButton, styles.datePickerTodayButton]}
                                        onPress={() => {
                                            const today = new Date()
                                            const utcToday = convertToUTCFormat(today.toISOString())
                                            onDateChange(utcToday)
                                            setShowNativePicker(false)
                                        }}
                                    >
                                        <Text style={styles.datePickerActionButtonText}>Today</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Modal>
                )
                : null}
        </View>
    )
}

export const WeekInput: React.FC<{
    weeksAgo: number
    onWeekChange: (weeks: number) => void
}> = ({ weeksAgo, onWeekChange }) => {
    const [inputValue, setInputValue] = useState(weeksAgo.toString())

    const handleChange = (value: string) => {
        setInputValue(value)
        const numValue = Number.parseInt(value, 10)
        if (!isNaN(numValue) && numValue >= 0) {
            onWeekChange(numValue)
        } else {
            onWeekChange(0)
        }
    }

    if (Platform.OS === "web") {
        return (
            <div style={{ display: "flex", alignItems: "center" }}>
                <input
                    type="number"
                    min="0"
                    value={inputValue}
                    onChange={(e) => handleChange(e.target.value)}
                    style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#fff",
                        border: "1px solid #e1e1e1",
                        fontSize: "14px",
                        color: "#333",
                        width: "80px",
                        marginRight: "8px",
                    }}
                />
                <span style={{ fontSize: "14px", color: "#666" }}>
                    {weeksAgo === 0 ? "Current week" : weeksAgo === 1 ? "Last week" : `${weeksAgo} weeks ago`}
                </span>
            </div>
        )
    }

    return (
        <View style={styles.weekInputContainer}>
            <TextInput
                style={styles.weekInput}
                value={inputValue}
                onChangeText={handleChange}
                keyboardType="numeric"
                placeholder="0"
            />
            <Text style={styles.weekInputLabel}>
                {weeksAgo === 0 ? "Current week" : weeksAgo === 1 ? "Last week" : `${weeksAgo} weeks ago`}
            </Text>
        </View>
    )
}

export const MonthPicker: React.FC<{
    selectedMonth: string
    onMonthChange: (month: string) => void
}> = ({ selectedMonth, onMonthChange }) => {
    const [showNativePicker, setShowNativePicker] = useState(false)

    const formatDisplayMonth = (monthStr: string) => {
        try {
            const [year, month] = monthStr.split("-")
            const monthNames = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ]
            return `${monthNames[Number.parseInt(month, 10) - 1]} ${year}`
        } catch (error) {
            const today = new Date()
            const monthNames = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ]
            return `${monthNames[today.getMonth()]} ${today.getFullYear()}`
        }
    }

    const handleWebMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputMonth = e.target.value
        if (inputMonth) {
            onMonthChange(inputMonth)
        } else {
            const today = new Date()
            const currentMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`
            onMonthChange(currentMonth)
        }
    }

    if (Platform.OS === "web") {
        return (
            <div style={{ position: "relative" }}>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={handleWebMonthChange}
                    style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#fff",
                        border: "1px solid #e1e1e1",
                        fontSize: "14px",
                        color: "#333",
                        cursor: "pointer",
                        minWidth: "140px",
                    }}
                />
            </div>
        )
    }

    return (
        <View style={styles.monthPickerContainer}>
            <TouchableOpacity style={styles.monthPickerButton} onPress={() => setShowNativePicker(true)}>
                <Text style={styles.monthPickerButtonText}>{formatDisplayMonth(selectedMonth)}</Text>
                <Text style={styles.monthPickerIcon}>📅</Text>
            </TouchableOpacity>

            {Platform.OS === "ios" || Platform.OS === "android"
                ? showNativePicker && (
                    <Modal
                        transparent={true}
                        animationType="slide"
                        visible={showNativePicker}
                        onRequestClose={() => setShowNativePicker(false)}
                    >
                        <TouchableOpacity
                            style={styles.monthPickerModalOverlay}
                            activeOpacity={1}
                            onPress={() => setShowNativePicker(false)}
                        >
                            <View style={styles.monthPickerModalContent}>
                                {Platform.OS === "ios" && (
                                    <View style={styles.monthPickerHeader}>
                                        <TouchableOpacity onPress={() => setShowNativePicker(false)}>
                                            <Text style={styles.monthPickerCancel}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowNativePicker(false)
                                            }}
                                        >
                                            <Text style={styles.monthPickerDone}>Done</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View style={styles.monthPickerPlaceholder}>
                                    <Text>Month Picker Would Appear Here</Text>
                                    <Text>Selected: {formatDisplayMonth(selectedMonth)}</Text>

                                    <View style={styles.monthPickerButtonRow}>
                                        <TouchableOpacity
                                            style={styles.monthPickerActionButton}
                                            onPress={() => {
                                                const [year, month] = selectedMonth.split("-")
                                                let newMonth = Number.parseInt(month, 10) - 1
                                                let newYear = Number.parseInt(year, 10)
                                                if (newMonth < 1) {
                                                    newMonth = 12
                                                    newYear--
                                                }
                                                const newMonthStr = `${newYear}-${newMonth.toString().padStart(2, "0")}`
                                                onMonthChange(newMonthStr)
                                                setShowNativePicker(false)
                                            }}
                                        >
                                            <Text style={styles.monthPickerActionButtonText}>Previous Month</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.monthPickerActionButton}
                                            onPress={() => {
                                                const [year, month] = selectedMonth.split("-")
                                                let newMonth = Number.parseInt(month, 10) + 1
                                                let newYear = Number.parseInt(year, 10)
                                                if (newMonth > 12) {
                                                    newMonth = 1
                                                    newYear++
                                                }
                                                const newMonthStr = `${newYear}-${newMonth.toString().padStart(2, "0")}`
                                                onMonthChange(newMonthStr)
                                                setShowNativePicker(false)
                                            }}
                                        >
                                            <Text style={styles.monthPickerActionButtonText}>Next Month</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.monthPickerActionButton, styles.monthPickerCurrentButton]}
                                        onPress={() => {
                                            const today = new Date()
                                            const currentMonth = `${today.getFullYear()}-${(today.getMonth() + 1)
                                                .toString()
                                                .padStart(2, "0")}`
                                            onMonthChange(currentMonth)
                                            setShowNativePicker(false)
                                        }}
                                    >
                                        <Text style={styles.monthPickerActionButtonText}>Current Month</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Modal>
                )
                : null}
        </View>
    )
}

export const LoadingOverlay = () => {
    return (
        <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingOverlayText}>Loading data...</Text>
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

export const webDropdownStyles = {
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

const isWeb = Platform.OS === "web"

// Updated styles with fixes for ImageModal
export const styles = StyleSheet.create({
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
        minWidth: 120,
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
        zIndex: 1000, // Increased z-index
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
        elevation: 8, // Increased elevation for Android
        zIndex: 1001, // Higher z-index for dropdown options
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
    // Enhanced modal styles for better Android support
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
        zIndex: 100,
    },
    datePickerButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e1e1e1",
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 140,
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
        padding: 20,
    },
    datePickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5",
    },
    datePickerCancel: {
        color: "#999",
        fontSize: 16,
    },
    datePickerDone: {
        color: "#3498db",
        fontSize: 16,
        fontWeight: "bold",
    },
    datePickerPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 30,
    },
    datePickerButtonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
        width: "100%",
    },
    datePickerActionButton: {
        backgroundColor: "#f0f0f0",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginHorizontal: 5,
    },
    datePickerTodayButton: {
        backgroundColor: "#3498db",
        marginTop: 15,
        width: "100%",
        alignItems: "center",
    },
    datePickerActionButtonText: {
        color: "#333",
        fontSize: 14,
        fontWeight: "500",
    },
    weekInputRow: {
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
    weekLabel: {
        fontSize: 14,
        color: "#666666",
        fontWeight: "500",
    },
    weekInputContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    weekInput: {
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e1e1e1",
        paddingHorizontal: 12,
        paddingVertical: 8,
        width: 80,
        marginRight: 8,
        fontSize: 14,
        color: "#333",
    },
    weekInputLabel: {
        fontSize: 14,
        color: "#666",
    },
    monthPickerRow: {
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
    monthLabel: {
        fontSize: 14,
        color: "#666666",
        fontWeight: "500",
    },
    monthPickerContainer: {
        position: "relative",
        zIndex: 100,
    },
    monthPickerButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e1e1e1",
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 140,
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
        padding: 20,
    },
    monthPickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5",
    },
    monthPickerCancel: {
        color: "#999",
        fontSize: 16,
    },
    monthPickerDone: {
        color: "#3498db",
        fontSize: 16,
        fontWeight: "bold",
    },
    monthPickerPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 30,
    },
    monthPickerButtonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
        width: "100%",
    },
    monthPickerActionButton: {
        backgroundColor: "#f0f0f0",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginHorizontal: 5,
    },
    monthPickerCurrentButton: {
        backgroundColor: "#3498db",
        marginTop: 15,
        width: "100%",
        alignItems: "center",
    },
    monthPickerActionButtonText: {
        color: "#333",
        fontSize: 14,
        fontWeight: "500",
    },
    periodHeaderContainer: {
        backgroundColor: "#e8f4fd",
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginHorizontal: 10,
        marginTop: 10,
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
})
