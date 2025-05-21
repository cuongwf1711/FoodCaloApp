// app/auth/change-password.tsx
import { SIGNIN_ROUTE } from '@/constants/router_constants';
import { postData } from '@/context/request_context';
import { showMessage } from '@/utils/showMessage';
import { getPasswordErrorMessage } from '@/utils/validation';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { URL_CHANGE_PASSWORD } from '../../constants/url_constants';

export default function ChangePassword() {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [oldPasswordError, setOldPasswordError] = useState('');
    const [newPasswordError, setNewPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const validateInputs = () => {
        let isValid = true;

        // Kiểm tra mật khẩu cũ
        if (!oldPassword) {
            setOldPasswordError('Vui lòng nhập mật khẩu hiện tại');
            isValid = false;
        } else {
            setOldPasswordError('');
        }

        // Kiểm tra mật khẩu mới
        const passwordErrorMsg = getPasswordErrorMessage(newPassword);
        if (passwordErrorMsg) {
            setNewPasswordError(passwordErrorMsg);
            isValid = false;
        } else {
            setNewPasswordError('');
        }

        // Kiểm tra xác nhận mật khẩu
        if (newPassword !== confirmPassword) {
            setConfirmPasswordError('Mật khẩu xác nhận không khớp');
            isValid = false;
        } else {
            setConfirmPasswordError('');
        }

        return isValid;
    };

    const handleChangePassword = async () => {
        // Xóa lỗi cũ
        setOldPasswordError('');
        setNewPasswordError('');
        setConfirmPasswordError('');

        // Kiểm tra đầu vào
        if (!validateInputs()) {
            return;
        }

        try {
            setIsLoading(true);
            const res = await postData(URL_CHANGE_PASSWORD, {
                oldPassword,
                newPassword,
            });
            showMessage(res.data, true);
            router.replace(SIGNIN_ROUTE);
        } catch (error: any) {
            showMessage(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.content}>
                    <Text style={styles.pageTitle}>Đổi mật khẩu</Text>
                    <Text style={styles.description}>
                        Để bảo mật tài khoản, vui lòng nhập mật khẩu hiện tại và mật khẩu mới của bạn
                    </Text>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Mật khẩu hiện tại</Text>
                            <TextInput
                                placeholder="Nhập mật khẩu hiện tại của bạn"
                                value={oldPassword}
                                onChangeText={(text) => {
                                    setOldPassword(text);
                                    if (oldPasswordError) setOldPasswordError('');
                                }}
                                secureTextEntry
                                style={[styles.input, oldPasswordError ? styles.inputError : null]}
                            />
                            {oldPasswordError ? <Text style={styles.errorText}>{oldPasswordError}</Text> : null}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Mật khẩu mới</Text>
                            <TextInput
                                placeholder="Nhập mật khẩu mới của bạn"
                                value={newPassword}
                                onChangeText={(text) => {
                                    setNewPassword(text);
                                    if (newPasswordError) setNewPasswordError('');
                                    if (confirmPasswordError && text === confirmPassword) {
                                        setConfirmPasswordError('');
                                    }
                                }}
                                secureTextEntry
                                style={[styles.input, newPasswordError ? styles.inputError : null]}
                            />
                            {newPasswordError ? <Text style={styles.errorText}>{newPasswordError}</Text> : null}
                            <Text style={styles.passwordHint}>
                                Mật khẩu phải có ít nhất 8 ký tự, bao gồm cả chữ và số
                            </Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                            <TextInput
                                placeholder="Nhập lại mật khẩu mới của bạn"
                                value={confirmPassword}
                                onChangeText={(text) => {
                                    setConfirmPassword(text);
                                    if (confirmPasswordError && text === newPassword) {
                                        setConfirmPasswordError('');
                                    }
                                }}
                                secureTextEntry
                                style={[styles.input, confirmPasswordError ? styles.inputError : null]}
                            />
                            {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
                        </View>

                        <TouchableOpacity
                            style={[styles.button, isLoading ? styles.buttonDisabled : null]}
                            onPress={handleChangePassword}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>ĐỔI MẬT KHẨU</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.infoContainer}>
                            <Text style={styles.infoText}>
                                Sau khi đổi mật khẩu thành công, bạn sẽ được đưa về trang đăng nhập để đăng nhập lại với mật khẩu mới.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    inputError: {
        borderColor: '#FF3B30',
        backgroundColor: '#FFF5F5',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        marginTop: 4,
    },
    passwordHint: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    button: {
        height: 50,
        backgroundColor: '#3498db',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    buttonDisabled: {
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    infoContainer: {
        marginTop: 24,
        padding: 16,
        backgroundColor: '#e8f4fc',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bde0f7',
    },
    infoText: {
        fontSize: 14,
        color: '#2980b9',
        textAlign: 'center',
        lineHeight: 20,
    },
});