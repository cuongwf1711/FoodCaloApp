// export const BASE_URL = 'https://mighty-baboon-busy.ngrok-free.app/api/v1';
// export const BASE_URL = 'http://104.214.179.114:8000/api/v1';
export const BASE_URL = 'https://mighty-baboon-busy.ngrok-free.app/api/v1';

// npx expo export --platform web
// eas deploy

export default BASE_URL;

export const URL_SIGN_IN = `${BASE_URL}/iam`;
export const URL_SIGN_UP = `${BASE_URL}/iam/signup`;
export const URL_SET_PASSWORD = `${BASE_URL}/iam/set-password`;
export const URL_REFRESH_TOKEN = `${BASE_URL}/iam/refresh-token`;
export const URL_VERIFY_TOKEN = `${BASE_URL}/iam/verify-token`;

export const URL_USER_PROFILE = `${BASE_URL}/iam/user-profile`;


export const URL_CHANGE_PASSWORD = `${BASE_URL}/iam/change-password`;
export const URL_RESEND_EMAIL = `${BASE_URL}/iam/resend-email`;
export const URL_FORGOT_PASSWORD = `${BASE_URL}/iam/forgot-password`;
export const URL_FOOD_CALO_ESTIMATOR = `${BASE_URL}/food-calo-estimator`;

