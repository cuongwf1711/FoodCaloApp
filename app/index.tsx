import { HOME_ROUTE, SIGNIN_ROUTE } from '@/constants/router_constants';
import { AuthContext } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import { useContext } from 'react';

export default function Index() {
    const { token } = useContext(AuthContext);

    return <Redirect href={token ? HOME_ROUTE : SIGNIN_ROUTE} />;
}