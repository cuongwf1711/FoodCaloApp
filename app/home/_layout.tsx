import { CHANGE_PASSWORD_ROUTE, HOME_ROUTE, SIGNIN_ROUTE } from '@/constants/router_constants';
import { ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL } from '@/constants/token_constants';
import { AuthContext } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, usePathname, useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function HomeLayout() {
    const { email, setToken, setEmail } = useContext(AuthContext);
    const router = useRouter();
    const pathname = usePathname();


    const isChangePasswordScreen = pathname.includes('change-password');

    const handleSignOut = async () => {
        router.replace(SIGNIN_ROUTE);
        await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL]);
        setToken(null);
        setEmail(null);
    };

    const navigateToHome = () => {
        router.push(HOME_ROUTE);
    };

    return (
        <Stack
            screenOptions={{
                headerTitle: () => (
                    <TouchableOpacity
                        style={styles.headerTitleContainer}
                        onPress={navigateToHome}
                    >
                        <Text style={styles.emailText}>{email}</Text>
                        <Ionicons
                            name="home-outline"
                            size={18}
                            color="#007AFF"
                            style={styles.homeIcon}
                        />
                    </TouchableOpacity>
                ),
                headerTitleAlign: 'center',
                headerLeft: () =>
                    !isChangePasswordScreen ? (
                        <TouchableOpacity
                            style={styles.leftIconButton}
                            onPress={handleSignOut}
                        >
                            <Ionicons name="exit-outline" size={22} color="#007AFF" />
                        </TouchableOpacity>
                    ) : null,
                headerRight: () =>
                    !isChangePasswordScreen ? (
                        <TouchableOpacity
                            style={styles.rightIconButton}
                            onPress={() => router.push(CHANGE_PASSWORD_ROUTE)}
                        >
                            <Ionicons name="key-outline" size={22} color="#007AFF" />
                        </TouchableOpacity>
                    ) : null,
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="change-password" />
        </Stack>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
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
        marginLeft: 0,
    },
    rightIconButton: {
        padding: 8,
        marginRight: 0,
    },
});
