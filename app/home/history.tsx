// app/history.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function History() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Lịch sử sẽ được hiển thị ở đây</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    text: {
        fontSize: 18,
        color: '#333',
        textAlign: 'center',
    },
});