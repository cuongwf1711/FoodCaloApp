// app/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import {
    CHANGE_PASSWORD_ROUTE,
    HOME_ROUTE,
    SIGNIN_ROUTE,
} from '@/constants/router_constants';
import {
    ACCESS_TOKEN,
    REFRESH_TOKEN,
    USER_EMAIL,
} from '@/constants/token_constants';
import { AuthContext } from '@/context/AuthContext';

export default function RootLayout() {
    const { email, setToken, setEmail } = useContext(AuthContext);
    const router = useRouter();
    const pathname = usePathname();

    // Kiểm tra trang change-password để ẩn/hiện nút và tab
    const isChangePasswordScreen = pathname.includes('change-password');

    const handleSignOut = async () => {
        // Đăng xuất và clear token
        await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL]);
        setToken(null);
        setEmail(null);
        router.replace(SIGNIN_ROUTE);
    };

    const navigateToHome = () => {
        router.push(HOME_ROUTE);
    };

    return (
        <Tabs
            screenOptions={{
                headerTitle: () => (
                    <TouchableOpacity style={styles.headerTitleContainer} onPress={navigateToHome}>
                        <Text style={styles.emailText}>{email}</Text>
                        <Ionicons name="home-outline" size={18} color="#007AFF" style={styles.homeIcon} />
                    </TouchableOpacity>
                ),
                headerTitleAlign: 'center',
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
                tabBarActiveTintColor: '#007AFF',
                tabBarShowLabel: false, // Ẩn tất cả text label trên tab bar
                // Ẩn tabBar khi ở trang đổi mật khẩu
                tabBarStyle: isChangePasswordScreen ? { display: 'none' } : undefined,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Main',
                    tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
                    tabBarShowLabel: false, // Ẩn text label
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
                    tabBarShowLabel: false, // Ẩn text label
                }}
            />
            <Tabs.Screen
                name="personal"
                options={{
                    title: 'Personal',
                    tabBarIcon: ({ color, size }) => <Ionicons name="accessibility-outline" size={size} color={color} />,
                    tabBarShowLabel: false, // Ẩn text label
                }}
            />
            <Tabs.Screen
                name="change-password"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="food-history-day"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="food-history-week"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="food-history-month"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="food-history-none"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emailText: {
        fontSize: 14,
        color: '#333',
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
});