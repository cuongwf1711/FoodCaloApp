import { Alert, Platform } from 'react-native';

export function showMessage(data: any, success: boolean = false) {
    let title = "";
    let message = "";
    if (!success) {
        title = "Error";
        let firstErrorValue;
        
        let errors = data.response?.data?.errors
        const errorKeys = Object.keys(errors || {});

        if (errorKeys.length > 0) {
            firstErrorValue = errors[errorKeys[0]];

            if (Array.isArray(firstErrorValue) && firstErrorValue.length > 0) {
                firstErrorValue = firstErrorValue[0];
            }
        }
        message = firstErrorValue || 'Something went wrong';
    }
    else {
        title = "Message";
        message = data.message || 'Operation completed successfully';
    }
    if (Platform.OS === 'web') window.alert(`${title}\n${message}`);
    else Alert.alert(title, message);
}