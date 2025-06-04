"use client"

// app/verify.tsx
import { PasswordInput } from "@/components/PasswordInput"
import { SIGNIN_ROUTE } from "@/constants/router_constants"
import { postData } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import { getPasswordErrorMessage } from "@/utils/validation"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useState } from "react"
import {
    KeyboardAvoidingView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from "react-native"
import { URL_FORGOT_PASSWORD, URL_RESEND_EMAIL, URL_SET_PASSWORD, URL_SIGN_UP } from "../../constants/url_constants"

/**
 * Verify screen component
 * Handles OTP verification and password setting for both signup and password reset flows
 */
export default function Verify() {
    const { email, mode } = useLocalSearchParams()
    const { height } = useWindowDimensions()
    const keyboardVerticalOffset = height * 0.1 // Tính offset động dựa trên chiều cao màn hình
    const [otp, setOtp] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [otpError, setOtpError] = useState("")
    const [passwordError, setPasswordError] = useState("")
    const [confirmPasswordError, setConfirmPasswordError] = useState("")
    const [loading, setLoading] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)
    const router = useRouter()

    /**
     * Validates all input fields
     * @returns {boolean} True if all inputs are valid, false otherwise
     */
    const validateInputs = () => {
        let isValid = true

        if (!otp.trim()) {
            setOtpError("Please enter the verification code")
            isValid = false
        } else if (otp.length < 4) {
            setOtpError("Invalid verification code")
            isValid = false
        } else {
            setOtpError("")
        }

        const pwErr = getPasswordErrorMessage(password)
        if (pwErr) {
            setPasswordError(pwErr)
            isValid = false
        } else {
            setPasswordError("")
        }

        if (password !== confirmPassword) {
            setConfirmPasswordError("Passwords do not match")
            isValid = false
        } else {
            setConfirmPasswordError("")
        }

        return isValid
    }

    /**
     * Handles the verification process
     * Validates inputs and completes either signup or password reset
     */
    const handleVerify = async () => {
        if (!validateInputs()) return
        setLoading(true)
        try {
            const input = { email, otp, password }
            const res = await postData(mode === "signup" ? URL_SET_PASSWORD : URL_FORGOT_PASSWORD, input)
            showMessage(res.data, true)
            router.replace(SIGNIN_ROUTE)
        } catch (err: any) {
            showMessage(err)
        } finally {
            setLoading(false)
        }
    }

    /**
     * Handles resending the verification code
     */
    const handleResendCode = async () => {
        setResendLoading(true)
        try {
            const endpoint = mode === "signup" ? URL_SIGN_UP : URL_RESEND_EMAIL
            const res = await postData(endpoint, { email })
            showMessage(res.data, true)
        } catch (err: any) {
            showMessage(err)
        } finally {
            setResendLoading(false)
        }
    }

    /**
     * Gets the appropriate title based on the mode
     * @returns {string} The title text
     */
    const getTitle = () => (mode === "signup" ? "Confirm Registration" : "Reset Password")

    /**
     * Gets the appropriate subtitle based on the mode
     * @returns {string} The subtitle text
     */
    const getSubtitle = () =>
        mode === "signup"
            ? "Enter the verification code and create a new password."
            : "Enter the verification code and your new password."

    return (
        <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoid} keyboardVerticalOffset={keyboardVerticalOffset}>
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.container}>
                    <Text style={styles.title}>{getTitle()}</Text>
                    <Text style={styles.subtitle}>{getSubtitle()}</Text>

                    <View style={styles.emailContainer}>
                        <Text style={styles.emailLabel}>Email:</Text>
                        <Text style={styles.emailValue}>{email}</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Verification Code</Text>
                        <TextInput
                            placeholder="Enter code from email"
                            value={otp}
                            onChangeText={(t) => {
                                setOtp(t)
                                otpError && setOtpError("")
                            }}
                            style={[styles.input, otpError && styles.inputError]}
                            keyboardType="number-pad"
                            placeholderTextColor="#999"
                        />
                        {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
                        <Text style={styles.hint}>The verification code has been sent to your email.</Text>
                        <TouchableOpacity
                            style={[styles.resendButton, resendLoading && styles.resendButtonDisabled]}
                            onPress={handleResendCode}
                            disabled={resendLoading}
                        >
                            <Text style={styles.resendText}>{resendLoading ? "Resending..." : "Resend Code"}</Text>
                        </TouchableOpacity>
                    </View>
                    <PasswordInput
                        label="New Password"
                        placeholder="Enter new password"
                        value={password}
                        onChangeText={(t) => {
                            setPassword(t)
                            passwordError && setPasswordError("")
                            confirmPasswordError && t === confirmPassword && setConfirmPasswordError("")
                        }}
                        error={passwordError}
                        hint="Password must be at least 8 characters with letters and numbers."
                        textContentType="newPassword"
                    />

                    <PasswordInput
                        label="Confirm Password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChangeText={(t) => {
                            setConfirmPassword(t)
                            confirmPasswordError && t === password && setConfirmPasswordError("")
                        }}
                        error={confirmPasswordError}
                        textContentType="newPassword"
                    />

                    <TouchableOpacity
                        style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
                        onPress={handleVerify}
                        disabled={loading}
                    >
                        <Text style={styles.verifyButtonText}>{loading ? "Processing..." : "Confirm"}</Text>
                    </TouchableOpacity>

                    <View style={styles.infoContainer}>
                        <Text style={styles.infoText}>
                            {mode === "signup"
                                ? "After confirmation, you will be redirected to the sign in page."
                                : "After resetting your password, you will be redirected to the sign in page."}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    keyboardAvoid: { flex: 1 },
    scrollContainer: { flexGrow: 1 },
    container: { flex: 1, justifyContent: "center", padding: 20 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
    subtitle: { fontSize: 16, color: "#666", marginBottom: 24, textAlign: "center", lineHeight: 22 },
    emailContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        padding: 12,
        backgroundColor: "#f0f8ff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e0e0e0",
    },
    emailLabel: { fontSize: 16, fontWeight: "500", marginRight: 8 },
    emailValue: { fontSize: 16, color: "#007AFF", fontWeight: "500" },
    formGroup: { marginBottom: 16 },
    label: { fontSize: 16, marginBottom: 8, fontWeight: "500" },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        backgroundColor: "white",
        color: "#333", // Add explicit text color to ensure visibility on all platforms
    },
    inputError: { borderColor: "red" },
    errorText: { color: "red", fontSize: 14, marginTop: 4 },
    hint: { fontSize: 12, color: "#666", marginTop: 4 },
    resendButton: {
        marginTop: 8,
        alignSelf: "flex-end",
        padding: 8,
    },
    resendButtonDisabled: { opacity: 0.6 },
    resendText: { color: "#007AFF", fontSize: 14, fontWeight: "500" },
    verifyButton: {
        backgroundColor: "#007AFF",
        height: 50,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 16,
    },
    verifyButtonDisabled: { backgroundColor: "#007AFF80" },
    verifyButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
    infoContainer: {
        marginTop: 24,
        padding: 16,
        backgroundColor: "#f8f8f8",
        borderRadius: 8,
    },
    infoText: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 },
})
