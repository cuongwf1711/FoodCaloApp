"use client"

import { URL_FOOD_CALO_ESTIMATOR } from "@/constants/url_constants";
import { postData } from "@/context/request_context";
import { showMessage } from "@/utils/showMessage";
import React, { useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

// Simplified type definitions
type ImageAsset = {
    uri: string;
    type?: string;
    fileName?: string;
    fileSize?: number;
    file?: File;
};

type ImagePickerResult = {
    canceled: boolean;
    assets: ImageAsset[];
};

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
let ImagePicker: any;
let AsyncStorage: any;

if (Platform.OS === 'web') {
    // Web implementations
    ImagePicker = {
        requestMediaLibraryPermissionsAsync: async () => ({ status: 'granted' }),
        launchImageLibraryAsync: async () => {
            return new Promise<ImagePickerResult>((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';

                input.onchange = (e: Event) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) {
                        resolve({ canceled: true, assets: [] });
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = () => {
                        resolve({
                            canceled: false,
                            assets: [{
                                uri: reader.result as string,
                                type: file.type,
                                fileName: file.name,
                                fileSize: file.size,
                                file: file,
                            }]
                        });
                    };
                    reader.readAsDataURL(file);
                };
                input.click();
            });
        }
    };

    AsyncStorage = {
        getItem: (key: string) => localStorage.getItem(key),
        setItem: (key: string, value: string) => localStorage.setItem(key, value)
    };
} else {
    ImagePicker = require("expo-image-picker");
    AsyncStorage = require("@react-native-async-storage/async-storage").default;
}

// Simple Loading Component
const LoadingSpinner: React.FC = () => {
    const spinValue = new Animated.Value(0);

    React.useEffect(() => {
        Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.loadingContainer}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Text style={styles.loadingSpinner}>⟳</Text>
            </Animated.View>
            <Text style={styles.loadingText}>Đang xử lý...</Text>
        </View>
    );
};

// Simplified Image Modal
const ImageModal: React.FC<{
    visible: boolean;
    imageUri: string;
    onClose: () => void;
}> = ({ visible, imageUri, onClose }) => {
    if (Platform.OS === 'web') {
        if (!visible) return null;
        return (
            <div style={webModalStyles.overlay} onClick={onClose}>
                <div style={webModalStyles.content} onClick={(e) => e.stopPropagation()}>
                    <img src={imageUri} alt="Full size" style={webModalStyles.image} />
                    <button onClick={onClose} style={webModalStyles.closeButton}>✕</button>
                </div>
            </div>
        );
    }

    const { width, height } = Dimensions.get('window');
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
    );
};

const Index: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [result, setResult] = useState<PredictionResult | null>(null)
    const [modalVisible, setModalVisible] = useState(false)
    const [modalImageUri, setModalImageUri] = useState('')

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (status !== "granted" && Platform.OS !== 'web') {
                Alert.alert("Cần quyền truy cập", "Vui lòng cho phép ứng dụng truy cập thư viện ảnh")
                return
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: Platform.OS === 'web' ? 'Images' : ['Images'],
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

            if (Platform.OS === 'web' && selectedImage.file) {
                formData.append('imageFile', selectedImage.file)
            } else {
                const uri = selectedImage.uri
                const filename = uri.split('/').pop() || 'photo.jpg'
                const match = /\.(\w+)$/.exec(filename.toLowerCase())
                const type = match ? `image/${match[1]}` : 'image/jpeg'

                formData.append('imageFile', {
                    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                    name: filename,
                    type: type,
                } as any)
            }

            // Use your API util instead of direct axios
            const response = await postData<PredictionResult>(
                URL_FOOD_CALO_ESTIMATOR,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Accept': 'application/json',
                    },
                }
            )

            setResult(response.data)
        } catch (error) {
            console.error('Error processing image:', error)
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
        setModalImageUri('')
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.mainTitle}>Dự đoán Calories từ hình ảnh</Text>

            {/* Image Selection Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Chọn hình ảnh</Text>

                {selectedImage ? (
                    <TouchableOpacity onPress={() => openImageModal(selectedImage.uri)}>
                        <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                        <Text style={styles.tapHint}>Nhấn để xem full</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Text style={styles.placeholderText}>📷</Text>
                        <Text style={styles.placeholderText}>Chưa có ảnh</Text>
                    </View>
                )}

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.primaryButton} onPress={pickImage}>
                        <Text style={styles.buttonText}>Chọn ảnh</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.primaryButton, (!selectedImage || isProcessing) && styles.disabledButton]}
                        disabled={!selectedImage || isProcessing}
                        onPress={processImage}
                    >
                        <Text style={styles.buttonText}>
                            {isProcessing ? 'Đang xử lý...' : 'Phân tích'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {result && (
                    <TouchableOpacity style={styles.secondaryButton} onPress={reset}>
                        <Text style={styles.buttonText}>Chọn ảnh mới</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Loading */}
            {isProcessing && <LoadingSpinner />}

            {/* Results Card */}
            {result && !isProcessing && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Kết quả phân tích</Text>

                    {/* Result Images */}
                    <View style={styles.resultImagesRow}>
                        <TouchableOpacity
                            style={styles.resultImageContainer}
                            onPress={() => openImageModal(result.publicUrl.originImage)}
                        >
                            <Image
                                source={{ uri: result.publicUrl.originImage }}
                                style={styles.resultImage}
                            />
                            <Text style={styles.imageLabel}>Ảnh gốc</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resultImageContainer}
                            onPress={() => openImageModal(result.publicUrl.segmentationImage)}
                        >
                            <Image
                                source={{ uri: result.publicUrl.segmentationImage }}
                                style={styles.resultImage}
                            />
                            <Text style={styles.imageLabel}>Ảnh phân đoạn</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Result Info */}
                    <View style={styles.resultInfo}>
                        <ResultRow label="Tên món ăn" value={result.predictName} />
                        <ResultRow label="Calories" value={`${result.calo} cal`} highlight />
                        <ResultRow label="Độ tin cậy" value={result.confidencePercentage} />
                        <ResultRow label="Ghi chú" value={result.comment || 'Không có'} />
                        <ResultRow label="Thời gian" value={new Date(result.createdAt).toLocaleString('vi-VN')} />
                    </View>
                </View>
            )}

            {/* Image Modal */}
            <ImageModal
                visible={modalVisible}
                imageUri={modalImageUri}
                onClose={closeImageModal}
            />
        </ScrollView>
    )
}

