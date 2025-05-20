import { ACCESS_TOKEN } from "@/constants/token_constants";
import { URL_VERIFY_TOKEN } from "@/constants/url_constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export async function getData(url: string, params?: any) {
    const access = await AsyncStorage.getItem(ACCESS_TOKEN);

    const config: {
        params?: any;
        headers?: {
            Authorization?: string;
            'ngrok-skip-browser-warning'?: string;
        };
    } = {
        params: params,
        headers: {
            'ngrok-skip-browser-warning': 'true',
        },
    };

    // Chỉ thêm header Authorization nếu access token tồn tại
    if (access) {
        config.headers!.Authorization = `Bearer ${access}`;
    }

    return axios.get(url, config);
}

export async function postData(url: string, data: any) {
    const access = await AsyncStorage.getItem(ACCESS_TOKEN);

    const config: {
        headers?: {
            Authorization?: string;
            'ngrok-skip-browser-warning'?: string;
        };
    } = {
        headers: {
            'ngrok-skip-browser-warning': 'true',
        },
    };

    // Chỉ thêm header Authorization nếu access token tồn tại
    if (access) {
        config.headers!.Authorization = `Bearer ${access}`;
    }

    return await axios.post(url, data, config);
}

export async function verifyAccessToken() {
    return axios.post(URL_VERIFY_TOKEN, await AsyncStorage.getItem(ACCESS_TOKEN), {
        headers: {
            'ngrok-skip-browser-warning': 'true',
        },
    });
}