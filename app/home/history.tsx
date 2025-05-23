"use client"

import type React from "react"

import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useState } from "react"
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native"

// Import shared utilities
import {
    FilterDropdown,
    getPeriodLabel,
    styles as sharedStyles,
    SortingDropdown,
    useUserProfile,
    type SortOption,
    type TimeFilter,
} from "@/utils/food-history-utils"

// Import the different view components
import FoodHistoryAllView from "./food-history-all"
import FoodHistoryDateView from "./food-history-date"

/**
 * Food History Screen - Main container for food history views
 * Manages filtering, sorting, and view transitions
 */
const FoodHistoryScreen: React.FC = () => {
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("all")
    const [fadeAnim] = useState(new Animated.Value(1))
    const [slideAnim] = useState(new Animated.Value(0))
    const [currentView, setCurrentView] = useState<TimeFilter>("all")

    // Add state for shared data
    const [totalCalories, setTotalCalories] = useState(0)
    const [sortOption, setSortOption] = useState<SortOption>("newest")

    // Add these to the existing state declarations
    const [sortAnim] = useState(new Animated.Value(1))
    const [sortRotateAnim] = useState(new Animated.Value(0))

    // Use shared hook for user profile
    const { userProfile, fetchUserProfile } = useUserProfile()

    // Handle data change from child components
    const handleDataChange = useCallback((calories: number) => {
        setTotalCalories(calories)
    }, [])

    // Replace the handleSortChange function with this animated version
    const handleSortChange = useCallback((newSortOption: SortOption) => {
        // Start animation
        Animated.sequence([
            Animated.parallel([
                Animated.timing(sortAnim, {
                    toValue: 0.9,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(sortRotateAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(sortAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start()

        // Update sort option
        setSortOption(newSortOption)
    }, [])

    // Fetch user profile on mount
    useEffect(() => {
        fetchUserProfile()
    }, [fetchUserProfile])

    // Handle filter change with animation
    const handleFilterChange = (newFilter: TimeFilter) => {
        // Start fade out animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.timing(slideAnim, {
                toValue: -50,
                duration: 250,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
        ]).start(() => {
            // Change the view after fade out
            setTimeFilter(newFilter)
            setCurrentView(newFilter)

            // Reset slide position for next animation
            slideAnim.setValue(50)

            // Start fade in animation
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.ease),
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.ease),
                }),
            ]).start()
        })
    }

    // Render the appropriate view based on the selected filter
    const renderFilterView = () => {
        switch (currentView) {
            case "date":
                return (
                    <FoodHistoryDateView
                        sortOption={sortOption}
                        onSortChange={handleSortChange}
                        onDataChange={handleDataChange}
                    />
                )
            default:
                return (
                    <FoodHistoryAllView sortOption={sortOption} onSortChange={handleSortChange} onDataChange={handleDataChange} />
                )
        }
    }

    return (
        <View style={sharedStyles.container}>
            <StatusBar style="dark" />

            {/* Redesigned header section - more compact and integrated */}
            <View style={styles.headerContainer}>
                {/* First row: Title, Calorie Limit, and Filter */}
                <View style={styles.headerTopRow}>
                    <Text style={styles.headerTitle}>Food History</Text>

                    <View style={styles.headerMiddleSection}>
                        <Text style={styles.calorieLimitLabel}>Calorie Limit:</Text>
                        <Text style={styles.calorieLimitValue}>
                            {userProfile
                                ? `${userProfile.calorieLimit} / ${getPeriodLabel(userProfile.calorieLimitPeriod)}`
                                : "Loading..."}
                        </Text>
                    </View>

                    <View style={styles.filterSection}>
                        <Text style={styles.filterLabel}>Filter by:</Text>
                        <View style={styles.filterDropdownWrapper}>
                            <FilterDropdown value={timeFilter} onChange={handleFilterChange} />
                        </View>
                    </View>
                </View>

                {/* Second row: Total Calories and Sort by */}
                <View style={styles.headerBottomRow}>
                    <View style={styles.totalCaloriesSection}>
                        <Text style={styles.totalCaloriesLabel}>Total Calories:</Text>
                        <Text style={styles.totalCaloriesValue}>{totalCalories}</Text>
                    </View>

                    <View style={styles.sortingSection}>
                        <Text style={styles.sortingLabel}>Sort by:</Text>
                        <View style={styles.sortingDropdownWrapper}>
                            <SortingDropdown value={sortOption} onChange={handleSortChange} />
                        </View>
                    </View>
                </View>
            </View>

            <Animated.View
                style={[
                    styles.animatedContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {renderFilterView()}
            </Animated.View>
        </View>
    )
}

const isWeb = Platform.OS === "web"

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5E5",
        paddingTop: isWeb ? 20 : 60,
        paddingBottom: 10,
        paddingHorizontal: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 12,
    },
    headerBottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        padding: 10,
        marginTop: 4,
        borderWidth: 1,
        borderColor: "#E5E5E5",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#2c3e50",
        flex: 1,
    },
    headerMiddleSection: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
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
    filterSection: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        justifyContent: "flex-end",
    },
    filterLabel: {
        fontSize: 14,
        color: "#666666",
        marginRight: 8,
    },
    filterDropdownWrapper: {
        minWidth: 120,
    },
    totalCaloriesSection: {
        flexDirection: "row",
        alignItems: "center",
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
    sortingSection: {
        flexDirection: "row",
        alignItems: "center",
    },
    sortingLabel: {
        fontSize: 14,
        color: "#666666",
        marginRight: 8,
    },
    sortingDropdownWrapper: {
        minWidth: 140,
    },
    animatedContainer: {
        flex: 1,
    },
})

export default FoodHistoryScreen
