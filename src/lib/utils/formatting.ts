import type { TourPackageStatus } from "@/lib/types/tours";

// Thailand timezone constant
const THAILAND_TIMEZONE = 'Asia/Bangkok';

// Format date as D MMM YYYY (e.g., 22 MAR 2019) in Thailand timezone
export const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
        // Add T00:00:00 to ensure parsing as local date without unexpected timezone shifts
        const date = new Date(dateString + 'T00:00:00'); 
        if (isNaN(date.getTime())) return 'Invalid Date';
        // Format using options for D MMM YYYY in Thailand timezone
        return date.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric',
            timeZone: THAILAND_TIMEZONE
        }).toUpperCase(); // Convert month abbr to uppercase
    } catch {
        return 'Invalid Date';
    }
};

// Format timestamp as Date + Time (e.g., Mar 4, 2025, 11:44 AM) in Thailand timezone
export const formatTimestamp = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit',
            timeZone: THAILAND_TIMEZONE,
            hour12: true
        });
    } catch {
        return 'Invalid Date';
    }
};

// Format currency (defaulting to THB for this app)
export const formatCurrency = (amount: number | null | undefined, currency: string = 'THB'): string => {
    if (amount === null || amount === undefined) return '-';
    try {
        return new Intl.NumberFormat(currency === 'THB' ? 'th-TH' : 'en-US', { 
            style: 'currency', 
            currency: currency 
        }).format(amount);
    } catch {
        return 'Invalid Amount';
    }
};

// Get Badge variant based on TourPackageStatus
export const getStatusVariant = (status: TourPackageStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case "Complete": 
        case "Paid (Full Payment)":
            return "default"; 
        case "Paid (1st installment)":
            return "secondary"; 
        case "Open":
        case "Negotiating":
            return "outline"; 
        case "Closed": 
            return "destructive"; 
        default:
            return "secondary"; 
    }
};

// Special class for 'Open' status (consider integrating into getStatusVariant if complex styling isn't needed elsewhere)
export const openStatusBadgeClass = "border-yellow-400 bg-yellow-50 text-yellow-700"; 