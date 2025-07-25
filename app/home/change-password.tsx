"use client"

// Change Password Screen - Allows users to update their password securely
import { PasswordInput } from "@/components/PasswordInput"
import { SIGNIN_ROUTE } from "@/constants/router_constants"
import { ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL } from "@/constants/token_constants"
import { AuthContext } from "@/context/AuthContext"
import { postData } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import { getPasswordErrorMessage } from "@/utils/validation"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useRouter } from "expo-router"
import { useContext, useState } from "react"
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native"
import { URL_CHANGE_PASSWORD } from "../../constants/url_constants"

export default function ChangePassword() {
    // State management for form inputs and validation
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [oldPasswordError, setOldPasswordError] = useState("")
    const [newPasswordError, setNewPasswordError] = useState("")
    const [confirmPasswordError, setConfirmPasswordError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { email, setToken, setEmail } = useContext(AuthContext)

    // Validate all form inputs before submission
    const validateInputs = () => {
        let isValid = true

        // Check current password
        if (!oldPassword) {
            setOldPasswordError("Please enter your current password")
            isValid = false
        } else {
            setOldPasswordError("")
        }

        // Check new password
        const passwordErrorMsg = getPasswordErrorMessage(newPassword)
        if (passwordErrorMsg) {
            setNewPasswordError(passwordErrorMsg)
            isValid = false
        } else if (oldPassword && newPassword === oldPassword) {
            setNewPasswordError("New password must be different from current password")
            isValid = false
        } else {
            setNewPasswordError("")
        }

        // Check password confirmation
        if (newPassword !== confirmPassword) {
            setConfirmPasswordError("Password confirmation does not match")
            isValid = false
        } else {
            setConfirmPasswordError("")
        }

        return isValid
    }

    // Handle password change submission
    const handleChangePassword = async () => {
        // Clear previous errors
        setOldPasswordError("")
        setNewPasswordError("")
        setConfirmPasswordError("")

        // Validate inputs
        if (!validateInputs()) {
            return
        }

        try {
            setIsLoading(true)
            const res = await postData(URL_CHANGE_PASSWORD, {
                oldPassword,
                newPassword,
            })
            showMessage(res.data, true)
            await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, USER_EMAIL])
            setToken(null)
            setEmail(null)
            router.replace(SIGNIN_ROUTE)
        } catch (error: any) {
            showMessage(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <KeyboardAvoidingView behavior="height" style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.content}>
                    <Text style={styles.pageTitle}>Change Password</Text>
                    <Text style={styles.description}>
                        To secure your account, please enter your current password and your new password
                    </Text>
                    <View style={styles.form}>
                        <PasswordInput
                            label="Current Password"
                            placeholder="Enter your current password"
                            value={oldPassword}
                            onChangeText={(text) => {
                                setOldPassword(text)
                                if (oldPasswordError) setOldPasswordError("")
                            }}
                            error={oldPasswordError}
                            containerStyle={styles.inputContainer}
                        />

                        <PasswordInput
                            label="New Password"
                            placeholder="Enter your new password"
                            value={newPassword}
                            onChangeText={(text) => {
                                setNewPassword(text)
                                if (newPasswordError) setNewPasswordError("")
                                if (confirmPasswordError && text === confirmPassword) {
                                    setConfirmPasswordError("")
                                }
                                // Clear error if new password is different from old password
                                if (oldPassword && text !== oldPassword && newPasswordError.includes("different from current")) {
                                    setNewPasswordError("")
                                }
                            }}
                            error={newPasswordError}
                            hint="Password must be at least 8 characters, include both letters and numbers, and be different from your current password"
                            containerStyle={styles.inputContainer}
                        />

                        <PasswordInput
                            label="Confirm New Password"
                            placeholder="Re-enter your new password"
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text)
                                if (confirmPasswordError && text === newPassword) {
                                    setConfirmPasswordError("")
                                }
                            }}
                            error={confirmPasswordError}
                            containerStyle={styles.inputContainer}
                        />

                        <TouchableOpacity
                            style={[styles.button, isLoading ? styles.buttonDisabled : null]}
                            onPress={handleChangePassword}
                            disabled={isLoading}
                        >
                            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>CHANGE PASSWORD</Text>}
                        </TouchableOpacity>

                        <View style={styles.infoContainer}>
                            <Text style={styles.infoText}>
                                After successfully changing your password, you will be redirected to the login page to sign in with your
                                new password.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    scrollContainer: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center",
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 30,
        lineHeight: 22,
    },
    form: {
        width: "100%",
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: "500",
        color: "#333",
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 16,
        backgroundColor: "white",
        fontSize: 16,
        color: "#333",
    },
    inputError: {
        borderColor: "#FF3B30",
        backgroundColor: "#FFF5F5",
    },
    errorText: {
        color: "#FF3B30",
        fontSize: 14,
        marginTop: 4,
    },
    passwordHint: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
    },
    button: {
        height: 50,
        backgroundColor: "#3498db",
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 16,
    },
    buttonDisabled: {
        backgroundColor: "rgba(52, 152, 219, 0.7)",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    infoContainer: {
        marginTop: 24,
        padding: 16,
        backgroundColor: "#e8f4fc",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#bde0f7",
    },
    infoText: {
        fontSize: 14,
        color: "#2980b9",
        textAlign: "center",
        lineHeight: 20,
    },
})
