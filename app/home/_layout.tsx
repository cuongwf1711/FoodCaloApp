"use client"

// App layout with tab navigation and reload functionality
import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Tabs, usePathname, useRouter } from "expo-router"
import { useContext, useRef } from "react"
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native"

import { CHANGE_PASSWORD_ROUTE, HOME_ROUTE, SIGNIN_ROUTE } from "@/constants/router_constants"
import { ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL } from "@/constants/token_constants"
import { AuthContext } from "@/context/AuthContext"

// Create a global event emitter for tab reload events
class TabReloadEmitter {
    private listeners: { [key: string]: (() => void)[] } = {}

    subscribe(tabName: string, callback: () => void) {
        if (!this.listeners[tabName]) {
            this.listeners[tabName] = []
        }
        this.listeners[tabName].push(callback)

        // Return unsubscribe function
        return () => {
            this.listeners[tabName] = this.listeners[tabName].filter((cb) => cb !== callback)
        }
    }

    emit(tabName: string) {
        if (this.listeners[tabName]) {
            this.listeners[tabName].forEach((callback) => callback())
        }
    }
}

export const tabReloadEmitter = new TabReloadEmitter()

export default function RootLayout() {
    const { email, setToken, setEmail } = useContext(AuthContext)
    const router = useRouter()
    const pathname = usePathname()

    // Animation refs for tab press effects
    const tabAnimations = useRef({
        index: new Animated.Value(1),
        history: new Animated.Value(1),
        personal: new Animated.Value(1),
    }).current

    // Check if current page is change-password to show/hide buttons and tabs
    const isChangePasswordScreen = pathname.includes("change-password")

    // Handle sign out and clear tokens
    const handleSignOut = async () => {
        await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL])
        setToken(null)
        setEmail(null)
        router.replace(SIGNIN_ROUTE)
    }

    // Navigate to home screen
    const navigateToHome = () => {
        router.push(HOME_ROUTE)
    }

    // Handle tab press with reload functionality
    const handleTabPress = (tabName: string, defaultAction: () => void) => {
        const currentTab = getCurrentTabFromPathname(pathname)

        if (currentTab === tabName) {
            // Same tab pressed - trigger reload with animation
            animateTabPress(tabName)
            tabReloadEmitter.emit(tabName)
        } else {
            // Different tab - normal navigation
            defaultAction()
        }
    }

    // Get current tab name from pathname
    const getCurrentTabFromPathname = (path: string): string => {
        if (path.includes("/history")) return "history"
        if (path.includes("/personal")) return "personal"
        return "index" // default/main tab
    }

    // Animate tab press effect
    const animateTabPress = (tabName: string) => {
        const animation = tabAnimations[tabName as keyof typeof tabAnimations]
        if (animation) {
            Animated.sequence([
                Animated.timing(animation, {
                    toValue: 0.8,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.spring(animation, {
                    toValue: 1,
                    tension: 300,
                    friction: 10,
                    useNativeDriver: true,
                }),
            ]).start()
        }
    }

    return (
        <Tabs
            screenOptions={{
                headerTitle: () => (
                    <TouchableOpacity style={styles.headerTitleContainer} onPress={navigateToHome}>
                        <Text style={styles.emailText}>{email}</Text>
                        <Ionicons name="home-outline" size={18} color="#007AFF" style={styles.homeIcon} />
                    </TouchableOpacity>
                ),
                headerTitleAlign: "center",
                headerLeft: () =>
                    !isChangePasswordScreen ? (
                        <TouchableOpacity style={styles.leftIconButton} onPress={handleSignOut}>
                            <Ionicons name="exit-outline" size={22} color="#007AFF" />
                        </TouchableOpacity>
                    ) : null,
                headerRight: () =>
                    !isChangePasswordScreen ? (
                        <TouchableOpacity style={styles.rightIconButton} onPress={() => router.push(CHANGE_PASSWORD_ROUTE)}>
                            <Ionicons name="key-outline" size={22} color="#007AFF" />
                        </TouchableOpacity>
                    ) : null,
                tabBarActiveTintColor: "#007AFF",
                tabBarShowLabel: false,
                tabBarStyle: isChangePasswordScreen ? { display: "none" } : undefined,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Main",
                    tabBarIcon: ({ color, size }) => (
                        <Animated.View style={{ transform: [{ scale: tabAnimations.index }] }}>
                            <Ionicons name="add-circle-outline" size={size} color={color} />
                        </Animated.View>
                    ),
                    tabBarShowLabel: false,
                }}
                listeners={{
                    tabPress: (e) => {
                        e.preventDefault()
                        handleTabPress("index", () => router.push("/home"))
                    },
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: "History",
                    tabBarIcon: ({ color, size }) => (
                        <Animated.View style={{ transform: [{ scale: tabAnimations.history }] }}>
                            <Ionicons name="calendar-outline" size={size} color={color} />
                        </Animated.View>
                    ),
                    tabBarShowLabel: false,
                }}
                listeners={{
                    tabPress: (e) => {
                        e.preventDefault()
                        handleTabPress("history", () => router.push("/home/history"))
                    },
                }}
            />
            <Tabs.Screen
                name="personal"
                options={{
                    title: "Personal",
                    tabBarIcon: ({ color, size }) => (
                        <Animated.View style={{ transform: [{ scale: tabAnimations.personal }] }}>
                            <Ionicons name="accessibility-outline" size={size} color={color} />
                        </Animated.View>
                    ),
                    tabBarShowLabel: false,
                }}
                listeners={{
                    tabPress: (e) => {
                        e.preventDefault()
                        handleTabPress("personal", () => router.push("/home/personal"))
                    },
                }}
            />
            <Tabs.Screen
                name="change-password"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="food-history-date"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="food-history-all"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    )
}

const styles = StyleSheet.create({
    headerTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    emailText: {
        fontSize: 14,
        color: "#333",
        marginRight: 5,
    },
    homeIcon: {
        marginLeft: 2,
    },
    leftIconButton: {
        padding: 8,
    },
    rightIconButton: {
        padding: 8,
    },
})
