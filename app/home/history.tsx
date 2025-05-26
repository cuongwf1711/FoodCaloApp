"use client"

import type React from "react"

import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useState } from "react"
import { Animated, Easing, StyleSheet, Text, View } from "react-native"

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
import { useTabReload } from "@/hooks/use-tab-reload"
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

  // Simple animation states for dropdowns
  const [sortScaleAnim] = useState(new Animated.Value(1))
  const [filterScaleAnim] = useState(new Animated.Value(1))

  // Use shared hook for user profile
  const { userProfile, fetchUserProfile } = useUserProfile()

  // Use tab reload hook
  const { isReloading, animatedStyle } = useTabReload("history", {
    onReload: async () => {
      // Reset filters and reload data
      setTimeFilter("all")
      setCurrentView("all")
      setSortOption("newest")
      setTotalCalories(0)

      // Reset animations
      fadeAnim.setValue(1)
      slideAnim.setValue(0)
      sortScaleAnim.setValue(1)
      filterScaleAnim.setValue(1)

      // Refresh user profile
      await fetchUserProfile()

    },
  })

  // Handle data change from child components
  const handleDataChange = useCallback((calories: number) => {
    setTotalCalories(calories)
  }, [])

  // Simple sort change handler with scale animation
  const handleSortChange = useCallback((newSortOption: SortOption) => {
    // Simple scale animation
    Animated.sequence([
      Animated.timing(sortScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(sortScaleAnim, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
      Animated.timing(sortScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start()

    // Update sort option
    setSortOption(newSortOption)
  }, [])

  // Simple filter change handler with scale animation
  const handleFilterChange = (newFilter: TimeFilter) => {
    // Simple scale animation for filter dropdown
    Animated.sequence([
      Animated.timing(filterScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(filterScaleAnim, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
      Animated.timing(filterScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start()

    // View transition animation (unchanged)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start(() => {
      // Change the view after fade out
      setTimeFilter(newFilter)
      setCurrentView(newFilter)

      // Reset slide position for next animation
      slideAnim.setValue(30)

      // Fade in animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.2)),
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.1)),
        }),
      ]).start()
    })
  }

  // Fetch user profile on mount
  useEffect(() => {
    fetchUserProfile()
  }, [fetchUserProfile])

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
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <View style={sharedStyles.container}>
        <StatusBar style="dark" />

        {/* Fixed header section with better layout and higher z-index */}
        <View style={styles.headerContainer}>

          {/* Info and controls row */}
          <View style={styles.controlsContainer}>
            {/* First row: Calorie info */}
            <View style={styles.leftSection}>
              <View style={styles.calorieLimitSection}>
                <Text style={styles.sectionLabel}>Calo Limit:</Text>
                <Text style={styles.calorieLimitValue} numberOfLines={1}>
                  {userProfile
                    ? `${userProfile.calorieLimit ?? "..."}/${getPeriodLabel(userProfile.calorieLimitPeriod)}`
                    : "Loading..."}
                </Text>
              </View>
              <View style={styles.totalCaloriesSection}>
                <Text style={styles.sectionLabel}>Total Calo:</Text>
                <Text style={styles.totalCaloriesValue}>{totalCalories}</Text>
              </View>
            </View>

            {/* Second row: Simple animated controls */}
            <View style={styles.rightSection}>
              <View style={styles.filterSection}>
                <Text style={styles.sectionLabel}>Filter:</Text>
                <Animated.View
                  style={[
                    styles.animatedDropdownWrapper,
                    {
                      transform: [{ scale: filterScaleAnim }],
                    },
                  ]}
                >
                  <View style={styles.dropdownWrapper}>
                    <FilterDropdown value={timeFilter} onChange={handleFilterChange} />
                  </View>
                </Animated.View>
              </View>
              <View style={styles.sortSection}>
                <Text style={styles.sectionLabel}>Sort:</Text>
                <Animated.View
                  style={[
                    styles.animatedDropdownWrapper,
                    {
                      transform: [{ scale: sortScaleAnim }],
                    },
                  ]}
                >
                  <View style={styles.dropdownWrapper}>
                    <SortingDropdown value={sortOption} onChange={handleSortChange} />
                  </View>
                </Animated.View>
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
    </Animated.View>
  )
}

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
  reloadingContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  reloadingText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
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
  animatedDropdownWrapper: {
    zIndex: 1000,
  },
  animatedContainer: {
    flex: 1,
    zIndex: 1, // Lower z-index for content area
  },
})

export default FoodHistoryScreen
