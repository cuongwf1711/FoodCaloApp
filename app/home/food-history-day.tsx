"use client"

import type React from "react"

import { URL_FOOD_CALO_ESTIMATOR, URL_USER_PROFILE } from "@/constants/url_constants"
import { getData } from "@/context/request_context"
import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native"

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

const FoodHistoryDayView: React.FC = () => {
    const [foodItems, setFoodItems] = useState<FoodItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [totalCalories, setTotalCalories] = useState(0)
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

    // Fetch data with day filter
    const fetchFoodHistory = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)

            // Fetch data using the utility function from request_context with day filter
            const response = await getData<ApiResponse>(`${URL_FOOD_CALO_ESTIMATOR}?timeFilter=day`)

            setFoodItems(response.data.results)
            setTotalCalories(response.data.totalCalories)
        } catch (err) {
            setError("Failed to load food history. Please try again.")
            console.error("Error fetching food history:", err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Initial data load
    useEffect(() => {
        fetchFoodHistory()
        fetchUserProfile()
    }, [fetchFoodHistory, fetchUserProfile])

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

    // Render empty state
    const renderEmpty = useCallback(() => {
        if (isLoading) return null

        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No food history found for today</Text>
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
                <Text style={styles.loadingText}>Loading daily food history...</Text>
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

            <View style={styles.calorieInfoContainer}>
                <View style={styles.calorieRow}>
                    <Text style={styles.totalCaloriesLabel}>Today's Calories:</Text>
                    <Text style={styles.totalCaloriesValue}>{totalCalories}</Text>
                </View>
            </View>

            <FlatList
                data={foodItems}
                renderItem={({ item }) => (
                    <View style={styles.foodCard}>
                        <View style={styles.foodCardHeader}>
                            <Text style={styles.foodName}>{item.predictName}</Text>
                        </View>
                        <Text style={styles.foodCalories}>{item.calo} calories</Text>
                        <Text style={styles.foodDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmpty}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
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
    foodDate: {
        fontSize: 14,
        color: "#666",
        marginBottom: 8,
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
})

export default FoodHistoryDayView
