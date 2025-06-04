import { MAX_CALO_DISPLAY } from "@/constants/general_constants";

/**
 * Format decimal number for display - truncate if too long
 */
export const formatDecimalDisplay = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
        return "..."
    }
    if (value >= MAX_CALO_DISPLAY) {
        return value.toExponential(2)
    } else {
        const fixed = value.toFixed(2);
        return fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed;
    }
}
