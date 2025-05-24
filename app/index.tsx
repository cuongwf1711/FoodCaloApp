import { HOME_ROUTE, SIGNIN_ROUTE } from '@/constants/router_constants';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useContext, useEffect } from 'react';

export default function Index() {
    const { token } = useContext(AuthContext);
    const router = useRouter();

    useEffect(() => {
        // Replace the current route depending on auth state
        if (token) {
            router.replace(HOME_ROUTE);
        } else {
            router.replace(SIGNIN_ROUTE);
        }
    }, [token, router]);

    // Optionally render nothing or a loading indicator
    return null;
}
