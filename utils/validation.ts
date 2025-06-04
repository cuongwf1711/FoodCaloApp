// Email and password validation utilities

// Check if email format is valid
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Check if password is strong enough
export const isValidPassword = (password: string): boolean => {
    // Minimum 8 characters required
    if (password.length < 8) {
        return false;
    }

    // Must contain at least one letter
    const hasLetter = /[a-zA-Z]/.test(password);

    // Must contain at least one number
    const hasNumber = /\d/.test(password);

    // Valid if has both letters and numbers
    return hasLetter && hasNumber;
};

// Get error message for invalid password
export const getPasswordErrorMessage = (password: string): string => {
    if (!password) {
        return "Please enter a password";
    }

    if (password.length < 8) {
        return "Password must be at least 8 characters";
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasLetter && !hasNumber) {
        return "Password must include both letters and numbers";
    } else if (!hasLetter) {
        return "Password must contain at least one letter";
    } else if (!hasNumber) {
        return "Password must contain at least one number";
    }

    return "";
};

// Get error message for invalid email
export const getEmailErrorMessage = (email: string): string => {
    if (!email.trim()) {
        return "Please enter an email";
    }

    if (!isValidEmail(email)) {
        return "Invalid email format";
    }

    return "";
};

// Calculate password strength score (0-4)
export const getPasswordStrength = (password: string): number => {
    if (!password) return 0;

    let strength = 0;

    // Length bonus
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;

    // Complexity bonus
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) strength += 1;

    return strength;
};