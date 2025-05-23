"use client"

import { URL_FOOD_CALO_ESTIMATOR } from "@/constants/url_constants"
import { patchData, postData } from "@/context/request_context"
import { showMessage } from "@/utils/showMessage"
import React, { useState } from "react"
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

// Simplified type definitions
type ImageAsset = {
    uri: string
    type?: string
    fileName?: string
    fileSize?: number
    file?: File
}

type PredictionResult = {
    id: string
    predict: number
    confidencePercentage: string
    createdAt: string
    publicUrl: {
        originImage: string
        segmentationImage: string
    }
    predictName: string
    comment: string
    calo: number
}

// Cross-platform modules
let ImagePicker: any
let AsyncStorage: any

if (Platform.OS === "web") {
    // Web implementations
    ImagePicker = {
        requestMediaLibraryPermissionsAsync: async () => ({ status: "granted" }),
        launchImageLibraryAsync: async () => {
            return new Promise<ImagePickerResult>((resolve) => {
                const input = document.createElement("input")
                input.type = "file"
                input.accept = "image/*"

                input.onchange = (e: Event) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (!file) {
                        resolve({ canceled: true, assets: [] })
                        return
                    }

                    const reader = new FileReader()
                    reader.onload = () => {
                        resolve({
                            canceled: false,
                            assets: [
                                {
                                    uri: reader.result as string,
                                    type: file.type,
                                    fileName: file.name,
                                    fileSize: file.size,
                                    file: file,
                                },
                            ],
                        })
                    }
                    reader.readAsDataURL(file)
                }
                input.click()
            })
        },
    }

    AsyncStorage = {
        getItem: (key: string) => localStorage.getItem(key),
        setItem: (key: string, value: string) => localStorage.setItem(key, value),
    }
} else {
    ImagePicker = require("expo-image-picker")
    AsyncStorage = require("@react-native-async-storage/async-storage").default
}

type ImagePickerResult = {
    canceled: boolean
    assets: ImageAsset[]
}

// Image Modal Component
const ImageModal: React.FC<{
    visible: boolean
    imageUri: string
    onClose: () => void
}> = ({ visible, imageUri, onClose }) => {
    if (Platform.OS === "web") {
        if (!visible) return null
        return (
            <div style={webModalStyles.overlay} onClick={onClose}>
                <div style={webModalStyles.content} onClick={(e) => e.stopPropagation()}>
                    <img src={imageUri || "/placeholder.svg"} alt="Full size" style={webModalStyles.image} />
                    <button onClick={onClose} style={webModalStyles.closeButton}>
                        ✕
                    </button>
                </div>
            </div>
        )
    }

    const { width, height } = Dimensions.get("window")
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
                <View style={styles.modalContent}>
                    <Image
                        source={{ uri: imageUri }}
                        style={[styles.fullImage, { maxWidth: width - 40, maxHeight: height - 100 }]}
                        resizeMode="contain"
                    />
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    )
}

