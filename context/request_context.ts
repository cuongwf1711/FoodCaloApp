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

// Tạo axios instance với cấu hình chung
const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,        // Thay đổi nếu cần
    // timeout: 10000,                              // Thời gian chờ mặc định: 10s
    headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
    },
});

// Interceptor để tự động gắn token vào mỗi request
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await AsyncStorage.getItem(ACCESS_TOKEN);
        if (token) {
            // Sử dụng AxiosHeaders để thêm header đảm bảo kiểu chính xác
            const headers = config.headers as AxiosHeaders;
            headers.set("Authorization", `Bearer ${token}`);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Hàm chung thực hiện request với override config nếu cần
async function request<T>(
    method: "get" | "post" | "put" | "patch",
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
    } else {
        config.data = dataOrParams;
    }

    return api.request<T>(config);
}

// Export các helper CRUD
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

// Xác thực token (gửi token trong body)
export const verifyAccessToken = async() =>
    api.post(URL_VERIFY_TOKEN, { token: await AsyncStorage.getItem(ACCESS_TOKEN) });

