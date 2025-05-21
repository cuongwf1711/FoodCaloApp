import { HOME_ROUTE, SIGNIN_ROUTE } from '@/constants/router_constants';
import { ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL } from '@/constants/token_constants';
import { postData, verifyAccessToken } from '@/context/auth_context';
import { AuthContext } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { URL_REFRESH_TOKEN } from '../constants/url_constants';

export default function RootLayout() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Kiểm tra xác thực khi khởi động ứng dụng
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);

        // Lấy token từ AsyncStorage
        const access = await AsyncStorage.getItem(ACCESS_TOKEN);
        const refresh = await AsyncStorage.getItem(REFRESH_TOKEN);
        const userEmail = await AsyncStorage.getItem(USER_EMAIL);

        if (userEmail) {
          setEmail(userEmail);
        }

        // Nếu không có token nào, đặt token là null và kết thúc
        if (!access && !refresh) {
          setToken(null);
          setIsLoading(false);
          return;
        }

        if (access) {
          try {
            // Kiểm tra access token hiện tại
            await verifyAccessToken();
            setToken(access);
          } catch (err: any) {
            // Nếu access token không hợp lệ nhưng có refresh token
            if (refresh) {
              try {
                // Lấy access token mới
                const { data } = await postData(URL_REFRESH_TOKEN, { refresh });

                // Lưu token mới vào AsyncStorage
                await AsyncStorage.setItem(ACCESS_TOKEN, data.access);
                setToken(data.access);
              } catch (refreshError) {
                // Nếu refresh thất bại, xóa tất cả dữ liệu xác thực
                await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL]);
                setToken(null);
                setEmail(null);
              }
            } else {
              // Không có refresh token, xóa dữ liệu xác thực
              await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL]);
              setToken(null);
              setEmail(null);
            }
          }
        } else if (refresh) {
          // Chỉ có refresh token, thử refresh
          try {
            const { data } = await postData(URL_REFRESH_TOKEN, { refresh });

            await AsyncStorage.setItem(ACCESS_TOKEN, data.access);
            setToken(data.access);
          } catch (refreshError) {
            await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL]);
            setToken(null);
            setEmail(null);
          }
        }
      } catch (error) {
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Hiển thị loading indicator khi đang kiểm tra xác thực
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Điều hướng dựa trên trạng thái xác thực sau khi đã hoàn tất kiểm tra
  // Sử dụng Redirect thay vì router.replace để tránh hiệu ứng nhảy màn hình
  return (
    <AuthContext.Provider value={{ token, email, setToken, setEmail }}>
      {token ? (
        segments[0] === 'auth' ? (
          <Redirect href={HOME_ROUTE} />
        ) : (
          <Stack>
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="home" options={{ headerShown: false }} />
          </Stack>
        )
      ) : (
        segments[0] !== 'auth' ? (
          <Redirect href={SIGNIN_ROUTE} />
        ) : (
          <Stack>
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="home" options={{ headerShown: false }} />
          </Stack>
        )
      )}
    </AuthContext.Provider>
  );
}