"use client"

// app/signin.tsx
import { FORGOT_PASSWORD_ROUTE, SIGNUP_ROUTE } from "@/constants/router_constants"
import { ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL } from "@/constants/token_constants"
import { AuthContext } from "@/context/AuthContext"
import { postData } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import { getEmailErrorMessage, getPasswordErrorMessage } from "@/utils/validation"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useRouter } from "expo-router"
import { useContext, useState } from "react"
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import { URL_SIGN_IN } from "../../constants/url_constants"

/**
 * SignIn screen component
 * Allows users to login with email and password
 */
export default function SignIn() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [emailError, setEmailError] = useState("")
    const [passwordError, setPasswordError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const { setToken, setEmail } = useContext(AuthContext)
    const router = useRouter()

    /**
     * Validates all input fields
     * @returns {boolean} True if all inputs are valid, false otherwise
     */
    const validateInputs = () => {
        let isValid = true

        // Check email
        const emailErrorMsg = getEmailErrorMessage(username)
        if (emailErrorMsg) {
            setEmailError(emailErrorMsg)
            isValid = false
        } else {
            setEmailError("")
        }

        // Check password
        const passwordErrorMsg = getPasswordErrorMessage(password)
        if (passwordErrorMsg) {
            setPasswordError(passwordErrorMsg)
            isValid = false
        } else {
            setPasswordError("")
        }

        return isValid
    }

    /**
     * Handles the sign in process
     * Validates inputs and authenticates the user
     */
    const handleSignIn = async () => {
        // Clear previous errors
        setEmailError("")
        setPasswordError("")

        // Validate inputs
        if (!validateInputs()) {
            return
        }

        setIsLoading(true)

        try {
            const { data } = await postData(URL_SIGN_IN, {
                username,
                password,
            })

            // Type assertion for data
            const { access, refresh } = data as { access: string; refresh: string }

            await AsyncStorage.setItem(ACCESS_TOKEN, access)
            await AsyncStorage.setItem(REFRESH_TOKEN, refresh)
            await AsyncStorage.setItem(USER_EMAIL, username)

            setToken(access)
            setEmail(username)
        } catch (e: any) {
            showMessage(e)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.container}>
                    <Text style={styles.title}>Sign In</Text>
                    <Text style={styles.subtitle}>Please sign in to continue</Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            placeholder="Enter your email address"
                            value={username}
                            onChangeText={(text) => {
                                setUsername(text)
                                if (emailError) setEmailError("")
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
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text)
                                if (passwordError) setPasswordError("")
                            }}
                            secureTextEntry
                            style={[styles.input, passwordError ? styles.inputError : null]}
                            textContentType="password"
                            autoComplete="password"
                        />
                        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                        <Text style={styles.passwordHint}>
                            Password must be at least 8 characters, including letters and numbers
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.signInButton, isLoading ? styles.signInButtonDisabled : null]}
                        onPress={handleSignIn}
                        disabled={isLoading}
                    >
                        <Text style={styles.signInButtonText}>{isLoading ? "Signing in..." : "Sign In"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push(FORGOT_PASSWORD_ROUTE)}
                        style={styles.forgotPasswordButton}
                        disabled={isLoading}
                    >
                        <Text style={styles.linkText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity onPress={() => router.push(SIGNUP_ROUTE)} style={styles.signUpButton} disabled={isLoading}>
                        <Text style={styles.signUpButtonText}>Don't have an account? Sign Up</Text>
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
    },
    inputError: {
        borderColor: "red",
    },
    errorText: {
        color: "red",
        fontSize: 14,
        marginTop: 4,
    },
    passwordHint: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
    },
    signInButton: {
        backgroundColor: "#007AFF",
        height: 50,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 16,
    },
    signInButtonDisabled: {
        backgroundColor: "#007AFF80",
    },
    signInButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    forgotPasswordButton: {
        marginTop: 16,
        alignItems: "center",
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#ddd",
    },
    dividerText: {
        paddingHorizontal: 16,
        color: "#666",
    },
    signUpButton: {
        alignItems: "center",
    },
    signUpButtonText: {
        color: "#007AFF",
        fontSize: 16,
    },
    linkText: {
        color: "#007AFF",
        fontSize: 16,
    },
})
