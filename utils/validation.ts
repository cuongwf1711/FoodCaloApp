// utils/validation.ts

/**
 * Kiểm tra định dạng email hợp lệ
 * @param email Email cần kiểm tra
 * @returns true nếu email hợp lệ, false nếu không hợp lệ
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Kiểm tra mật khẩu có đủ mạnh không
 * @param password Mật khẩu cần kiểm tra
 * @returns true nếu mật khẩu hợp lệ, false nếu không hợp lệ
 */
export const isValidPassword = (password: string): boolean => {
    // Kiểm tra độ dài tối thiểu 8 ký tự
    if (password.length < 8) {
        return false;
    }

    // Kiểm tra có chứa ít nhất 1 chữ cái
    const hasLetter = /[a-zA-Z]/.test(password);

    // Kiểm tra có chứa ít nhất 1 số
    const hasNumber = /\d/.test(password);

    // Trả về true nếu mật khẩu có cả chữ và số
    return hasLetter && hasNumber;
};

/**
 * Lấy thông báo lỗi cho mật khẩu không hợp lệ
 * @param password Mật khẩu cần kiểm tra
 * @returns Thông báo lỗi hoặc chuỗi rỗng nếu không có lỗi
 */
export const getPasswordErrorMessage = (password: string): string => {
    if (!password) {
        return "Vui lòng nhập mật khẩu";
    }

    if (password.length < 8) {
        return "Mật khẩu phải có ít nhất 8 ký tự";
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasLetter && !hasNumber) {
        return "Mật khẩu phải bao gồm cả chữ và số";
    } else if (!hasLetter) {
        return "Mật khẩu phải chứa ít nhất một chữ cái";
    } else if (!hasNumber) {
        return "Mật khẩu phải chứa ít nhất một chữ số";
    }

    return "";
};

/**
 * Lấy thông báo lỗi cho email không hợp lệ
 * @param email Email cần kiểm tra
 * @returns Thông báo lỗi hoặc chuỗi rỗng nếu không có lỗi
 */
export const getEmailErrorMessage = (email: string): string => {
    if (!email.trim()) {
        return "Vui lòng nhập email";
    }

    if (!isValidEmail(email)) {
        return "Email không hợp lệ";
    }

    return "";
};

/**
 * Kiểm tra độ mạnh của mật khẩu
 * @param password Mật khẩu cần kiểm tra
 * @returns Số từ 0-4 đại diện cho độ mạnh của mật khẩu (0: rất yếu, 4: rất mạnh)
 */
export const getPasswordStrength = (password: string): number => {
    if (!password) return 0;

    let strength = 0;

    // Độ dài
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;

    // Độ phức tạp
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) strength += 1;

    return strength;
  };