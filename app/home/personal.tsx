"use client"

import { URL_USER_PROFILE } from "@/constants/url_constants"
import { getData, patchData } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import { StatusBar } from "expo-status-bar"
import { useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native"
import { TextInput } from "react-native-gesture-handler"

// Lấy kích thước màn hình
const { width, height } = Dimensions.get("window")

// Định nghĩa kiểu dữ liệu cho profile
interface UserProfile {
    gender: boolean | null
    age: number
    height: number
    weight: number
    calorieLimit: number
    calorieLimitPeriod: string
    lengthReferencePoint: number
    widthReferencePoint: number
    areaReferencePoint: number
    autoSetCalorieLimit?: boolean
}

// Thêm interface cho dữ liệu cập nhật
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

// Interface cho lỗi xác thực
interface ValidationErrors {
    age?: string
    height?: string
    weight?: string
    lengthReferencePoint?: string
    widthReferencePoint?: string
    calorieLimit?: string
}

// Các tùy chọn chu kỳ giới hạn calo
const PERIOD_OPTIONS = [
    { label: "Ngày", value: "day" },
    { label: "Tuần", value: "week" },
    { label: "Tháng", value: "month" },
]

const Personal = () => {
    // State cho dữ liệu profile
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [editedProfile, setEditedProfile] = useState<Partial<UserProfileUpdate>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [resetting, setResetting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
    const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)

    // Animated values cho hiệu ứng nút
    const saveButtonScale = useRef(new Animated.Value(1)).current
    const resetButtonScale = useRef(new Animated.Value(1)).current

    // Hiệu ứng khi nhấn nút
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

    // Hàm chuyển đổi chế độ chỉnh sửa
    const toggleEditMode = () => {
        if (isEditing) {
            // Nếu đang ở chế độ chỉnh sửa, hủy các thay đổi
            setEditedProfile({})
            setValidationErrors({})
        }
        setIsEditing(!isEditing)
    }

    // Hàm reset về giá trị ban đầu bằng cách gọi lại API
    const resetToOriginal = async () => {
        animateButton(resetButtonScale)
        setResetting(true)
        try {
            await fetchUserProfile()
        } finally {
            setResetting(false)
        }
    }

    // Lấy dữ liệu profile khi component mount
    useEffect(() => {
        fetchUserProfile()
    }, [])

    // Hàm lấy dữ liệu profile từ API
    const fetchUserProfile = async () => {
        try {
            setLoading(true)
            const response = await getData<UserProfile>(URL_USER_PROFILE)
            setProfile(response.data)
            setEditedProfile({})
            setValidationErrors({})
        } catch (error) {
            showMessage(error)
        } finally {
            setLoading(false)
        }
    }

    // Xác thực dữ liệu trước khi lưu
    const validateProfile = (): boolean => {
        const errors: ValidationErrors = {}

        // Xác thực tuổi (0-200)
        const age = getValue("age") as number
        if (age < 0 || age > 200) {
            errors.age = "Tuổi phải từ 0 đến 200"
        }

        // Xác thực chiều cao (0-999)
        const height = getValue("height") as number
        if (height < 0 || height > 999) {
            errors.height = "Chiều cao phải từ 0 đến 999"
        }

        // Xác thực cân nặng (0-999)
        const weight = getValue("weight") as number
        if (weight < 0 || weight > 999) {
            errors.weight = "Cân nặng phải từ 0 đến 999"
        }

        // Xác thực điểm tham chiếu chiều dài (0-20)
        const lengthRef = getValue("lengthReferencePoint") as number
        if (lengthRef < 0 || lengthRef > 20) {
            errors.lengthReferencePoint = "Điểm tham chiếu chiều dài phải từ 0 đến 20"
        }

        // Xác thực điểm tham chiếu chiều rộng (0-10)
        const widthRef = getValue("widthReferencePoint") as number
        if (widthRef < 0 || widthRef > 10) {
            errors.widthReferencePoint = "Điểm tham chiếu chiều rộng phải từ 0 đến 10"
        }

        // Xác thực giới hạn calo (chỉ khi không tự động tính)
        if (!isAutoSetCalorieLimit()) {
            const calorieLimit = getValue("calorieLimit") as number
            if (calorieLimit < 0) {
                errors.calorieLimit = "Giới hạn calo không được âm"
            }
        }

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Kiểm tra xem có thay đổi nào không
    const hasChanges = (): boolean => {
        // Nếu không có trường nào được chỉnh sửa, không có thay đổi
        if (Object.keys(editedProfile).length === 0) {
            return false
        }

        // Kiểm tra từng trường đã chỉnh sửa
        for (const key in editedProfile) {
            const field = key as keyof typeof editedProfile
            let originalValue: any

            // Xử lý các trường đặc biệt
            if (field === "lengthReferencePointCustom") {
                originalValue = profile?.lengthReferencePoint
            } else if (field === "widthReferencePointCustom") {
                originalValue = profile?.widthReferencePoint
            } else {
                originalValue = profile?.[field as keyof UserProfile]
            }

            const newValue = editedProfile[field]

            // Nếu giá trị khác với giá trị ban đầu, có thay đổi
            if (originalValue !== newValue) {
                return true
            }
        }

        // Tất cả các trường đã quay lại giá trị ban đầu
        return false
    }

    // Hàm cập nhật profile
    const updateProfile = async () => {
        // Hiệu ứng nút
        animateButton(saveButtonScale)

        // Kiểm tra xem có thay đổi nào không
        if (!hasChanges()) {
            showMessage({ message: "Không có thay đổi nào để lưu" }, true)
            return
        }

        // Xác thực dữ liệu
        if (!validateProfile()) {
            return
        }

        try {
            setSaving(true)

            // Tạo đối tượng chứa chỉ những giá trị đã thay đổi
            const changedValues: Partial<UserProfileUpdate> = {}

            // So sánh từng trường để xác định giá trị nào đã thay đổi
            Object.keys(editedProfile).forEach((key) => {
                const field = key as keyof typeof editedProfile
                const originalValue = profile?.[field as keyof UserProfile]
                const newValue = editedProfile[field]

                // Chỉ thêm vào changedValues nếu giá trị thực sự thay đổi
                if (originalValue !== newValue) {
                    changedValues[field] = newValue
                }
            })

            // Chỉ gọi API nếu có thay đổi thực sự
            if (Object.keys(changedValues).length > 0) {
                const response = await patchData<UserProfile>(URL_USER_PROFILE, changedValues)
                setProfile(response.data)
            } else {
                // Không có thay đổi thực sự, chỉ cập nhật UI
                console.log("No actual changes to save")
            }

            setEditedProfile({})
            setValidationErrors({})
            setIsEditing(false)
        } catch (error) {
            showMessage(error)
        } finally {
            setSaving(false)
        }
    }

    // Hàm xử lý thay đổi giá trị
    const handleChange = (field: keyof UserProfile | keyof UserProfileUpdate, value: any) => {
        // Xóa lỗi xác thực cho trường này
        if (field in validationErrors) {
            setValidationErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[field as keyof ValidationErrors]
                return newErrors
            })
        }

        // Xác định giá trị ban đầu
        let originalValue: any
        let editedField: string = field as string

        // Xử lý các trường đặc biệt
        if (field === "lengthReferencePoint") {
            originalValue = profile?.lengthReferencePoint
            editedField = "lengthReferencePointCustom"
        } else if (field === "widthReferencePoint") {
            originalValue = profile?.widthReferencePoint
            editedField = "widthReferencePointCustom"
        } else {
            originalValue = profile?.[field as keyof UserProfile]
        }

        // Cập nhật editedProfile
        setEditedProfile((prev) => {
            const newEdited = { ...prev }

            // Sử dụng strict equality để so sánh
            if (value === originalValue) {
                // Nếu giá trị quay lại giá trị ban đầu, xóa trường khỏi editedProfile
                const typedField = editedField as keyof typeof newEdited
                if (typedField in newEdited) {
                    delete newEdited[typedField]
                }
            } else {
                // Ép kiểu để tránh lỗi TypeScript
                ; (newEdited as any)[editedField] = value
            }

            return newEdited
        })
    }

    // Lấy giá trị hiện tại (từ editedProfile nếu có, nếu không thì từ profile)
    const getValue = (field: keyof UserProfile) => {
        if (field === "lengthReferencePoint" && "lengthReferencePointCustom" in editedProfile) {
            return editedProfile.lengthReferencePointCustom
        }
        if (field === "widthReferencePoint" && "widthReferencePointCustom" in editedProfile) {
            return editedProfile.widthReferencePointCustom
        }
        return field in editedProfile ? editedProfile[field as keyof typeof editedProfile] : profile?.[field]
    }

    // Tính toán diện tích tham chiếu
    const calculateAreaReferencePoint = () => {
        const length = (getValue("lengthReferencePoint") as number) || 0
        const width = (getValue("widthReferencePoint") as number) || 0
        return length * width
    }

    // Kiểm tra xem autoSetCalorieLimit có được bật không
    const isAutoSetCalorieLimit = () => {
        return getValue("autoSetCalorieLimit") === true
    }

    // Lấy nhãn chu kỳ giới hạn calo
    const getPeriodLabel = (value: string) => {
        const option = PERIOD_OPTIONS.find((opt) => opt.value === value)
        return option ? option.label : "Ngày"
    }

    // Hiển thị loading khi đang tải dữ liệu
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0066cc" />
                <Text style={styles.loadingText}>Đang tải thông tin...</Text>
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="auto" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingView}
                keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
                contentContainerStyle={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Hồ Sơ Người Dùng</Text>
                    <TouchableOpacity style={styles.cancelButton} onPress={toggleEditMode} activeOpacity={0.7}>
                        <Text style={styles.cancelButtonText}>{isEditing ? "Hủy" : "Chỉnh sửa"}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.formContainer}>
                    {/* Giới tính và Tuổi trên cùng một dòng */}
                    <View style={styles.rowContainer}>
                        <View style={[styles.columnContainer, { marginRight: 8 }]}>
                            <Text style={styles.fieldLabel}>Giới tính:</Text>
                            {isEditing ? (
                                <View style={styles.switchContainer}>
                                    <Text style={styles.switchLabel}>{getValue("gender") ? "Nam" : "Nữ"}</Text>
                                    <Switch
                                        value={getValue("gender") === true}
                                        onValueChange={(value) => handleChange("gender", value)}
                                        trackColor={{ false: "#e9e9e9", true: "#81b0ff" }}
                                        thumbColor={getValue("gender") === true ? "#0066cc" : "#f4f3f4"}
                                    />
                                </View>
                            ) : (
                                <Text style={styles.fieldValue}>{profile?.gender ? "Nam" : "Nữ"}</Text>
                            )}
                        </View>

                        <View style={styles.columnContainer}>
                            <Text style={styles.fieldLabel}>Tuổi:</Text>
                            {isEditing ? (
                                <>
                                    <TextInput
                                        style={[styles.input, validationErrors.age && styles.inputError]}
                                        value={getValue("age")?.toString()}
                                        onChangeText={(text) => handleChange("age", Number.parseInt(text) || 0)}
                                        keyboardType="number-pad"
                                        placeholder="0-200"
                                    />
                                    {validationErrors.age && <Text style={styles.errorText}>{validationErrors.age}</Text>}
                                </>
                            ) : (
                                <Text style={styles.fieldValue}>{profile?.age}</Text>
                            )}
                        </View>
                    </View>

                    {/* Chiều cao và Cân nặng trên cùng một dòng */}
                    <View style={styles.rowContainer}>
                        <View style={[styles.columnContainer, { marginRight: 8 }]}>
                            <Text style={styles.fieldLabel}>Chiều cao (cm):</Text>
                            {isEditing ? (
                                <>
                                    <TextInput
                                        style={[styles.input, validationErrors.height && styles.inputError]}
                                        value={getValue("height")?.toString()}
                                        onChangeText={(text) => handleChange("height", Number.parseInt(text) || 0)}
                                        keyboardType="number-pad"
                                        placeholder="0-999"
                                    />
                                    {validationErrors.height && <Text style={styles.errorText}>{validationErrors.height}</Text>}
                                </>
                            ) : (
                                <Text style={styles.fieldValue}>{profile?.height}</Text>
                            )}
                        </View>

                        <View style={styles.columnContainer}>
                            <Text style={styles.fieldLabel}>Cân nặng (kg):</Text>
                            {isEditing ? (
                                <>
                                    <TextInput
                                        style={[styles.input, validationErrors.weight && styles.inputError]}
                                        value={getValue("weight")?.toString()}
                                        onChangeText={(text) => handleChange("weight", Number.parseInt(text) || 0)}
                                        keyboardType="number-pad"
                                        placeholder="0-999"
                                    />
                                    {validationErrors.weight && <Text style={styles.errorText}>{validationErrors.weight}</Text>}
                                </>
                            ) : (
                                <Text style={styles.fieldValue}>{profile?.weight}</Text>
                            )}
                        </View>
                    </View>

                    {/* Tự động tính giới hạn calo */}
                    {isEditing && (
                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Tự động tính giới hạn calo:</Text>
                            <View style={styles.switchContainer}>
                                <Text style={styles.switchLabel}>{isAutoSetCalorieLimit() ? "Bật" : "Tắt"}</Text>
                                <Switch
                                    value={isAutoSetCalorieLimit()}
                                    onValueChange={(value) => handleChange("autoSetCalorieLimit", value)}
                                    trackColor={{ false: "#e9e9e9", true: "#81b0ff" }}
                                    thumbColor={isAutoSetCalorieLimit() ? "#0066cc" : "#f4f3f4"}
                                />
                            </View>
                        </View>
                    )}

                    {/* Giới hạn calo và Chu kỳ trên cùng một dòng */}
                    <View style={styles.rowContainer}>
                        <View style={[styles.columnContainer, { marginRight: 8 }]}>
                            <Text style={styles.fieldLabel}>Giới hạn calo:</Text>
                            {isEditing ? (
                                <>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            isAutoSetCalorieLimit() && styles.disabledInput,
                                            validationErrors.calorieLimit && styles.inputError,
                                        ]}
                                        value={getValue("calorieLimit")?.toString()}
                                        onChangeText={(text) => handleChange("calorieLimit", Number.parseFloat(text) || 0)}
                                        keyboardType="number-pad"
                                        editable={!isAutoSetCalorieLimit()}
                                    />
                                    {validationErrors.calorieLimit && (
                                        <Text style={styles.errorText}>{validationErrors.calorieLimit}</Text>
                                    )}
                                </>
                            ) : (
                                <Text style={styles.fieldValue}>{profile?.calorieLimit}</Text>
                            )}
                        </View>

                        <View style={styles.columnContainer}>
                            <Text style={styles.fieldLabel}>Chu kỳ giới hạn calo:</Text>
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

                    {/* Điểm tham chiếu chiều dài và chiều rộng trên cùng một dòng */}
                    <View style={styles.rowContainer}>
                        <View style={[styles.columnContainer, { marginRight: 8 }]}>
                            <Text style={styles.fieldLabel}>Điểm tham chiếu dài:</Text>
                            {isEditing ? (
                                <>
                                    <TextInput
                                        style={[styles.input, validationErrors.lengthReferencePoint && styles.inputError]}
                                        value={getValue("lengthReferencePoint")?.toString()}
                                        onChangeText={(text) => handleChange("lengthReferencePoint", Number.parseFloat(text) || 0)}
                                        keyboardType="decimal-pad"
                                        placeholder="0-20"
                                    />
                                    {validationErrors.lengthReferencePoint && (
                                        <Text style={styles.errorText}>{validationErrors.lengthReferencePoint}</Text>
                                    )}
                                </>
                            ) : (
                                <Text style={styles.fieldValue}>{profile?.lengthReferencePoint}</Text>
                            )}
                        </View>

                        <View style={styles.columnContainer}>
                            <Text style={styles.fieldLabel}>Điểm tham chiếu rộng:</Text>
                            {isEditing ? (
                                <>
                                    <TextInput
                                        style={[styles.input, validationErrors.widthReferencePoint && styles.inputError]}
                                        value={getValue("widthReferencePoint")?.toString()}
                                        onChangeText={(text) => handleChange("widthReferencePoint", Number.parseFloat(text) || 0)}
                                        keyboardType="decimal-pad"
                                        placeholder="0-10"
                                    />
                                    {validationErrors.widthReferencePoint && (
                                        <Text style={styles.errorText}>{validationErrors.widthReferencePoint}</Text>
                                    )}
                                </>
                            ) : (
                                <Text style={styles.fieldValue}>{profile?.widthReferencePoint}</Text>
                            )}
                        </View>
                    </View>

                    {/* Điểm tham chiếu diện tích */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>Điểm tham chiếu diện tích:</Text>
                        <Text style={styles.fieldValue}>
                            {isEditing ? calculateAreaReferencePoint() : profile?.areaReferencePoint}
                            {isEditing && <Text style={styles.calculatedText}> (dài × rộng)</Text>}
                        </Text>
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
                                    <Text style={styles.buttonText}>Đặt lại</Text>
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
                                    <Text style={styles.buttonText}>Lưu thay đổi</Text>
                                )}
                            </Pressable>
                        </Animated.View>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
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
        color: "#333",
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
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 16,
        flex: 1,
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
        backgroundColor: "#1a8676", // Darker teal color
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
})

export default Personal
