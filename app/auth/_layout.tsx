"use client"

// app/_layout.tsx
import { TITLE_APP } from "@/constants/general_constants"
import { SIGNIN_ROUTE } from "@/constants/router_constants"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Stack, useRouter } from "expo-router"
import { useState } from "react"
import { Animated, Easing, Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native"

/**
 * AuthLayout component
 * Provides the layout structure for all authentication screens
 */
export default function AuthLayout() {
    const router = useRouter()
    const [isPressed, setIsPressed] = useState(false)
    const scaleAnim = new Animated.Value(1)

    /**
     * Animates the title press effect
     */
    const animatePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 100,
                easing: Easing.ease,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
                easing: Easing.ease,
                useNativeDriver: true,
            }),
        ]).start()
    }

    /**
     * Handles the title press action
     * Navigates to the sign in screen
     */
    const handleTitlePress = async () => {
        animatePress()
        router.replace(SIGNIN_ROUTE)
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.contentContainer}>
                <Pressable
                    onPress={handleTitlePress}
                    onPressIn={() => setIsPressed(true)}
                    onPressOut={() => setIsPressed(false)}
                >
                    <Animated.View
                        style={[styles.header, { transform: [{ scale: scaleAnim }] }, isPressed && styles.headerPressed]}
                    >
                        <View style={styles.titleContainer}>
                            <MaterialCommunityIcons name="food-apple" size={28} color="#007AFF" style={styles.icon} />
                            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                                {TITLE_APP}
                            </Text>
                        </View>
                        <View style={styles.taglineContainer}>
                            <Text style={styles.tagline}>Track your nutrition every day</Text>
                        </View>
                    </Animated.View>
                </Pressable>
                <Stack screenOptions={{ headerShown: false }} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },
    contentContainer: {
        flex: 1,
        paddingTop: 60,
    },
    header: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: "#F7F9FF",
        justifyContent: "center",
        alignItems: "center",
        width: "90%",
        alignSelf: "center",
        marginBottom: 30,
        borderRadius: 16,
        shadowColor: "#007AFF",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#E6EFFF",
    },
    headerPressed: {
        backgroundColor: "#EDF2FF",
        shadowOpacity: 0.04,
    },
    titleContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    icon: {
        shadowColor: "#007AFF",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#007AFF",
        textAlign: "center",
        letterSpacing: 0.5,
    },
    taglineContainer: {
        marginTop: 6,
    },
    tagline: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        fontStyle: "italic",
    },
})
