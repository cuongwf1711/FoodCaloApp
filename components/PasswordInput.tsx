import { Colors } from '@/styles/colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from 'react-native';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
    label?: string;
    error?: string;
    hint?: string;
    containerStyle?: any;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
    label,
    error,
    hint,
    containerStyle,
    style,
    ...textInputProps
}) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={styles.inputContainer}>
                <TextInput
                    {...textInputProps}
                    secureTextEntry={!isPasswordVisible}
                    style={[
                        styles.input,
                        error ? styles.inputError : null,
                        style,
                    ]}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={togglePasswordVisibility}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name={isPasswordVisible ? 'eye-off' : 'eye'}
                        size={24}
                        color={Colors.mediumGray}
                    />
                </TouchableOpacity>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: '500',
        color: Colors.darkGray,
    },
    inputContainer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderColor: Colors.borderGray,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingRight: 50, // Make space for the toggle button
        fontSize: 16,
        backgroundColor: Colors.backgroundWhite,
        color: Colors.darkGray,
    },
    inputError: {
        borderColor: 'red',
    },
    toggleButton: {
        position: 'absolute',
        right: 12,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        width: 30,
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
});
