// app/signup.tsx
import { SIGNIN_ROUTE, VERIFY_ROUTE } from '@/constants/router_constants';
import { postData } from '@/context/request_context';
import { showMessage } from '@/utils/showMessage';
import { getEmailErrorMessage } from '@/utils/validation';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { URL_SIGN_UP } from '../../constants/url_constants';

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const validateEmail = () => {
        const errorMessage = getEmailErrorMessage(email);
        setEmailError(errorMessage);
        return !errorMessage;
    };

    const handleSendOtp = async () => {
        if (!validateEmail()) {
            return;
        }

        setLoading(true);
        try {
            const { data } = await postData(URL_SIGN_UP, { email });
            showMessage(data, true);
            router.push({ pathname: VERIFY_ROUTE, params: { email, mode: 'signup' } });
        } catch (error: any) {
            showMessage(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoid}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.container}>
                    <Text style={styles.title}>Đăng ký tài khoản</Text>
                    <Text style={styles.subtitle}>
                        Nhập địa chỉ email của bạn để bắt đầu quá trình đăng ký.
                        Chúng tôi sẽ gửi mã xác nhận đến email của bạn.
                    </Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            placeholder="Nhập địa chỉ email của bạn"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (emailError) setEmailError('');
                            }}
                            style={[styles.input, emailError ? styles.inputError : null]}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            textContentType="emailAddress"
                            autoComplete="email"
                        />
                        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                        <Text style={styles.hint}>
                            Hãy đảm bảo bạn có quyền truy cập vào email này để nhận mã xác nhận.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.continueButton, loading ? styles.continueButtonDisabled : null]}
                        onPress={handleSendOtp}
                        disabled={loading}
                    >
                        <Text style={styles.continueButtonText}>
                            {loading ? 'Đang gửi...' : 'Tiếp tục'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>hoặc</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push(SIGNIN_ROUTE)}
                        style={styles.signInButton}
                        disabled={loading}
                    >
                        <Text style={styles.signInButtonText}>Đã có tài khoản? Đăng nhập</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
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
        lineHeight: 22,
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
    hint: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    continueButton: {
        backgroundColor: '#007AFF',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    continueButtonDisabled: {
        backgroundColor: '#007AFF80',
    },
    continueButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
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
    signInButton: {
        alignItems: 'center',
    },
    signInButtonText: {
        color: '#007AFF',
        fontSize: 16,
    },
    infoContainer: {
        marginTop: 24,
        padding: 16,
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    linkText: {
        color: '#007AFF',
    },
});