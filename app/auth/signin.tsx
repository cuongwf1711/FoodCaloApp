// app/signin.tsx
import { FORGOT_PASSWORD_ROUTE, SIGNUP_ROUTE } from '@/constants/router_constants';
import { ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL } from '@/constants/token_constants';
import { AuthContext } from '@/context/AuthContext';
import { postData } from '@/context/request_context';
import { showMessage } from '@/utils/showMessage';
import { getEmailErrorMessage, getPasswordErrorMessage } from '@/utils/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useContext, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { URL_SIGN_IN } from '../../constants/url_constants';

export default function SignIn() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { setToken, setEmail } = useContext(AuthContext);
    const router = useRouter();

    // Hàm xác thực đầu vào
    const validateInputs = () => {
        let isValid = true;

        // Kiểm tra email
        const emailErrorMsg = getEmailErrorMessage(username);
        if (emailErrorMsg) {
            setEmailError(emailErrorMsg);
            isValid = false;
        } else {
            setEmailError("");
        }

        // Kiểm tra mật khẩu
        const passwordErrorMsg = getPasswordErrorMessage(password);
        if (passwordErrorMsg) {
            setPasswordError(passwordErrorMsg);
            isValid = false;
        } else {
            setPasswordError("");
        }

        return isValid;
    };

    const handleSignIn = async () => {
        // Xóa lỗi cũ
        setEmailError("");
        setPasswordError("");

        // Kiểm tra đầu vào
        if (!validateInputs()) {
            return;
        }

        setIsLoading(true);

        try {
            const { data } = await postData(URL_SIGN_IN, {
                username,
                password,
            });

            await AsyncStorage.setItem(ACCESS_TOKEN, data.access);
            await AsyncStorage.setItem(REFRESH_TOKEN, data.refresh);
            await AsyncStorage.setItem(USER_EMAIL, username);

            setToken(data.access);
            setEmail(username);
        } catch (e: any) {
            showMessage(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoid}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.container}>
                    <Text style={styles.title}>Đăng nhập</Text>
                    <Text style={styles.subtitle}>Vui lòng đăng nhập để tiếp tục</Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            placeholder="Nhập địa chỉ email của bạn"
                            value={username}
                            onChangeText={(text) => {
                                setUsername(text);
                                if (emailError) setEmailError("");
                            }}
                            style={[styles.input, emailError ? styles.inputError : null]}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            textContentType="emailAddress"
                            autoComplete="email"
                        />
                        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Mật khẩu</Text>
                        <TextInput
                            placeholder="Nhập mật khẩu của bạn"
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                if (passwordError) setPasswordError("");
                            }}
                            secureTextEntry
                            style={[styles.input, passwordError ? styles.inputError : null]}
                            textContentType="password"
                            autoComplete="password"
                        />
                        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                        <Text style={styles.passwordHint}>
                            Mật khẩu phải có ít nhất 8 ký tự, bao gồm cả chữ và số
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.signInButton, isLoading ? styles.signInButtonDisabled : null]}
                        onPress={handleSignIn}
                        disabled={isLoading}
                    >
                        <Text style={styles.signInButtonText}>
                            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push(FORGOT_PASSWORD_ROUTE)}
                        style={styles.forgotPasswordButton}
                        disabled={isLoading}
                    >
                        <Text style={styles.linkText}>Quên mật khẩu?</Text>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>hoặc</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push(SIGNUP_ROUTE)}
                        style={styles.signUpButton}
                        disabled={isLoading}
                    >
                        <Text style={styles.signUpButtonText}>Chưa có tài khoản? Đăng ký ngay</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    // Các style giữ nguyên như trước
    keyboardAvoid: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center',
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
    },
    inputError: {
        borderColor: 'red',
    },
    errorText: {
        color: 'red',
        fontSize: 14,
        marginTop: 4,
    },
    passwordHint: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    signInButton: {
        backgroundColor: '#007AFF',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    signInButtonDisabled: {
        backgroundColor: '#007AFF80',
    },
    signInButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    forgotPasswordButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#ddd',
    },
    dividerText: {
        paddingHorizontal: 16,
        color: '#666',
    },
    signUpButton: {
        alignItems: 'center',
    },
    signUpButtonText: {
        color: '#007AFF',
        fontSize: 16,
    },
    linkText: {
        color: '#007AFF',
        fontSize: 16,
    },
});