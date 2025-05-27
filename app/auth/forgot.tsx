"use client"

// app/forgot-password.tsx
import { SIGNIN_ROUTE, VERIFY_ROUTE } from "@/constants/router_constants"
import { postData } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import { getEmailErrorMessage } from "@/utils/validation"
import { useRouter } from "expo-router"
import { useState } from "react"
import {
    KeyboardAvoidingView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native"
import { URL_RESEND_EMAIL } from "../../constants/url_constants"

/**
 * ForgotPassword screen component
 * Allows users to request a password reset by entering their email
 */
export default function ForgotPassword() {
    const [email, setEmail] = useState("")
    const [emailError, setEmailError] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    /**
     * Validates the email input
     * @returns {boolean} True if email is valid, false otherwise
     */
    const validateEmail = () => {
        const errorMessage = getEmailErrorMessage(email)
        setEmailError(errorMessage)
        return !errorMessage
    }

    /**
     * Handles the password reset request
     * Validates email and sends verification code to the user's email
     */
    const handleResendEmail = async () => {
        if (!validateEmail()) {
            return
        }

        setLoading(true)
        try {
            const { data } = await postData(URL_RESEND_EMAIL, { email })
            showMessage(data, true)
            router.push({ pathname: VERIFY_ROUTE, params: { email, mode: "forgot" } })
        } catch (error: any) {
            showMessage(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <KeyboardAvoidingView behavior="height" style={styles.keyboardAvoid}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.container}>
                    <Text style={styles.title}>Forgot Password</Text>
                    <Text style={styles.subtitle}>
                        Please enter your registered email address. We'll send a verification code for you to reset your password.
                    </Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            placeholder="Enter your email address"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text)
                                if (emailError) setEmailError("")
                            }}
                            style={[styles.input, emailError ? styles.inputError : null]}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            textContentType="emailAddress"
                            autoComplete="email"
                        />
                        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                        <Text style={styles.hint}>Make sure you have access to this email to receive the verification code.</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.sendButton, loading ? styles.sendButtonDisabled : null]}
                        onPress={handleResendEmail}
                        disabled={loading}
                    >
                        <Text style={styles.sendButtonText}>{loading ? "Sending..." : "Send Request"}</Text>
                    </TouchableOpacity>

                    <View style={styles.infoContainer}>
                        <Text style={styles.infoText}>
                            After receiving the verification code, you'll be directed to the verification page to enter the code and
                            reset your password.
                        </Text>
                    </View>

                    <TouchableOpacity onPress={() => router.push(SIGNIN_ROUTE)} style={styles.backButton} disabled={loading}>
                        <Text style={styles.backButtonText}>Back to Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
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
        justifyContent: "center",
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        marginBottom: 24,
        textAlign: "center",
        lineHeight: 22,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: "500",
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        backgroundColor: "white",
    },
    inputError: {
        borderColor: "red",
    },
    errorText: {
        color: "red",
        fontSize: 14,
        marginTop: 4,
    },
    hint: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
    },
    sendButton: {
        backgroundColor: "#007AFF",
        height: 50,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 16,
    },
    sendButtonDisabled: {
        backgroundColor: "#007AFF80",
    },
    sendButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    infoContainer: {
        marginTop: 24,
        padding: 16,
        backgroundColor: "#f8f8f8",
        borderRadius: 8,
    },
    infoText: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        lineHeight: 20,
    },
    backButton: {
        marginTop: 24,
        alignItems: "center",
    },
    backButtonText: {
        color: "#007AFF",
        fontSize: 16,
    },
})
