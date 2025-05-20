import { HOME_ROUTE, SIGNIN_ROUTE } from '@/constants/router_constants';
import { ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL } from '@/constants/token_constants';
import { postData, verifyAccessToken } from '@/context/auth_context';
import { AuthContext } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { URL_REFRESH_TOKEN } from '../constants/url_constants';


export default function RootLayout() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const access = await AsyncStorage.getItem(ACCESS_TOKEN);
      const refresh = await AsyncStorage.getItem(REFRESH_TOKEN);
      const storedEmail = await AsyncStorage.getItem(USER_EMAIL);

      if (!access && !refresh) return router.replace(SIGNIN_ROUTE);

      try {
        await verifyAccessToken();
      } catch (err: any) {
        if (err?.response?.status === 401 && refresh) {
          try {
            const { data } = await postData(URL_REFRESH_TOKEN, { refresh });
            await AsyncStorage.setItem(ACCESS_TOKEN, data.access);
            setToken(data.access);
          } catch {
            await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL]);
            setToken(null);
            setEmail(null);
            router.replace(SIGNIN_ROUTE);
          }
        } else {
          router.replace(SIGNIN_ROUTE);
        }
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (token) router.replace(HOME_ROUTE);
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, email, setToken, setEmail }}>
      <Stack>
        { token ? (
          <Stack.Screen name="home" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        )}
      </Stack>
    </AuthContext.Provider>
  );
}