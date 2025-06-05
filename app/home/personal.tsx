"use client"

import { MAX_CALO_DISPLAY, MAX_CALORIES } from "@/constants/general_constants"
import { URL_USER_PROFILE } from "@/constants/url_constants"
import { getData, patchData } from "@/context/request_context"
import { useTabReload } from "@/hooks/use-tab-reload"
import { Colors } from "@/styles/colors"
import { formatDecimalDisplay } from "@/utils/number-utils"
import { showMessage } from "@/utils/showMessage"
import { StatusBar } from "expo-status-bar"
import { useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

// User profile type definition
interface UserProfile {
    gender: boolean | null
    age: number | null
    height: number | null
    weight: number | null
    calorieLimit: number | null
    calorieLimitPeriod: string
    lengthReferencePoint: number | null
    widthReferencePoint: number | null
    areaReferencePoint: number | null
    autoSetCalorieLimit?: boolean
    totalCalories?: number
}

// Interface for profile update data
interface UserProfileUpdate {
    gender?: boolean | null
    age?: number
    height?: number
    weight?: number
    calorieLimit?: number
    calorieLimitPeriod?: string
    lengthReferencePointCustom?: number
    widthReferencePointCustom?: number
    autoSetCalorieLimit?: boolean
}

// Validation errors interface
interface ValidationErrors {
    age?: string
    height?: string
    weight?: string
    lengthReferencePoint?: string
    widthReferencePoint?: string
    calorieLimit?: string
}

const PERIOD_OPTIONS = [
    { label: "Day", value: "day" },
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
]

/**
 * Personal Profile Screen
 * Allows users to view and edit their profile information
 */
const Personal = () => {
    // Profile data state
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [editedProfile, setEditedProfile] = useState<Partial<UserProfileUpdate>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [resetting, setResetting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
    const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)

    // Text input states for decimal fields to handle display properly
    const [lengthInputText, setLengthInputText] = useState("")
    const [widthInputText, setWidthInputText] = useState("")
    const [calorieInputText, setCalorieInputText] = useState("")

    // Animated values for button effects
    const saveButtonScale = useRef(new Animated.Value(1)).current
    const resetButtonScale = useRef(new Animated.Value(1)).current

    // Use tab reload hook
    const { isReloading, animatedStyle } = useTabReload("personal", {
        onReload: async () => {
            // Reset all state when tab is reloaded
            setEditedProfile({})
            setValidationErrors({})
            setIsEditing(false)
            setShowPeriodDropdown(false)
            setLengthInputText("")
            setWidthInputText("")
            setCalorieInputText("")

            // Refresh profile data
            await fetchUserProfile()
        },
    })

    // Button press animation
    const animateButton = (animated: Animated.Value) => {
        Animated.sequence([
            Animated.timing(animated, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(animated, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start()
    }

    // Toggle edit mode
    const toggleEditMode = () => {
        if (isEditing) {
            // If currently in edit mode, cancel changes
            setEditedProfile({})
            setValidationErrors({})
            // Reset input text states
            setLengthInputText("")
            setWidthInputText("")
            setCalorieInputText("")
        } else {
            // Initialize input text states when entering edit mode
            setLengthInputText(formatNumberForInput(profile?.lengthReferencePoint || 0))
            setWidthInputText(formatNumberForInput(profile?.widthReferencePoint || 0))
            setCalorieInputText(formatNumberForInput(profile?.calorieLimit || 0))
        }
        setIsEditing(!isEditing)
    }

    // Reset to original values by refetching from API
    const resetToOriginal = async () => {
        animateButton(resetButtonScale)
        setResetting(true)
        try {
            await fetchUserProfile()
        } finally {
            setResetting(false)
        }
    }

    // Fetch profile data on component mount
    useEffect(() => {
        fetchUserProfile()
    }, [])

    // Fetch user profile from API
    const fetchUserProfile = async () => {
        try {
            setLoading(true)
            const response = await getData<UserProfile>(URL_USER_PROFILE)
            setProfile(response.data)
            setEditedProfile({})
            setValidationErrors({})
            // Reset input text states
            setLengthInputText("")
            setWidthInputText("")
            setCalorieInputText("")
        } catch (error) {
            showMessage(error)
        } finally {
            setLoading(false)
        }
    }

    // Validate data before saving
    const validateProfile = (): boolean => {
        const errors: ValidationErrors = {}

        // Validate age (0-200)
        const age = getValue("age") as number
        if (age < 0 || age > 200) {
            errors.age = "Age must be between 0 and 200"
        }

        // Validate height (0-999)
        const height = getValue("height") as number
        if (height < 0 || height > 999) {
            errors.height = "Height must be between 0 and 999"
        }

        // Validate weight (0-999)
        const weight = getValue("weight") as number
        if (weight < 0 || weight > 999) {
            errors.weight = "Weight must be between 0 and 999"
        }

        // Validate length reference point (0-20) - now supports decimals
        const lengthRef = getValue("lengthReferencePoint") as number
        if (lengthRef < 0 || lengthRef > 20) {
            errors.lengthReferencePoint = "Length reference point must be between 0 and 20"
        }

        // Validate width reference point (0-10) - now supports decimals
        const widthRef = getValue("widthReferencePoint") as number
        if (widthRef < 0 || widthRef > 10) {
            errors.widthReferencePoint = "Width reference point must be between 0 and 10"
        }

        // Validate calorie limit (only when not auto-calculated) - no upper limit, supports decimals
        if (!isAutoSetCalorieLimit()) {
            const calorieLimit = getValue("calorieLimit") as number
            if (calorieLimit < 0) {
                errors.calorieLimit = "Calorie limit cannot be negative"
            }
        }

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Check if there are any changes
    const hasChanges = (): boolean => {
        // If no fields have been edited, there are no changes
        if (Object.keys(editedProfile).length === 0) {
            return false
        }

        // Check each edited field
        for (const key in editedProfile) {
            const field = key as keyof typeof editedProfile
            let originalValue: any

            // Handle special fields
            if (field === "lengthReferencePointCustom") {
                originalValue = profile?.lengthReferencePoint
            } else if (field === "widthReferencePointCustom") {
                originalValue = profile?.widthReferencePoint
            } else {
                originalValue = profile?.[field as keyof UserProfile]
            }

            const newValue = editedProfile[field]

            // If value is different from original, there are changes
            if (originalValue !== newValue) {
                return true
            }
        }

        // All fields have reverted to original values
        return false
    }

    // Update user profile
    const updateProfile = async () => {
        // Button animation effect
        animateButton(saveButtonScale)

        // Check if there are any changes
        if (!hasChanges()) {
            showMessage({ message: "No changes to save" }, true)
            return
        }

        // Validate data
        if (!validateProfile()) {
            return
        }

        try {
            setSaving(true)

            // Create object with only changed values
            const changedValues: Record<string, any> = {}

            // Compare each field to determine which values have changed
            Object.keys(editedProfile).forEach((key) => {
                const field = key as keyof typeof editedProfile
                const originalValue = profile?.[field as keyof UserProfile]
                const newValue = editedProfile[field]

                // Only add to changedValues if value has actually changed
                if (originalValue !== newValue) {
                    changedValues[field] = newValue
                }
            })

            // Only call API if there are actual changes
            if (Object.keys(changedValues).length > 0) {
                const response = await patchData<UserProfile>(URL_USER_PROFILE, changedValues)
                setProfile(response.data)
            }

            setEditedProfile({})
            setValidationErrors({})
            setIsEditing(false)
            // Reset input text states
            setLengthInputText("")
            setWidthInputText("")
            setCalorieInputText("")
        } catch (error) {
            showMessage(error)
        } finally {
            setSaving(false)
        }
    }

    // Handle field value changes with decimal support
    const handleChange = (field: keyof UserProfile | keyof UserProfileUpdate, value: any) => {
        // Clear validation error for this field
        if (field in validationErrors) {
            setValidationErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[field as keyof ValidationErrors]
                return newErrors
            })
        }

        // Determine original value
        let originalValue: any
        let editedField: string = field as string

        // Handle special fields
        if (field === "lengthReferencePoint") {
            originalValue = profile?.lengthReferencePoint
            editedField = "lengthReferencePointCustom"
        } else if (field === "widthReferencePoint") {
            originalValue = profile?.widthReferencePoint
            editedField = "widthReferencePointCustom"
        } else {
            originalValue = profile?.[field as keyof UserProfile]
        }

        // Update editedProfile
        setEditedProfile((prev) => {
            const newEdited = { ...prev }

            // Use strict equality for comparison
            if (value === originalValue) {
                // If value reverts to original, remove field from editedProfile
                const typedField = editedField as keyof typeof newEdited
                if (typedField in newEdited) {
                    delete newEdited[typedField]
                }
            } else {
                // Type casting to avoid TypeScript errors
                ; (newEdited as any)[editedField] = value
            }

            return newEdited
        })
    }

    // Get current value (from editedProfile if available, otherwise from profile)
    const getValue = (field: keyof UserProfile) => {
        if (field === "lengthReferencePoint" && "lengthReferencePointCustom" in editedProfile) {
            return editedProfile.lengthReferencePointCustom
        }
        if (field === "widthReferencePoint" && "widthReferencePointCustom" in editedProfile) {
            return editedProfile.widthReferencePointCustom
        }
        return field in editedProfile ? editedProfile[field as keyof typeof editedProfile] : profile?.[field]
    }

    // Calculate reference area with decimal precision
    const calculateAreaReferencePoint = () => {
        const length = (getValue("lengthReferencePoint") as number) || 0
        const width = (getValue("widthReferencePoint") as number) || 0
        const area = length * width
        // Round to 4 decimal places for display
        return Math.round(area * 10000) / 10000
    }

    // Check if autoSetCalorieLimit is enabled
    const isAutoSetCalorieLimit = () => {
        return getValue("autoSetCalorieLimit") === true
    }

    // Get period label for calorie limit
    const getPeriodLabel = (value: string) => {
        const option = PERIOD_OPTIONS.find((opt) => opt.value === value)
        return option ? option.label : "Day"
    }

    const calculateCaloriePercentage = (): number => {
        if (!profile?.totalCalories || !profile?.calorieLimit || profile.calorieLimit === 0) {
            return 0
        }
        const percentage = (profile.totalCalories / profile.calorieLimit) * 100
        return percentage >= MAX_CALO_DISPLAY ? parseFloat(percentage.toExponential(2)) : parseFloat(percentage.toFixed(2))
    }

    // Determine progress bar color based on percentage
    const getProgressColor = () => {
        const percentage = calculateCaloriePercentage() // Ensure percentage is a number
        if (percentage < 80) return "#4caf50" // Green - good
        if (percentage < 100) return "#ff9800" // Orange - warning
        return "#f44336" // Red - exceeded
    }

    // Helper function to parse decimal input - STRICT validation for numbers only
    const parseDecimalInput = (text: string): number => {
        // Only allow digits, decimal point at the beginning
        const cleanText = text.replace(/[^0-9.]/g, "")

        // Handle multiple decimal points - keep only the first one
        const parts = cleanText.split(".")
        let result = parts[0]
        if (parts.length > 1) {
            result = parts[0] + "." + parts.slice(1).join("").replace(/\./g, "")
        }

        return Number.parseFloat(result) || 0
    }

    // Validate input text to only allow numbers and decimal point
    const validateNumericInput = (text: string): string => {
        // Only allow digits, one decimal point, and minus sign at the beginning
        let cleanText = text.replace(/[^0-9.]/g, "")

        // Handle decimal points
        const decimalCount = (cleanText.match(/\./g) || []).length
        if (decimalCount > 1) {
            const firstDecimalIndex = cleanText.indexOf(".")
            cleanText =
                cleanText.substring(0, firstDecimalIndex + 1) + cleanText.substring(firstDecimalIndex + 1).replace(/\./g, "")
        }

        return cleanText
    }

    // Format number for input field
    const formatNumberForInput = (value: number): string => {
        return value.toString()
    }

    // Handle decimal input changes with text state management and strict validation
    const handleDecimalInputChange = (field: keyof UserProfile, text: string, setInputText: (text: string) => void) => {
        // Validate and clean the input
        const validatedText = validateNumericInput(text)

        // Update the text input state with validated text
        setInputText(validatedText)

        // Parse and update the actual value
        const numericValue = parseDecimalInput(validatedText)
        handleChange(field, numericValue)
    }

    // Show loading indicator while fetching data
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0066cc" />
            </View>
        )
    }

    return (
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
            <SafeAreaView style={styles.container}>
                <StatusBar style="auto" />
                <KeyboardAvoidingView
                    behavior="height"
                    style={styles.keyboardAvoidingView}
                    keyboardVerticalOffset={0}
                    contentContainerStyle={{ flex: 1 }}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>User Profile</Text>
                        <TouchableOpacity style={styles.cancelButton} onPress={toggleEditMode} activeOpacity={0.7}>
                            <Text style={styles.cancelButtonText}>{isEditing ? "Cancel" : "Edit"}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formContainer}>
                        {!isEditing && profile?.totalCalories !== undefined && (
                            <View style={styles.calorieProgressContainer}>
                                <View style={styles.calorieInfoRow}>
                                    <Text style={styles.calorieTitle}>Calories Consumed (kcal) in {getPeriodLabel(profile.calorieLimitPeriod)}</Text>
                                    <Text style={styles.calorieValue} numberOfLines={1} adjustsFontSizeToFit>
                                        {formatDecimalDisplay(profile.totalCalories)} / {formatDecimalDisplay(profile.calorieLimit)}
                                    </Text>
                                </View>

                                <View style={styles.progressBarContainer}>
                                    <View
                                        style={[
                                            styles.progressBar,
                                            {
                                                width: `${Math.min(calculateCaloriePercentage(), 100)}%`,
                                                backgroundColor: getProgressColor(),
                                            },
                                        ]}
                                    />
                                    <View style={styles.progressTextContainer}>
                                        <Text style={styles.progressText}>{calculateCaloriePercentage()}%</Text>
                                    </View>
                                </View>

                                {calculateCaloriePercentage() > 100 && (
                                    <View style={styles.warningContainer}>
                                        <Text style={styles.warningText}>⚠️ Calorie limit exceeded!</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Gender and Age in one row */}
                        <View style={styles.rowContainer}>
                            <View style={[styles.columnContainer, { marginRight: 8 }]}>
                                <Text style={styles.fieldLabel}>Gender:</Text>
                                {isEditing ? (
                                    <View style={styles.switchContainer}>
                                        <Text style={styles.switchLabel}>
                                            {getValue("gender") === true ? "Male" : getValue("gender") === false ? "Female" : ""}
                                        </Text>
                                        <Switch
                                            value={getValue("gender") === true}
                                            onValueChange={(value) => handleChange("gender", value)}
                                            trackColor={{ false: "#e9e9e9", true: "#81b0ff" }}
                                            thumbColor={getValue("gender") === true ? "#0066cc" : "#f4f3f4"}
                                        />
                                    </View>
                                ) : (
                                    <Text style={styles.fieldValue}>
                                        {profile?.gender === true ? "Male" : profile?.gender === false ? "Female" : ""}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.columnContainer}>
                                <Text style={styles.fieldLabel}>Age:</Text>
                                {isEditing ? (
                                    <>
                                        <TextInput
                                            style={[styles.input, validationErrors.age && styles.inputError]}
                                            value={getValue("age")?.toString()}
                                            onChangeText={(text) => handleChange("age", Number.parseInt(text) || 0)}
                                            keyboardType="number-pad"
                                        />
                                        {validationErrors.age && <Text style={styles.errorText}>{validationErrors.age}</Text>}
                                    </>
                                ) : (
                                    <Text style={styles.fieldValue}>{profile?.age}</Text>
                                )}
                            </View>
                        </View>

                        {/* Height and Weight in one row */}
                        <View style={styles.rowContainer}>
                            <View style={[styles.columnContainer, { marginRight: 8 }]}>
                                <Text style={styles.fieldLabel}>Height (cm):</Text>
                                {isEditing ? (
                                    <>
                                        <TextInput
                                            style={[styles.input, validationErrors.height && styles.inputError]}
                                            value={getValue("height")?.toString()}
                                            onChangeText={(text) => handleChange("height", Number.parseInt(text) || 0)}
                                            keyboardType="number-pad"
                                        />
                                        {validationErrors.height && <Text style={styles.errorText}>{validationErrors.height}</Text>}
                                    </>
                                ) : (
                                    <Text style={styles.fieldValue}>{profile?.height}</Text>
                                )}
                            </View>

                            <View style={styles.columnContainer}>
                                <Text style={styles.fieldLabel}>Weight (kg):</Text>
                                {isEditing ? (
                                    <>
                                        <TextInput
                                            style={[styles.input, validationErrors.weight && styles.inputError]}
                                            value={getValue("weight")?.toString()}
                                            onChangeText={(text) => handleChange("weight", Number.parseInt(text) || 0)}
                                            keyboardType="number-pad"
                                        />
                                        {validationErrors.weight && <Text style={styles.errorText}>{validationErrors.weight}</Text>}
                                    </>
                                ) : (
                                    <Text style={styles.fieldValue}>{profile?.weight}</Text>
                                )}
                            </View>
                        </View>

                        {/* Auto-calculate calorie limit */}
                        {isEditing && (
                            <View style={styles.fieldRow}>
                                <Text style={styles.fieldLabel}>Auto-calculate calorie limit:</Text>
                                <View style={styles.switchContainer}>
                                    <Text style={styles.switchLabel}>{isAutoSetCalorieLimit() ? "On" : "Off"}</Text>
                                    <Switch
                                        value={isAutoSetCalorieLimit()}
                                        onValueChange={(value) => handleChange("autoSetCalorieLimit", value)}
                                        trackColor={{ false: "#e9e9e9", true: "#81b0ff" }}
                                        thumbColor={isAutoSetCalorieLimit() ? "#0066cc" : "#f4f3f4"}
                                    />
                                </View>
                            </View>
                        )}

                        <View style={styles.rowContainer}>
                            <View style={[styles.columnContainer, { marginRight: 8 }]}>
                                <Text style={styles.fieldLabel}>Calorie Limit (kcal):</Text>
                                {isEditing ? (
                                    <>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                isAutoSetCalorieLimit() && styles.disabledInput,
                                                validationErrors.calorieLimit && styles.inputError,
                                            ]}
                                            value={getValue("calorieLimit")?.toString()}
                                            onChangeText={(text) => handleChange("calorieLimit", text)}
                                            keyboardType="numeric"
                                            editable={!isAutoSetCalorieLimit()}
                                            maxLength={MAX_CALORIES.toString().length}
                                        />
                                        {validationErrors.calorieLimit && (
                                            <Text style={styles.errorText}>{validationErrors.calorieLimit}</Text>
                                        )}
                                    </>
                                ) : (
                                    <Text style={styles.fieldValue} numberOfLines={1} adjustsFontSizeToFit>
                                        {formatDecimalDisplay(profile?.calorieLimit)}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.columnContainer}>
                                <Text style={styles.fieldLabel}>Calorie Limit Period:</Text>
                                {isEditing ? (
                                    <View>
                                        <TouchableOpacity
                                            style={styles.dropdownButton}
                                            onPress={() => setShowPeriodDropdown(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.dropdownButtonText}>
                                                {getPeriodLabel(getValue("calorieLimitPeriod") as string)}
                                            </Text>
                                        </TouchableOpacity>

                                        <Modal
                                            visible={showPeriodDropdown}
                                            transparent={true}
                                            animationType="fade"
                                            onRequestClose={() => setShowPeriodDropdown(false)}
                                        >
                                            <TouchableOpacity
                                                style={styles.modalOverlay}
                                                activeOpacity={1}
                                                onPress={() => setShowPeriodDropdown(false)}
                                            >
                                                <View style={styles.dropdownModal}>
                                                    {PERIOD_OPTIONS.map((option) => (
                                                        <TouchableOpacity
                                                            key={option.value}
                                                            style={[
                                                                styles.dropdownItem,
                                                                getValue("calorieLimitPeriod") === option.value && styles.dropdownItemSelected,
                                                            ]}
                                                            onPress={() => {
                                                                handleChange("calorieLimitPeriod", option.value)
                                                                setShowPeriodDropdown(false)
                                                            }}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.dropdownItemText,
                                                                    getValue("calorieLimitPeriod") === option.value && styles.dropdownItemTextSelected,
                                                                ]}
                                                            >
                                                                {option.label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </TouchableOpacity>
                                        </Modal>
                                    </View>
                                ) : (
                                    <Text style={styles.fieldValue}>{getPeriodLabel(profile?.calorieLimitPeriod || "day")}</Text>
                                )}
                            </View>
                        </View>

                        {/* Length and Width Reference Points in one row - Now supports decimals */}
                        <View style={styles.rowContainer}>
                            <View style={[styles.columnContainer, { marginRight: 8 }]}>
                                <Text style={styles.fieldLabel}>Length Finger (cm):</Text>
                                {isEditing ? (
                                    <>
                                        <TextInput
                                            style={[styles.input, validationErrors.lengthReferencePoint && styles.inputError]}
                                            value={lengthInputText || getValue("lengthReferencePoint")?.toString()}
                                            onChangeText={(text) =>
                                                handleDecimalInputChange("lengthReferencePoint", text, setLengthInputText)
                                            }
                                            keyboardType="decimal-pad"
                                            maxLength={10}
                                        />
                                        {validationErrors.lengthReferencePoint && (
                                            <Text style={styles.errorText}>{validationErrors.lengthReferencePoint}</Text>
                                        )}
                                    </>
                                ) : (
                                    <Text style={styles.fieldValue} numberOfLines={1} adjustsFontSizeToFit>
                                        {profile?.lengthReferencePoint}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.columnContainer}>
                                <Text style={styles.fieldLabel}>Width Finger (cm):</Text>
                                {isEditing ? (
                                    <>
                                        <TextInput
                                            style={[styles.input, validationErrors.widthReferencePoint && styles.inputError]}
                                            value={widthInputText || getValue("widthReferencePoint")?.toString()}
                                            onChangeText={(text) => handleDecimalInputChange("widthReferencePoint", text, setWidthInputText)}
                                            keyboardType="decimal-pad"
                                            maxLength={10}
                                        />
                                        {validationErrors.widthReferencePoint && (
                                            <Text style={styles.errorText}>{validationErrors.widthReferencePoint}</Text>
                                        )}
                                    </>
                                ) : (
                                    <Text style={styles.fieldValue} numberOfLines={1} adjustsFontSizeToFit>
                                        {profile?.widthReferencePoint}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Area Reference Point - Now shows decimal precision */}
                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Area Finger (cm²):</Text>
                            <Text style={styles.fieldValue} numberOfLines={1} adjustsFontSizeToFit>
                                {isEditing
                                    ? calculateAreaReferencePoint()
                                    : profile?.areaReferencePoint}
                                {isEditing && <Text style={styles.calculatedText}> (length x width)</Text>}
                            </Text>
                        </View>

                        {/* Calorie unit note */}
                        <View style={styles.noteContainer}>
                            <Text style={styles.noteText}>Note: Calorie values are displayed in kilocalories (kcal)</Text>
                        </View>
                    </View>

                    {isEditing && (
                        <View style={styles.buttonContainer}>
                            <Animated.View style={{ transform: [{ scale: resetButtonScale }], flex: 1, marginRight: 8 }}>
                                <Pressable
                                    style={({ pressed }) => [styles.resetButton, pressed && styles.buttonPressed]}
                                    onPress={resetToOriginal}
                                    disabled={saving || resetting}
                                    android_ripple={{ color: "rgba(255, 255, 255, 0.4)" }}
                                >
                                    {resetting ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>Reset</Text>
                                    )}
                                </Pressable>
                            </Animated.View>

                            <Animated.View style={{ transform: [{ scale: saveButtonScale }], flex: 1, marginLeft: 8 }}>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.saveButton,
                                        !hasChanges() && styles.disabledButton,
                                        pressed && styles.buttonPressed,
                                    ]}
                                    onPress={updateProfile}
                                    disabled={saving || !hasChanges() || resetting}
                                    android_ripple={{ color: "rgba(255, 255, 255, 0.4)" }}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>Save Changes</Text>
                                    )}
                                </Pressable>
                            </Animated.View>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.lightGray,
    },
    keyboardAvoidingView: {
        flex: 1,
        padding: 16,
        justifyContent: "space-between",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#666",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
    },
    reloadingText: {
        fontSize: 14,
        color: "#007AFF",
        fontWeight: "600",
        position: "absolute",
        left: "50%",
        top: 30,
        transform: [{ translateX: -50 }],
    },
    cancelButton: {
        padding: 8,
        backgroundColor: "#0066cc",
        borderRadius: 8,
        ...Platform.select({
            web: {
                cursor: "pointer",
                transition: "background-color 0.2s",
            },
        }),
    },
    cancelButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    formContainer: {
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        flex: 1,
    },
    calorieProgressContainer: {
        marginBottom: 20,
        backgroundColor: "#f9f9f9",
        borderRadius: 10,
        padding: 10,
        paddingBottom: 15,
        borderWidth: 1,
        borderColor: "#eee",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    calorieInfoRow: {
        flexDirection: "column",
        marginBottom: 10,
    },
    calorieTitle: {
        fontWeight: "bold",
        textAlign: "center", // Center-align the text
    },
    calorieValue: {
        fontWeight: "bold",
        color: "#3498db",
        textAlign: "center", // Center-align the text
    },
    progressBarContainer: {
        height: 24,
        backgroundColor: Colors.borderGray,
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
    },
    progressBar: {
        position: "absolute",
        left: 0,
        top: 0,
        height: "100%",
        minWidth: 2,
    },
    progressTextContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    progressText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333",
        textShadowColor: "rgba(255, 255, 255, 0.8)",
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    warningContainer: {
        marginTop: 8,
        padding: 8,
        backgroundColor: "#fff3cd",
        borderRadius: 6,
    },
    warningText: {
        fontSize: 14,
        color: "#856404",
        fontWeight: "500",
        textAlign: "center",
    },
    rowContainer: {
        flexDirection: "row",
        marginBottom: 16,
        ...Platform.select({
            web: {
                flexWrap: "wrap",
            },
        }),
    },
    columnContainer: {
        flex: 1,
        minWidth: Platform.OS === "web" ? 200 : "auto",
        marginBottom: Platform.OS === "web" ? 8 : 0,
    },
    fieldRow: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4,
    },
    fieldValue: {
        fontSize: 16,
        color: "#333",
        fontWeight: "500",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 8,
        fontSize: 16,
        backgroundColor: "#f9f9f9",
        height: 40,
        ...Platform.select({
            web: {
                outlineColor: "#0066cc",
                outlineWidth: "1px",
            },
        }),
    },
    inputError: {
        borderColor: "#dc3545",
    },
    errorText: {
        color: "#dc3545",
        fontSize: 12,
        marginTop: 2,
        marginBottom: 4,
    },
    disabledInput: {
        backgroundColor: "#e9e9e9",
        color: "#999",
    },
    switchContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    switchLabel: {
        fontSize: 16,
        color: "#333",
    },
    dropdownButton: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 8,
        backgroundColor: "#f9f9f9",
        height: 40,
        justifyContent: "center",
        ...Platform.select({
            web: {
                cursor: "pointer",
            },
        }),
    },
    dropdownButtonText: {
        fontSize: 16,
        color: "#333",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    dropdownModal: {
        backgroundColor: "#fff",
        borderRadius: 8,
        width: "80%",
        maxWidth: 400,
        overflow: "hidden",
    },
    dropdownItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        ...Platform.select({
            web: {
                cursor: "pointer",
                transition: "background-color 0.2s",
            },
        }),
    },
    dropdownItemSelected: {
        backgroundColor: "#e6f0ff",
    },
    dropdownItemText: {
        fontSize: 16,
        color: "#333",
    },
    dropdownItemTextSelected: {
        color: "#0066cc",
        fontWeight: "bold",
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 16,
        ...Platform.select({
            web: {
                flexWrap: "wrap",
            },
        }),
    },
    saveButton: {
        backgroundColor: "#0066cc",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        height: 50,
        ...Platform.select({
            web: {
                cursor: "pointer",
                transition: "background-color 0.2s",
            },
        }),
    },
    resetButton: {
        backgroundColor: "#1a8676",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        height: 50,
        ...Platform.select({
            web: {
                cursor: "pointer",
                transition: "background-color 0.2s",
            },
        }),
    },
    buttonPressed: {
        opacity: 0.85,
        backgroundColor: Platform.OS === "android" ? undefined : "#0055aa",
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    calculatedText: {
        fontSize: 14,
        color: "#666",
        fontStyle: "italic",
    },
    noteContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: "#f0f8ff",
        borderRadius: 8,
    },
    noteText: {
        fontSize: 12,
        color: "#666",
        fontStyle: "italic",
        textAlign: "center",
    },
})

export default Personal
