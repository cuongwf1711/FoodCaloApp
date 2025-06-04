import { ACCESS_TOKEN } from "@/constants/token_constants";
import BASE_URL, { URL_VERIFY_TOKEN } from "@/constants/url_constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, {
    AxiosHeaders,
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    InternalAxiosRequestConfig
} from "axios";

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