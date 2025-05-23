"use client"

// App layout with tab navigation
import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Tabs, usePathname, useRouter } from "expo-router"
import { useContext } from "react"
import { StyleSheet, Text, TouchableOpacity } from "react-native"

import { CHANGE_PASSWORD_ROUTE, HOME_ROUTE, SIGNIN_ROUTE } from "@/constants/router_constants"
import { ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL } from "@/constants/token_constants"
import { AuthContext } from "@/context/AuthContext"

export default function RootLayout() {
    const { email, setToken, setEmail } = useContext(AuthContext)
    const router = useRouter()
    const pathname = usePathname()

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
                // Hide all text labels on tab bar
                tabBarShowLabel: false,
                // Hide tabBar when on change password page
                tabBarStyle: isChangePasswordScreen ? { display: "none" } : undefined,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Main",
                    tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
                    // Hide text label
                    tabBarShowLabel: false,
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: "History",
                    tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
                    // Hide text label
                    tabBarShowLabel: false,
                }}
            />
            <Tabs.Screen
                name="personal"
                options={{
                    title: "Personal",
                    tabBarIcon: ({ color, size }) => <Ionicons name="accessibility-outline" size={size} color={color} />,
                    // Hide text label
                    tabBarShowLabel: false,
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
