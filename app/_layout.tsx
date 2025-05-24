import {
  HOME_ROUTE,
  SIGNIN_ROUTE,
} from '@/constants/router_constants';
import {
  ACCESS_TOKEN,
  REFRESH_TOKEN,
  USER_EMAIL,
} from '@/constants/token_constants';
import { URL_REFRESH_TOKEN } from '@/constants/url_constants';
import { AuthContext } from '@/context/AuthContext';
import { postData, verifyAccessToken } from '@/context/request_context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

type AuthState = {
  token: string | null;
  email: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  setEmail: React.Dispatch<React.SetStateAction<string | null>>;
};

export default function RootLayout() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const access = await AsyncStorage.getItem(ACCESS_TOKEN);
        const refresh = await AsyncStorage.getItem(REFRESH_TOKEN);
        const userEmail = await AsyncStorage.getItem(USER_EMAIL);

        if (userEmail) setEmail(userEmail);

        if (!access && !refresh) {
          setToken(null);
          return;
        }

        if (access) {
          try {
            await verifyAccessToken();
            setToken(access);
          } catch {
            if (refresh) {
              const { data } = await postData(URL_REFRESH_TOKEN, { refresh }) as { data: { access: string } };
              await AsyncStorage.setItem(ACCESS_TOKEN, data.access);
              setToken(data.access);
            } else {
              await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL]);
              setToken(null);
              setEmail(null);
            }
          }
        } else if (refresh) {
          try {
            const { data } = await postData(URL_REFRESH_TOKEN, { refresh }) as { data: { access: string } };
            await AsyncStorage.setItem(ACCESS_TOKEN, data.access);
            setToken(data.access);
          } catch {
            await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL]);
            setToken(null);
            setEmail(null);
          }
        }
      } catch {
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Redirect logic using router.replace
  useEffect(() => {
    if (!isLoading) {
      if (token) {
        if (segments[0] === 'auth') {
          router.replace(HOME_ROUTE);
        }
      } else {
        if (segments[0] !== 'auth') {
          router.replace(SIGNIN_ROUTE);
        }
      }
    }
  }, [isLoading, token, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ token, email, setToken, setEmail } as AuthState}>
      <Stack>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
      </Stack>
    </AuthContext.Provider>
  );
}