// Helper component for result rows
const ResultRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
    label,
    value,
    highlight
}) => (
    <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>{label}:</Text>
        <Text style={[styles.resultValue, highlight && styles.highlightValue]}>{value}</Text>
    </View>
)

// Web modal styles
const webModalStyles = {
    overlay: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    content: {
        position: 'relative' as const,
        maxWidth: '90%',
        maxHeight: '90%',
    },
    image: {
        maxWidth: '100%',
        maxHeight: '100%',
        borderRadius: '8px',
        objectFit: 'contain' as const,
    },
    closeButton: {
        position: 'absolute' as const,
        top: '-10px',
        right: '-10px',
        backgroundColor: '#fff',
        border: 'none',
        borderRadius: '20px',
        width: '40px',
        height: '40px',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333',
        cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    },
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f8f9fa',
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 20,
        color: '#2c3e50',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#34495e',
    },
    selectedImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        resizeMode: 'contain',
    },
    tapHint: {
        textAlign: 'center',
        marginTop: 8,
        color: '#3498db',
        fontSize: 14,
        fontStyle: 'italic',
    },
    imagePlaceholder: {
        height: 200,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e9ecef',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    placeholderText: {
        color: '#6c757d',
        fontSize: 16,
        marginTop: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    primaryButton: {
        backgroundColor: '#3498db',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flex: 1,
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: '#e74c3c',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginTop: 12,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#bdc3c7',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    loadingSpinner: {
        fontSize: 32,
        color: '#3498db',
        marginBottom: 8,
    },
    loadingText: {
        fontSize: 16,
        color: '#3498db',
        fontWeight: '500',
    },
    resultImagesRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    resultImageContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        overflow: 'hidden',
    },
    resultImage: {
        width: '100%',
        height: 120,
        backgroundColor: '#fff',
        resizeMode: 'contain',
    },
    imageLabel: {
        textAlign: 'center',
        padding: 8,
        fontSize: 12,
        color: '#6c757d',
        fontWeight: '500',
    },
    resultInfo: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    resultLabel: {
        fontSize: 14,
        color: '#6c757d',
        fontWeight: '500',
        flex: 1,
    },
    resultValue: {
        fontSize: 14,
        color: '#2c3e50',
        fontWeight: '600',
        flex: 2,
        textAlign: 'right',
    },
    highlightValue: {
        color: '#e74c3c',
        fontSize: 16,
        fontWeight: '700',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        position: 'relative',
        maxWidth: '90%',
        maxHeight: '90%',
    },
    fullImage: {
        borderRadius: 8,
    },
    closeButton: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#fff',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    closeButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
})

export default Index