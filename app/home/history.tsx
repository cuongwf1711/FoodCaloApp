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

      {/* Fixed header section with better layout and higher z-index */}
      <View style={styles.headerContainer}>

        {/* Info and controls row */}
        <View style={styles.controlsContainer}>
          {/* First row: Calorie info */}
          <View style={styles.leftSection}>
            <View style={styles.calorieLimitSection}>
              <Text style={styles.sectionLabel}>Limit:</Text>
              <Text style={styles.calorieLimitValue} numberOfLines={1}>
                {userProfile
                  ? `${userProfile.calorieLimit}/${getPeriodLabel(userProfile.calorieLimitPeriod)}`
                  : "Loading..."}
              </Text>
            </View>
            <View style={styles.totalCaloriesSection}>
              <Text style={styles.sectionLabel}>Total:</Text>
              <Text style={styles.totalCaloriesValue}>{totalCalories}</Text>
            </View>
          </View>

          {/* Second row: Controls with proper spacing and z-index */}
          <View style={styles.rightSection}>
            <View style={styles.filterSection}>
              <Text style={styles.sectionLabel}>Filter:</Text>
              <View style={styles.dropdownWrapper}>
                <FilterDropdown value={timeFilter} onChange={handleFilterChange} />
              </View>
            </View>
            <View style={styles.sortSection}>
              <Text style={styles.sectionLabel}>Sort:</Text>
              <View style={styles.dropdownWrapper}>
                <SortingDropdown value={sortOption} onChange={handleSortChange} />
              </View>
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
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 1000, // Ensure header is above other elements
  },
  titleRow: {
    marginBottom: 12,
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
  },
  controlsContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    zIndex: 999, // High z-index for controls container
  },
  leftSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rightSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 998, // Ensure right section is properly layered
  },
  calorieLimitSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  totalCaloriesSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  filterSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    zIndex: 1002, // Higher z-index for filter dropdown
  },
  sortSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    zIndex: 1001, // High z-index for sort dropdown
  },
  sectionLabel: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "600",
    marginRight: 6,
  },
  calorieLimitValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#3498db",
  },
  totalCaloriesValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#e74c3c",
  },
  dropdownWrapper: {
    minWidth: 100,
    maxWidth: 120,
    zIndex: 1000, // Ensure dropdown wrapper has high z-index
  },
  animatedContainer: {
    flex: 1,
    zIndex: 1, // Lower z-index for content area
  },
})

export default FoodHistoryScreen