// Edit Modal Component
const EditModal: React.FC<{
    visible: boolean
    initialCalo: string
    initialComment: string
    onSave: (calo: string, comment: string) => void
    onCancel: () => void
}> = ({ visible, initialCalo, initialComment, onSave, onCancel }) => {
    const [editedCalo, setEditedCalo] = useState(initialCalo)
    const [editedComment, setEditedComment] = useState(initialComment)

    React.useEffect(() => {
        setEditedCalo(initialCalo)
        setEditedComment(initialComment)
    }, [initialCalo, initialComment, visible])

    const handleSave = () => {
        onSave(editedCalo, editedComment)
    }

    if (!visible) return null

    if (Platform.OS === "web") {
        return (
            <div style={webModalStyles.overlay} onClick={onCancel}>
                <div style={webModalStyles.editContent} onClick={(e) => e.stopPropagation()}>
                    <h3 style={{ marginBottom: "15px", fontSize: "18px" }}>Chỉnh sửa thông tin</h3>

                    <div style={{ marginBottom: "15px" }}>
                        <label style={{ display: "block", marginBottom: "5px" }}>Calories:</label>
                        <input
                            type="number"
                            value={editedCalo}
                            onChange={(e) => setEditedCalo(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", marginBottom: "5px" }}>Ghi chú:</label>
                        <textarea
                            value={editedComment}
                            onChange={(e) => setEditedComment(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                                minHeight: "80px",
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <button
                            onClick={onCancel}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                                background: "#f5f5f5",
                                cursor: "pointer",
                            }}
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "4px",
                                border: "none",
                                background: "#3498db",
                                color: "white",
                                cursor: "pointer",
                            }}
                        >
                            Lưu
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <TouchableOpacity style={styles.modalOverlay} onPress={onCancel} activeOpacity={1}>
                <View style={styles.editModalContent}>
                    <Text style={styles.editModalTitle}>Chỉnh sửa thông tin</Text>

                    <View style={styles.editInputGroup}>
                        <Text style={styles.editInputLabel}>Calories:</Text>
                        <TextInput
                            style={styles.editInput}
                            value={editedCalo}
                            onChangeText={setEditedCalo}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.editInputGroup}>
                        <Text style={styles.editInputLabel}>Ghi chú:</Text>
                        <TextInput
                            style={[styles.editInput, styles.editTextarea]}
                            value={editedComment}
                            onChangeText={setEditedComment}
                            multiline
                        />
                    </View>

                    <View style={styles.editButtonGroup}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                            <Text style={styles.cancelButtonText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>Lưu</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    )
}

const Index: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [result, setResult] = useState<PredictionResult | null>(null)
    const [modalVisible, setModalVisible] = useState(false)
    const [modalImageUri, setModalImageUri] = useState("")
    const [isEditing, setIsEditing] = useState(false)

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (status !== "granted" && Platform.OS !== "web") {
                Alert.alert("Cần quyền truy cập", "Vui lòng cho phép ứng dụng truy cập thư viện ảnh")
                return
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: Platform.OS === "web" ? "Images" : ["Images"],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            })

            if (!result.canceled && result.assets?.[0]) {
                setSelectedImage(result.assets[0])
                setResult(null) // Reset previous result
            }
        } catch (error) {
            console.error("Error picking image:", error)
            showMessage({ message: "Lỗi khi chọn ảnh" })
        }
    }

    const processImage = async () => {
        if (!selectedImage) return

        try {
            setIsProcessing(true)
            const formData = new FormData()

            if (Platform.OS === "web" && selectedImage.file) {
                formData.append("imageFile", selectedImage.file)
            } else {
                const uri = selectedImage.uri
                const filename = uri.split("/").pop() || "photo.jpg"
                const match = /\.(\w+)$/.exec(filename.toLowerCase())
                const type = match ? `image/${match[1]}` : "image/jpeg"

                formData.append("imageFile", {
                    uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
                    name: filename,
                    type: type,
                } as any)
            }

            const response = await postData<PredictionResult>(URL_FOOD_CALO_ESTIMATOR, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Accept: "application/json",
                },
            })

            setResult(response.data)
        } catch (error) {
            console.error("Error processing image:", error)
            showMessage(error)
        } finally {
            setIsProcessing(false)
        }
    }

    const reset = () => {
        setSelectedImage(null)
        setResult(null)
    }

    const openImageModal = (uri: string) => {
        setModalImageUri(uri)
        setModalVisible(true)
    }

    const closeImageModal = () => {
        setModalVisible(false)
    }

    const startEditing = () => {
        setIsEditing(true)
    }

    const saveEditedItem = async (calo: string, comment: string) => {
        if (!result) return

        try {
            const updatedData = {
                calo: Number(calo),
                comment: comment,
            }

            const response = await patchData<PredictionResult>(`${URL_FOOD_CALO_ESTIMATOR}/${result.id}`, updatedData)

            if (response.status === 200) {
                setResult(response.data)
            }

            setIsEditing(false)
        } catch (error) {
            console.error("Error updating food item:", error)
            showMessage({ message: "Lỗi khi cập nhật thông tin" })
        }
    }

    const cancelEditing = () => {
        setIsEditing(false)
    }

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const day = date.getDate()
        const month = date.getMonth() + 1
        const year = date.getFullYear()
        const hours = date.getHours()
        const minutes = String(date.getMinutes()).padStart(2, "0")
        return `${day}/${month}/${year} • ${hours}:${minutes}`
    }

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Dự đoán Calories từ hình ảnh</Text>
                <Text style={styles.headerSubtitle}>Chụp hoặc tải lên ảnh món ăn để phân tích</Text>
            </View>

            {/* Image Selection Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Chọn hình ảnh</Text>

                {selectedImage ? (
                    <TouchableOpacity
                        onPress={() => openImageModal(selectedImage.uri)}
                        style={styles.selectedImageContainer}
                        activeOpacity={0.9}
                    >
                        <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} resizeMode="contain" />
                        <View style={styles.imageOverlay}>
                            <Text style={styles.tapHint}>Nhấn để xem đầy đủ</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Text style={styles.placeholderIcon}>📷</Text>
                        <Text style={styles.placeholderText}>Chưa có ảnh</Text>
                    </View>
                )}

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.button} onPress={pickImage}>
                        <Text style={styles.buttonText}>Chọn ảnh</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.analyzeButton, (!selectedImage || isProcessing) && styles.disabledButton]}
                        disabled={!selectedImage || isProcessing}
                        onPress={processImage}
                    >
                        <Text style={styles.buttonText}>{isProcessing ? "Đang xử lý..." : "Phân tích"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.resetButton, !selectedImage && !result && styles.disabledButton]}
                        disabled={!selectedImage && !result}
                        onPress={reset}
                    >
                        <Text style={styles.buttonText}>Đặt lại</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Results Card */}
            {result && !isProcessing && (
                <View style={styles.card}>
                    <View style={styles.resultHeader}>
                        <Text style={styles.cardTitle}>Kết quả phân tích</Text>
                        <Text style={styles.resultTimestamp}>{formatDate(result.createdAt)}</Text>
                    </View>

                    {/* Highlight Result */}
                    <View style={styles.highlightResult}>
                        <Text style={styles.foodNameResult}>{result.predictName}</Text>
                        <Text style={styles.caloriesResult}>{result.calo} calories</Text>
                        <View style={styles.confidenceBadge}>
                            <Text style={styles.confidenceText}>Độ tin cậy: {result.confidencePercentage}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.editButton} onPress={startEditing}>
                        <Text style={styles.editButtonText}>✎ Chỉnh sửa</Text>
                    </TouchableOpacity>

                    {/* Result Images */}
                    <View style={styles.resultImagesRow}>
                        <TouchableOpacity
                            style={styles.resultImageContainer}
                            onPress={() => openImageModal(result.publicUrl.originImage)}
                            activeOpacity={0.9}
                        >
                            <Image source={{ uri: result.publicUrl.originImage }} style={styles.resultImage} resizeMode="contain" />
                            <View style={styles.imageLabel}>
                                <Text style={styles.imageLabelText}>Ảnh gốc</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resultImageContainer}
                            onPress={() => openImageModal(result.publicUrl.segmentationImage)}
                            activeOpacity={0.9}
                        >
                            <Image
                                source={{ uri: result.publicUrl.segmentationImage }}
                                style={styles.resultImage}
                                resizeMode="contain"
                            />
                            <View style={styles.imageLabel}>
                                <Text style={styles.imageLabelText}>Ảnh phân đoạn</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Additional Details */}
                    {result.comment && (
                        <View style={styles.commentContainer}>
                            <Text style={styles.commentText}>{result.comment}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Image Modal */}
            <ImageModal visible={modalVisible} imageUri={modalImageUri} onClose={closeImageModal} />

            {/* Edit Modal */}
            {result && (
                <EditModal
                    visible={isEditing}
                    initialCalo={result.calo.toString()}
                    initialComment={result.comment || ""}
                    onSave={saveEditedItem}
                    onCancel={cancelEditing}
                />
            )}
        </ScrollView>
    )
}

