"use client"

import type React from "react"

import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useRef, useState } from "react"
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

// Format decimal number for display - truncate if too long
const formatDecimalDisplay = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return "..."
  }
  const str = value.toString()
  // If number is too long, show with limited decimal places
  if (str.length > 10) {
    if (value >= 1000000) {
      return value.toExponential(2)
    } else {
      return value.toFixed(2)
    }
  }
  return str
}

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

  // Track if we have any data to determine if dropdowns should be disabled
  const [hasData, setHasData] = useState(true)

  // Simple animation states for dropdowns
  const [sortScaleAnim] = useState(new Animated.Value(1))
  const [filterScaleAnim] = useState(new Animated.Value(1))

  // Use shared hook for user profile
  const { userProfile, fetchUserProfile } = useUserProfile()

  // FIXED: Use ref to track refresh state and prevent double calls
  const isRefreshingRef = useRef(false)
  const childRefreshTriggerRef = useRef<(() => void) | undefined>(undefined)

  // FIXED: Improved data change handler without race conditions
  const handleDataChange = useCallback((calories: number, itemCount?: number) => {

    // Use functional updates to prevent race conditions
    setTotalCalories((prevCalories) => {
      return calories
    })

    // Determine if we have data based on calories or item count
    const hasDataNow = calories > 0 || (itemCount !== undefined && itemCount > 0)
    setHasData(hasDataNow)
  }, [])

  // FIXED: Improved tab reload without double API calls
  const { isReloading, animatedStyle } = useTabReload("history", {
    onReload: async () => {
      // Prevent double refresh
      if (isRefreshingRef.current) {
        return
      }

      isRefreshingRef.current = true

      try {
        // Reset filters and UI state but NOT totalCalories
        setTimeFilter("all")
        setCurrentView("all")
        setSortOption("newest")
        setHasData(true)

        // Reset animations smoothly
        fadeAnim.setValue(1)
        slideAnim.setValue(0)
        sortScaleAnim.setValue(1)
        filterScaleAnim.setValue(1)

        // Refresh user profile
        await fetchUserProfile()

        // FIXED: Use ref to trigger child refresh instead of state change
        if (childRefreshTriggerRef.current) {
          childRefreshTriggerRef.current()
        }
      } finally {
        // Reset refresh flag after a short delay
        setTimeout(() => {
          isRefreshingRef.current = false
        }, 500)
      }
    },
  })

  // Enhanced sort change handler with scroll to top and scale animation
  const handleSortChange = useCallback(
    (newSortOption: SortOption) => {
      // Don't allow sort change if no data or if refreshing
      if (!hasData || isRefreshingRef.current) return


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
    },
    [sortScaleAnim, hasData],
  )

  // FIXED: Simplified filter change handler without complex animations during refresh
  const handleFilterChange = (newFilter: TimeFilter) => {
    // Don't allow filter change during refresh
    if (isRefreshingRef.current) return


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

    // Simplified view transition without complex animations
    setTimeFilter(newFilter)
    setCurrentView(newFilter)
  }

  // Fetch user profile on mount
  useEffect(() => {
    fetchUserProfile()
  }, [fetchUserProfile])

  // FIXED: Simplified data change handler
  const enhancedDataChange = useCallback(
    (calories: number, items?: any[]) => {
      const itemCount = items ? items.length : 0
      handleDataChange(calories, itemCount)
    },
    [handleDataChange],
  )

  // FIXED: Register refresh trigger function
  const registerChildRefreshTrigger = useCallback((triggerFn: () => void) => {
    childRefreshTriggerRef.current = triggerFn
  }, [])

  // Render the appropriate view based on the selected filter
  const renderFilterView = () => {
    switch (currentView) {
      case "date":
        return (
          <FoodHistoryDateView
            sortOption={sortOption}
            onSortChange={handleSortChange}
            onDataChange={enhancedDataChange}
            onRegisterRefreshTrigger={registerChildRefreshTrigger}
          />
        )
      default:
        return (
          <FoodHistoryAllView
            sortOption={sortOption}
            onSortChange={handleSortChange}
            onDataChange={enhancedDataChange}
            onRegisterRefreshTrigger={registerChildRefreshTrigger}
          />
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
                <Text style={styles.calorieLimitValue} numberOfLines={1} adjustsFontSizeToFit>
                  {userProfile
                    ? `${formatDecimalDisplay(userProfile.calorieLimit)} / ${getPeriodLabel(userProfile.calorieLimitPeriod)}`
                    : "Loading..."}
                </Text>
              </View>
              <View style={styles.totalCaloriesSection}>
                <Text style={styles.sectionLabel}>Total Calo:</Text>
                <Text style={styles.totalCaloriesValue} numberOfLines={1} adjustsFontSizeToFit>
                  {formatDecimalDisplay(totalCalories)}
                </Text>
              </View>
            </View>

            {/* Second row: Enhanced animated controls with disabled states */}
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
                      opacity: hasData ? 1 : 0.5,
                    },
                  ]}
                >
                  <View style={styles.dropdownWrapper}>
                    <SortingDropdown value={sortOption} onChange={handleSortChange} disabled={!hasData} />
                  </View>
                </Animated.View>
              </View>
            </View>
          </View>
        </View>

        {/* FIXED: Stable container without unnecessary re-renders */}
        <View style={styles.animatedContainer}>{renderFilterView()}</View>
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
    zIndex: 1000,
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
    zIndex: 999,
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
    zIndex: 998,
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
    flexShrink: 1,
    justifyContent: "flex-end",
  },
  filterSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    zIndex: 1002,
  },
  sortSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    zIndex: 1001,
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
    zIndex: 1000,
  },
  animatedDropdownWrapper: {
    zIndex: 1000,
  },
  animatedContainer: {
    flex: 1,
    zIndex: 1,
  },
})

export default FoodHistoryScreen
