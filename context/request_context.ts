import { SIGNIN_ROUTE } from "@/constants/router_constants";
import { ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL } from "@/constants/token_constants";
import BASE_URL, { URL_VERIFY_TOKEN } from "@/constants/url_constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, {
    AxiosError,
    AxiosHeaders,
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    InternalAxiosRequestConfig
} from "axios";
import { router } from "expo-router";

// Store for auth context updaters - will be set by the auth provider
let authContextUpdaters: {
    setToken: ((token: string | null) => void) | null;
    setEmail: ((email: string | null) => void) | null;
} = {
    setToken: null,
    setEmail: null
};

// Function to register auth context updaters
export const registerAuthUpdaters = (
    setToken: (token: string | null) => void,
    setEmail: (email: string | null) => void
) => {
    authContextUpdaters.setToken = setToken;
    authContextUpdaters.setEmail = setEmail;
};

// Create axios instance with common configuration
const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,        // Change if needed
    // timeout: 10000,                              // Default timeout: 10s
    headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
    },
});

// Interceptor to automatically attach token to each request
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await AsyncStorage.getItem(ACCESS_TOKEN);
        if (token) {
            // Use AxiosHeaders to add header ensuring correct type
            const headers = config.headers as AxiosHeaders;
            headers.set("Authorization", `Bearer ${token}`);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401/403 errors globally
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    async (error: AxiosError) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Clear all stored authentication data
            try {
                await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL]);
            } catch (storageError) {
                console.warn("Error clearing storage:", storageError);
            }
            
            // Update auth context if available
            if (authContextUpdaters.setToken) {
                authContextUpdaters.setToken(null);
            }
            if (authContextUpdaters.setEmail) {
                authContextUpdaters.setEmail(null);
            }
            
            // Navigate to sign-in page
            try {
                router.replace(SIGNIN_ROUTE);
            } catch (routerError) {
                console.warn("Error navigating to sign-in:", routerError);
            }
        }
        
        return Promise.reject(error);
    }
);

// Common function to execute request with override config if needed
async function request<T>(
    method: "get" | "post" | "put" | "patch" | "delete",
    url: string,
    dataOrParams?: any,
    extraConfig?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = {
        method,
        url,
        ...extraConfig,
    };

    if (method === "get") {
        config.params = dataOrParams;
    } else if (method !== "delete") {
        config.data = dataOrParams;
    }

    return api.request<T>(config);
  }

// Export CRUD helpers
export const getData = <T>(
    url: string,
    params?: any,
    config?: AxiosRequestConfig
) => request<T>("get", url, params, config);

export const postData = <T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig
) => request<T>("post", url, data, config);

export const putData = <T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig
) => request<T>("put", url, data, config);

export const patchData = <T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig
) => request<T>("patch", url, data, config);

// Verify token (send token in body)
export const verifyAccessToken = async() =>
    api.post(URL_VERIFY_TOKEN, { token: await AsyncStorage.getItem(ACCESS_TOKEN) });

export const deleteData = <T>(
    url: string,
    id: string | number,
    config?: AxiosRequestConfig
) => request<T>("delete", `${url}/${id}`, undefined, config);