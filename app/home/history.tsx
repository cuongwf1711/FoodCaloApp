"use client"

import type React from "react"

import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useState } from "react"
import { Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native"

// Import the different view components
import FoodHistoryDayView from "./food-history-day"
import FoodHistoryMonthView from "./food-history-month"
import FoodHistoryNoneView from "./food-history-none"
import FoodHistoryWeekView from "./food-history-week"

// Import necessary constants and functions
import { URL_USER_PROFILE } from "@/constants/url_constants"
import { getData } from "@/context/request_context"

// Type for time filter
type TimeFilter = "none" | "day" | "week" | "month"

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
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("none")
    const [userProfile, setUserProfile] = useState<{ calorieLimit: number; calorieLimitPeriod: string } | null>(null)
    const [fadeAnim] = useState(new Animated.Value(1))
    const [slideAnim] = useState(new Animated.Value(0))
    const [currentView, setCurrentView] = useState<TimeFilter>("none")

    // Fetch user profile data
    const fetchUserProfile = useCallback(async () => {
        try {
            const response = await getData(URL_USER_PROFILE)
            setUserProfile(response.data)
        } catch (error) {
            console.error("Error fetching user profile:", error)
        }
    }, [])

    useEffect(() => {
        fetchUserProfile()
    }, [fetchUserProfile])

    // Add this helper function inside the FoodHistoryScreen component
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
            case "day":
                return <FoodHistoryDayView />
            case "week":
                return <FoodHistoryWeekView />
            case "month":
                return <FoodHistoryMonthView />
            default:
                return <FoodHistoryNoneView />
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Update the header section to combine Food History and Filter in one row */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Food History</Text>
                    <View style={styles.headerRightSection}>
                        <View style={styles.calorieLimitContainer}>
                            <Text style={styles.calorieLimitLabel}>Calorie Limit:</Text>
                            <Text style={styles.calorieLimitValue}>
                                {userProfile
                                    ? `${userProfile.calorieLimit} / ${getPeriodLabel(userProfile.calorieLimitPeriod)}`
                                    : "Loading..."}
                            </Text>
                        </View>
                        <View style={styles.filterWrapper}>
                            <Text style={styles.filterText}>Filter by:</Text>
                            <FilterDropdown value={timeFilter} onChange={handleFilterChange} />
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

// Web-specific styles
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

const isWeb = Platform.OS === "web"

const styles = StyleSheet.create({
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
})

export default FoodHistoryScreen