// Web modal styles
const webModalStyles = {
    overlay: {
        position: "fixed" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    content: {
        position: "relative" as const,
        maxWidth: "90%",
        maxHeight: "90%",
    },
    image: {
        maxWidth: "100%",
        maxHeight: "90vh",
        borderRadius: "8px",
        objectFit: "contain" as const,
    },
    closeButton: {
        position: "absolute" as const,
        top: "-15px",
        right: "-15px",
        backgroundColor: "#fff",
        border: "none",
        borderRadius: "50%",
        width: "40px",
        height: "40px",
        fontSize: "18px",
        fontWeight: "bold",
        color: "#333",
        cursor: "pointer",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    editContent: {
        position: "relative" as const,
        backgroundColor: "#fff",
        padding: "20px",
        borderRadius: "8px",
        maxWidth: "400px",
        width: "90%",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    },
}

const styles = StyleSheet.create({
    container: {
        padding: 12,
        backgroundColor: "#f8f9fa",
    },
    header: {
        marginBottom: 12,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        color: "#2c3e50",
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#6c757d",
        textAlign: "center",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
        color: "#34495e",
    },
    selectedImageContainer: {
        position: "relative",
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#f8f9fa",
        marginBottom: 10,
        height: 150,
    },
    selectedImage: {
        width: "100%",
        height: "100%",
        resizeMode: "contain",
    },
    imageOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: 6,
        alignItems: "center",
    },
    tapHint: {
        color: "#fff",
        fontSize: 14,
    },
    imagePlaceholder: {
        height: 150,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e9ecef",
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        marginBottom: 10,
    },
    placeholderIcon: {
        fontSize: 28,
        color: "#adb5bd",
        marginBottom: 6,
    },
    placeholderText: {
        color: "#6c757d",
        fontSize: 14,
        fontWeight: "500",
    },
    buttonRow: {
        flexDirection: "row",
        gap: 8,
    },
    button: {
        flex: 1,
        backgroundColor: "#3498db",
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    analyzeButton: {
        backgroundColor: "#2ecc71",
    },
    resetButton: {
        backgroundColor: "#e74c3c",
    },
    disabledButton: {
        backgroundColor: "#bdc3c7",
    },
    buttonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    resultHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    resultTimestamp: {
        fontSize: 12,
        color: "#6c757d",
    },
    highlightResult: {
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
        alignItems: "center",
    },
    foodNameResult: {
        fontSize: 18,
        fontWeight: "700",
        color: "#2c3e50",
        textAlign: "center",
        marginBottom: 2,
        textTransform: "capitalize",
    },
    caloriesResult: {
        fontSize: 22,
        fontWeight: "700",
        color: "#e74c3c",
        marginBottom: 2,
    },
    confidenceBadge: {
        backgroundColor: "#e1f5fe",
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 16,
    },
    confidenceText: {
        color: "#0288d1",
        fontSize: 12,
        fontWeight: "500",
    },
    editButton: {
        backgroundColor: "#3498db",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignSelf: "center",
        marginBottom: 8,
    },
    editButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "500",
    },
    resultImagesRow: {
        flexDirection: "row",
        gap: 8,
    },
    resultImageContainer: {
        flex: 1,
        borderRadius: 8,
        overflow: "hidden",
        height: 90,
        backgroundColor: "#f8f9fa",
    },
    resultImage: {
        width: "100%",
        height: "100%",
        resizeMode: "contain",
    },
    imageLabel: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        padding: 4,
        alignItems: "center",
    },
    imageLabelText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "500",
    },
    commentContainer: {
        backgroundColor: "#fff9db",
        borderRadius: 8,
        padding: 8,
        marginTop: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#fcc419",
    },
    commentText: {
        fontSize: 13,
        color: "#495057",
        fontStyle: "italic",
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        position: "relative",
        maxWidth: "90%",
        maxHeight: "90%",
    },
    fullImage: {
        borderRadius: 8,
    },
    closeButton: {
        position: "absolute",
        top: -15,
        right: -15,
        backgroundColor: "#fff",
        borderRadius: 25,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    closeButtonText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    // Edit modal styles
    editModalContent: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        width: "90%",
        maxWidth: 400,
    },
    editModalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
        color: "#2c3e50",
    },
    editInputGroup: {
        marginBottom: 12,
    },
    editInputLabel: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4,
    },
    editInput: {
        borderWidth: 1,
        borderColor: "#e1e1e1",
        borderRadius: 8,
        padding: 8,
        fontSize: 16,
    },
    editTextarea: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    editButtonGroup: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    cancelButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e1e1e1",
        backgroundColor: "#f5f5f5",
    },
    cancelButtonText: {
        color: "#666",
        fontSize: 14,
    },
    saveButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: "#3498db",
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
})

export default Index
