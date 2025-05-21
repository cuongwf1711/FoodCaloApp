// app/verify.tsx
import { SIGNIN_ROUTE } from '@/constants/router_constants';
import { postData } from '@/context/request_context';
import { showMessage } from '@/utils/showMessage';
import { getPasswordErrorMessage } from '@/utils/validation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    URL_FORGOT_PASSWORD,
    URL_RESEND_EMAIL,
    URL_SET_PASSWORD,
    URL_SIGN_UP
} from '../../constants/url_constants';

export default function Verify() {
    const { email, mode } = useLocalSearchParams();
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otpError, setOtpError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const router = useRouter();

    const validateInputs = () => {
        let isValid = true;

        if (!otp.trim()) {
            setOtpError('Vui lòng nhập mã xác nhận');
            isValid = false;
        } else if (otp.length < 4) {
            setOtpError('Mã xác nhận không hợp lệ');
            isValid = false;
        } else {
            setOtpError('');
        }

        const pwErr = getPasswordErrorMessage(password);
        if (pwErr) {
            setPasswordError(pwErr);
            isValid = false;
        } else {
            setPasswordError('');
        }

        if (password !== confirmPassword) {
            setConfirmPasswordError('Mật khẩu xác nhận không khớp');
            isValid = false;
        } else {
            setConfirmPasswordError('');
        }

        return isValid;
    };

    const handleVerify = async () => {
        if (!validateInputs()) return;
        setLoading(true);
        try {
            const input = { email, otp, password };
            const res = await postData(
                mode === 'signup' ? URL_SET_PASSWORD : URL_FORGOT_PASSWORD,
                input
            );
            showMessage(res.data, true);
            router.replace(SIGNIN_ROUTE);
        } catch (err: any) {
            showMessage(err);
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setResendLoading(true);
        try {
            const endpoint = mode === 'signup' ? URL_SIGN_UP : URL_RESEND_EMAIL;
            await postData(endpoint, { email });
            showMessage({ message: 'Mã xác nhận đã được gửi lại thành công!' }, true);
        } catch (err: any) {
            showMessage(err);
        } finally {
            setResendLoading(false);
        }
    };

    const getTitle = () =>
        mode === 'signup' ? 'Xác nhận đăng ký' : 'Đặt lại mật khẩu';

    const getSubtitle = () =>
        mode === 'signup'
            ? 'Nhập mã xác nhận và tạo mật khẩu mới.'
            : 'Nhập mã xác nhận và mật khẩu mới.';

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.container}>
                    <Text style={styles.title}>{getTitle()}</Text>
                    <Text style={styles.subtitle}>{getSubtitle()}</Text>

                    <View style={styles.emailContainer}>
                        <Text style={styles.emailLabel}>Email:</Text>
                        <Text style={styles.emailValue}>{email}</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Mã xác nhận</Text>
                        <TextInput
                            placeholder="Nhập mã từ email"
                            value={otp}
                            onChangeText={(t) => {
                                setOtp(t);
                                otpError && setOtpError('');
                            }}
                            style={[styles.input, otpError && styles.inputError]}
                            keyboardType="number-pad"
                        />
                        {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
                        <Text style={styles.hint}>
                            Mã xác nhận đã được gửi đến email của bạn.
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.resendButton,
                                resendLoading && styles.resendButtonDisabled
                            ]}
                            onPress={handleResendCode}
                            disabled={resendLoading}
                        >
                            <Text style={styles.resendText}>
                                {resendLoading ? 'Đang gửi lại...' : 'Gửi lại mã'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Mật khẩu mới</Text>
                        <TextInput
                            placeholder="Nhập mật khẩu mới"
                            value={password}
                            onChangeText={(t) => {
                                setPassword(t);
                                passwordError && setPasswordError('');
                                confirmPasswordError && t === confirmPassword &&
                                    setConfirmPasswordError('');
                            }}
                            secureTextEntry
                            style={[styles.input, passwordError && styles.inputError]}
                            textContentType="newPassword"
                        />
                        {passwordError ? (
                            <Text style={styles.errorText}>{passwordError}</Text>
                        ) : null}
                        <Text style={styles.hint}>
                            Mật khẩu ít nhất 8 ký tự, có chữ và số.
                        </Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Xác nhận mật khẩu</Text>
                        <TextInput
                            placeholder="Nhập lại mật khẩu"
                            value={confirmPassword}
                            onChangeText={(t) => {
                                setConfirmPassword(t);
                                confirmPasswordError && t === password &&
                                    setConfirmPasswordError('');
                            }}
                            secureTextEntry
                            style={[styles.input, confirmPasswordError && styles.inputError]}
                            textContentType="newPassword"
                        />
                        {confirmPasswordError ? (
                            <Text style={styles.errorText}>{confirmPasswordError}</Text>
                        ) : null}
                    </View>

                    <TouchableOpacity
                        style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
                        onPress={handleVerify}
                        disabled={loading}
                    >
                        <Text style={styles.verifyButtonText}>
                            {loading ? 'Đang xử lý...' : 'Xác nhận'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.infoContainer}>
                        <Text style={styles.infoText}>
                            {mode === 'signup'
                                ? 'Sau xác nhận, bạn sẽ được chuyển đến trang đăng nhập.'
                                : 'Sau khi đặt lại mật khẩu, bạn sẽ được chuyển đến trang đăng nhập.'}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardAvoid: { flex: 1 },
    scrollContainer: { flexGrow: 1 },
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 24, textAlign: 'center', lineHeight: 22 },
    emailContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#f0f8ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0'
    },
    emailLabel: { fontSize: 16, fontWeight: '500', marginRight: 8 },
    emailValue: { fontSize: 16, color: '#007AFF', fontWeight: '500' },
    formGroup: { marginBottom: 16 },
    label: { fontSize: 16, marginBottom: 8, fontWeight: '500' },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16
    },
    inputError: { borderColor: 'red' },
    errorText: { color: 'red', fontSize: 14, marginTop: 4 },
    hint: { fontSize: 12, color: '#666', marginTop: 4 },
    resendButton: {
        marginTop: 8,
        alignSelf: 'flex-end',
        padding: 8
    },
    resendButtonDisabled: { opacity: 0.6 },
    resendText: { color: '#007AFF', fontSize: 14, fontWeight: '500' },
    verifyButton: {
        backgroundColor: '#007AFF',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16
    },
    verifyButtonDisabled: { backgroundColor: '#007AFF80' },
    verifyButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    infoContainer: {
        marginTop: 24,
        padding: 16,
        backgroundColor: '#f8f8f8',
        borderRadius: 8
    },
    infoText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 }
});
