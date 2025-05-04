'use client';

import { useState, useTransition } from 'react';
import { Eye, CheckCircle, AlertCircle, Loader2, UploadCloud, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { 
    createPaymentSlipSignedUrl,
    verifyPaymentSlip
} from '@/lib/actions/tour-package-bookings';
import { type PaymentRecord } from '@/lib/types/tours'; // Import the full PaymentRecord
import { cn } from '@/lib/utils'; // For conditional classes

interface PaymentActionsProps {
    payment: PaymentRecord; // Pass the whole payment record
}

export const PaymentActions = ({ payment }: PaymentActionsProps) => {
    const [isViewing, startViewTransition] = useTransition();
    const [isVerifying, startVerifyTransition] = useTransition();
    const [verificationError, setVerificationError] = useState<string | null>(payment.verification_error || null);
    const [isVerified, setIsVerified] = useState<boolean>(payment.is_verified || false);

    const handleViewSlip = async () => {
        startViewTransition(async () => {
            if (!payment.payment_slip_path) {
                toast.error('Slip path is missing.');
                return;
            }
            try {
                const result = await createPaymentSlipSignedUrl(payment.payment_slip_path);
                if (result.success && result.url) {
                    window.open(result.url, '_blank');
                } else {
                    toast.error(`Failed to get view link: ${result.message}`);
                }
            } catch (error) {
                console.error('View Slip Error:', error);
                toast.error('An unexpected error occurred while generating the view link.');
            }
        });
    };

    const handleVerify = async () => {
        setVerificationError(null); // Clear previous errors on new attempt
        startVerifyTransition(async () => {
            try {
                const result = await verifyPaymentSlip(payment.id);
                if (result.success) {
                    toast.success(isVerified ? 'Payment re-verified successfully!' : 'Payment verified successfully!', { // Adjusted message
                        description: `Amount: ${result.verificationData?.payment_amount ?? 'N/A'}, Date: ${result.verificationData?.payment_date ?? 'N/A'}`,
                    });
                    setIsVerified(true); // Update local state
                    setVerificationError(null); // Clear error on success
                } else {
                    toast.error(`Verification failed: ${result.message}`);
                    setVerificationError(result.message); 
                    setIsVerified(false); 
                }
            } catch (error) { 
                console.error('Verify Slip Error:', error);
                const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during verification.';
                toast.error(errorMessage);
                setVerificationError(errorMessage);
                setIsVerified(false); 
            }
        });
    };

    // Button is disabled only while actively verifying
    const disableVerifyButton = isVerifying;

    return (
        <div className="flex items-center space-x-2">
            {/* View Button */}
            <Button 
                variant="outline"
                size="sm"
                onClick={handleViewSlip}
                disabled={isViewing || !payment.payment_slip_path}
                aria-label="View payment slip"
            >
                {isViewing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Eye className="mr-2 h-4 w-4" />
                )}
                View
            </Button>

            {/* Verify / Re-verify Button - Always shown */}
            <Button 
                variant={isVerified ? "outline" : "secondary"} // Change variant slightly when verified
                size="sm"
                onClick={handleVerify}
                disabled={disableVerifyButton} 
                aria-label={isVerified ? "Re-verify payment slip" : "Verify payment slip"}
            >
                {isVerifying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isVerified ? (
                    <RefreshCcw className="mr-2 h-4 w-4" /> // Use RefreshCcw for re-verify
                ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                )}
                {isVerified ? 'Re-verify' : 'Verify'}
            </Button>

            {/* Show Verification Error (only if there's an error and it's not currently verified) */}
            {verificationError && !isVerified && (
                <div className="flex items-center text-xs text-red-500 ml-2" title={verificationError}>
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Verification Failed
                </div>
            )}
        </div>
    );
}; 