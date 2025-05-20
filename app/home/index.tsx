import { AuthContext } from '@/context/AuthContext';
import { showMessage } from '@/utils/showMessage';
import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import BASE_URL, { URL_FOOD_CALO_ESTIMATOR } from '../../constants/url_constants';
import { FoodCaloEstimateObject } from '@/constants/type_food_calo_estimate_object';
import { getData } from '@/context/auth_context';

export default function Home() {
    const { token } = useContext(AuthContext);
    const [data, setData] = useState([] as FoodCaloEstimateObject[]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        if (!token) return;
        try {
            const resp = await getData(URL_FOOD_CALO_ESTIMATOR);
            setData(resp.data.results);
        } catch (error) {
            showMessage(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [token]);

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
        <View style={styles.container}>
            <FlatList
                data={data}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.title}>{item.predictName}</Text>
                        <Text>Calo: {item.calo}</Text>
                        <Text>Confidence: {item.confidencePercentage}</Text>
                        <Image source={{ uri: item.publicUrl.originImage }} style={styles.image} />
                    </View>
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#9Bd35A", "#689F38"]}
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10 },
    card: { marginBottom: 20, borderWidth: 1, borderRadius: 8, padding: 10 },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
    image: { width: '100%', height: 200, marginTop: 10, borderRadius: 8 },
});