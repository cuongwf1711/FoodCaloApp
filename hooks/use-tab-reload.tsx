"use client"

import { tabReloadEmitter } from "@/app/home/_layout"
import { useEffect, useRef, useState } from "react"
import { Animated } from "react-native"

interface UseTabReloadOptions {
    onReload?: () => void | Promise<void>
    animationDuration?: number
}

export const useTabReload = (tabName: string, options: UseTabReloadOptions = {}) => {
    const { onReload, animationDuration = 600 } = options
    const [isReloading, setIsReloading] = useState(false)

    // Animation values
    const fadeAnim = useRef(new Animated.Value(1)).current
    const scaleAnim = useRef(new Animated.Value(1)).current
    const rotateAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const unsubscribe = tabReloadEmitter.subscribe(tabName, handleReload)
        return unsubscribe
    }, [tabName, onReload])

    const handleReload = async () => {
        if (isReloading) return

        setIsReloading(true)

        // Start reload animation
        Animated.parallel([
            // Fade out and scale down
            Animated.timing(fadeAnim, {
                toValue: 0.3,
                duration: animationDuration / 3,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: animationDuration / 3,
                useNativeDriver: true,
            }),
            // Rotation effect
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: animationDuration / 2,
                useNativeDriver: true,
            }),
        ]).start(async () => {
            // Execute reload callback
            try {
                if (onReload) {
                    await onReload()
                }
            } catch (error) {
                console.error("Reload error:", error)
            }

            // Reset rotation
            rotateAnim.setValue(0)

            // Animate back to normal
            Animated.parallel([
                Animated.spring(fadeAnim, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setIsReloading(false)
            })
        })
    }

    const animatedStyle = {
        opacity: fadeAnim,
        transform: [
            { scale: scaleAnim },
            {
                rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                }),
            },
        ],
    }

    return {
        isReloading,
        animatedStyle,
        triggerReload: handleReload,
    }
}
