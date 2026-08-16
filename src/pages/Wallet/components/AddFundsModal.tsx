import {
  setItemWithTTL,
  getItemWithTTL,
  removeItem as removeTTLItem,
} from '@/utils/localStorageWithTTL';
import React, { useState } from 'react';
import {
  X,
  Landmark,
  CreditCard,
  Smartphone,
  Loader2,
  Check,
  Download,
  Printer,
  Mail,
  Share2,
  Send,
  Copy,
  QrCode,
  FileText,
  Image,
  MessageSquare,
  Info,
} from 'lucide-react';
// import CreditCardForm from '../../../features/bookings/components/CreditCardForm';
// CASHFREE - Commented out
// import { createOrder, verifyPaymentStatus } from '@/api/payment.service';
// RAZORPAY - New import
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  initiateRazorpayPayment,
} from '@/api/razorpay.api';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed?: (amount: number) => void;
}

const AddFundsModal: React.FC<AddFundsModalProps> = ({ isOpen, onClose, onProceed }) => {
  const [amount, setAmount] = useState<string>('');
  const [step, setStep] = useState(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [razorpayOrderId, setRazorpayOrderId] = useState<string>('');
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('');

  // CASHFREE - Commented out
  // const loadCashfreeSDK = (): Promise<void> => {
  //     return new Promise((resolve, reject) => {
  //         if ((window as any).Cashfree) {
  //             resolve();
  //             return;
  //         }
  //
  //         const script = document.createElement('script');
  //         script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
  //         script.async = true;
  //         script.onload = () => {
  //             console.log('Cashfree SDK loaded successfully');
  //             resolve();
  //         };
  //         script.onerror = () => {
  //             console.error('Failed to load Cashfree SDK');
  //             reject(new Error('Failed to load payment gateway'));
  //         };
  //         document.body.appendChild(script);
  //     });
  // };

  // Load Razorpay SDK

  const loadRazorpaySDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        console.log('Razorpay SDK loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay SDK');
        reject(new Error('Failed to load payment gateway'));
      };
      document.body.appendChild(script);
    });
  };

  // Handle Razorpay Payment
  const handleRazorpayPayment = async () => {
    const amountValue = parseInt(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setPaymentError('Please enter a valid amount');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const token = getItemWithTTL('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const backendUrl = import.meta.env.VITE_BACKEND_AUTH_URL || 'http://localhost:5010';

      // Fetch user data
      const userResponse = await fetch(`${backendUrl}/user/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userDataResponse = await userResponse.json();
      const userData = userDataResponse.data?.user || userDataResponse;

      const userId = userData.id || userData._id || userData.userId || 'guest_' + Date.now();
      const userEmail = userData.email || '';
      const mobile = userData.mobile || userData.phone || userData.mobileNumber || '';
      const clientType = userData.clientType || 'B2B';

      // Create Razorpay order payload
      const orderPayload = {
        userId: userId,
        userEmail: userEmail,
        mobile: mobile,
        clientType: clientType?.toUpperCase(),
        amount: amountValue,
        currency: 'INR',
        purpose: 'WALLET_TOPUP',
      };

      // Create Razorpay order
      const orderResponse = await createRazorpayOrder(orderPayload);

      if (orderResponse?.success && orderResponse?.data) {
        const { razorpayOrderId, razorpayKeyId, order } = orderResponse.data;

        setRazorpayOrderId(razorpayOrderId);
        setRazorpayKeyId(razorpayKeyId);

        // Store order data in sessionStorage
        sessionStorage.setItem('walletTopupOrder', JSON.stringify(orderResponse.data));

        // Load Razorpay SDK
        await loadRazorpaySDK();

        // Initialize Razorpay checkout
        const options = {
          key: razorpayKeyId,
          amount: Math.round(amountValue * 100), // Amount in paise
          currency: 'INR',
          name: 'Klar',
          description: `Wallet Top-up of ₹${amountValue}`,
          order_id: razorpayOrderId,
          handler: async (response: any) => {
            console.log('Payment completed:', response);

            try {
              // Verify payment on backend
              const verifyResult = await verifyRazorpayPayment({
                orderId: order.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              console.log('Verification result:', verifyResult);

              if (verifyResult?.success) {
                console.log('Payment verified successfully!');
                // Move to success step
                setStep(6);
                // Call parent callback if provided
                if (onProceed) {
                  onProceed(amountValue);
                }
              } else {
                console.log('Payment verification failed:', verifyResult);
                setPaymentError('Payment verification failed. Please contact support.');
                setStep(7); // Show error step
              }
            } catch (error) {
              console.error('Verification error:', error);
              setPaymentError('Could not verify payment status. Please contact support.');
              setStep(7);
            } finally {
              setIsProcessingPayment(false);
            }
          },
          prefill: {
            name: userData.name || userId,
            email: userEmail,
            contact: mobile,
          },
          notes: {
            userId: userId,
            clientType: clientType,
            purpose: 'WALLET_TOPUP',
          },
          theme: {
            color: '#FF5A5F',
          },
          modal: {
            ondismiss: () => {
              console.log('Payment cancelled by user');
              setPaymentError('Payment was cancelled');
              setStep(7);
              setIsProcessingPayment(false);
            },
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      } else {
        throw new Error('Failed to create Razorpay order');
      }
    } catch (error: any) {
      console.error('Payment processing failed:', error);
      let errorMessage = 'Unable to process payment. Please try again.';
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network connection issue. Please check your internet and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setPaymentError(errorMessage);
      setStep(7);
      setIsProcessingPayment(false);
    }
  };

  // CASHFREE - Commented out original handler
  // const handleCashfreePayment = async () => {
  //     const amountValue = parseInt(amount);
  //     if (isNaN(amountValue) || amountValue <= 0) {
  //         setPaymentError('Please enter a valid amount');
  //         return;
  //     }
  //
  //     setIsProcessingPayment(true);
  //     setPaymentError(null);
  //
  //     try {
  //         const token = getItemWithTTL('token');
  //         if (!token) {
  //             throw new Error('No authentication token found');
  //         }
  //
  //         const backendUrl = import.meta.env.VITE_BACKEND_AUTH_URL || 'http://localhost:5010';
  //
  //         // Fetch user data
  //         const userResponse = await fetch(`${backendUrl}/user/auth/me`, {
  //             headers: {
  //                 'Authorization': `Bearer ${token}`,
  //                 'Content-Type': 'application/json'
  //             }
  //         });
  //
  //         if (!userResponse.ok) {
  //             throw new Error('Failed to fetch user data');
  //         }
  //
  //         const userDataResponse = await userResponse.json();
  //         const userData = userDataResponse.data?.user || userDataResponse;
  //
  //         const userId = userData.id || userData._id || userData.userId || 'guest_' + Date.now();
  //         const userEmail = userData.email || '';
  //         const mobile = userData.mobile || userData.phone || userData.mobileNumber || '';
  //         const clientType = userData.clientType || 'B2B';
  //
  //         // Create order payload
  //         const orderPayload = {
  //             userId: userId,
  //             userEmail: userEmail,
  //             mobile: mobile,
  //             clientType: clientType?.toUpperCase(),
  //             amount: amountValue,
  //             currency: 'INR',
  //             environment: 'sandbox',
  //             purpose: 'WALLET_TOPUP'
  //         };
  //
  //         const orderResponse = await createOrder(orderPayload);
  //
  //         if (orderResponse?.success && orderResponse?.data) {
  //             const paymentSessionId = orderResponse.data.paymentSessionId;
  //
  //             // Store order data in sessionStorage
  //             sessionStorage.setItem('walletTopupOrder', JSON.stringify(orderResponse.data));
  //
  //             // Load Cashfree SDK
  //             await loadCashfreeSDK();
  //
  //             const cashfree = (window as any).Cashfree({
  //                 mode: "sandbox"
  //             });
  //
  //             const checkoutOptions = {
  //                 paymentSessionId: paymentSessionId,
  //                 redirectTarget: "_modal"
  //             };
  //
  //             // Open checkout and handle payment
  //             cashfree.checkout(checkoutOptions).then(async (paymentResult: any) => {
  //                 console.log('Payment completed:', paymentResult);
  //
  //                 const orderData = JSON.parse(sessionStorage.getItem('walletTopupOrder') || '{}');
  //                 const orderId = orderData.orderId;
  //
  //                 if (!orderId) {
  //                     console.error('No order ID found');
  //                     setPaymentError('Unable to verify payment. Please contact support.');
  //                     setIsProcessingPayment(false);
  //                     return;
  //                 }
  //
  //                 try {
  //                     // Verify payment status
  //                     const verificationResult = await verifyPaymentStatus(orderId);
  //
  //                     console.log('Verification result:', verificationResult);
  //
  //                     if (verificationResult?.success && verificationResult?.data?.status === 'SUCCESS') {
  //                         console.log('Payment verified successfully!');
  //                         // Move to success step
  //                         setStep(6);
  //                         // Call parent callback if provided
  //                         if (onProceed) {
  //                             onProceed(amountValue);
  //                         }
  //                     } else {
  //                         console.log('Payment verification failed:', verificationResult);
  //                         setPaymentError('Payment verification failed. Please contact support.');
  //                         setStep(7); // Show error step
  //                     }
  //                 } catch (error) {
  //                     console.error('Verification error:', error);
  //                     setPaymentError('Could not verify payment status. Please contact support.');
  //                     setStep(7);
  //                 } finally {
  //                     setIsProcessingPayment(false);
  //                 }
  //             }).catch((error: any) => {
  //                 console.error('Payment error:', error);
  //                 setPaymentError(error?.message || 'Payment failed or was cancelled');
  //                 setStep(7);
  //                 setIsProcessingPayment(false);
  //             });
  //
  //         } else {
  //             throw new Error('Failed to create order');
  //         }
  //
  //     } catch (error: any) {
  //         console.error('Payment processing failed:', error);
  //         let errorMessage = 'Unable to process payment. Please try again.';
  //         if (error.message?.includes('network') || error.message?.includes('fetch')) {
  //             errorMessage = 'Network connection issue. Please check your internet and try again.';
  //         } else if (error.message) {
  //             errorMessage = error.message;
  //         }
  //         setPaymentError(errorMessage);
  //         setStep(7);
  //         setIsProcessingPayment(false);
  //     }
  // };

  const quickAmounts = [20000, 50000, 100000, 250000];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setAmount(val);
  };

  const handleQuickSelect = (val: number) => {
    setAmount(val.toString());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div
        className={`bg-white w-full ${step >= 6 ? 'max-w-[896px]' : 'max-w-lg'} overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] rounded-2xl p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 transition-all ease-in-out`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-[#111827]">
              {step === 8
                ? 'Transaction Receipt'
                : step === 9
                  ? 'Email Receipt'
                  : step === 10
                    ? 'Share Receipt'
                    : 'Add Funds'}
            </h2>
            {step === 6 && <p className="text-gray-400 font-bold mt-1">Payment Successful</p>}
            {step === 7 && <p className="text-gray-400 font-bold mt-1">Payment Failed</p>}
            {step === 8 && (
              <p className="text-gray-400 font-bold mt-1">Official transaction document</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
          >
            <X size={24} />
          </button>
        </div>

        {step === 1 ? (
          <>
            {/* Amount Input Section */}
            <div className="flex flex-col items-center mb-10">
              <div className="flex items-center gap-4 border-b-2 border-gray-100 w-full pb-4 px-2 hover:border-red-100 transition-colors group">
                <span className="text-4xl font-black text-gray-300 group-focus-within:text-gray-900 transition-colors">
                  ₹
                </span>
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="text-6xl font-black text-gray-900 bg-transparent border-none outline-none w-full placeholder:text-gray-100"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Select Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
              {quickAmounts.map((val) => (
                <button
                  key={val}
                  onClick={() => handleQuickSelect(val)}
                  className="flex flex-col items-center justify-center py-4 border border-gray-100 rounded-3xl hover:border-red-200 hover:bg-red-50/30 transition-all active:scale-95 group"
                >
                  <span className="text-xs font-black text-gray-400 group-hover:text-red-500 mb-0.5">
                    +
                  </span>
                  <span className="text-sm font-black text-gray-900 group-hover:text-red-500">
                    ₹{val.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>

            {/* Error Display */}
            {paymentError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <p className="text-sm text-red-600">{paymentError}</p>
              </div>
            )}

            {/* Proceed Button - Using Razorpay handler */}
            <button
              onClick={handleRazorpayPayment} // Changed from handleCashfreePayment
              disabled={!amount || parseInt(amount) <= 0 || isProcessingPayment}
              className="w-full h-20 bg-gradient-to-r from-red-300 to-red-400 text-white rounded-2xl text-xl font-black shadow-lg shadow-red-200 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:shadow-none"
            >
              {isProcessingPayment ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={24} />
                  <span>Processing...</span>
                </div>
              ) : (
                `Pay ₹${parseInt(amount || '0').toLocaleString()}`
              )}
            </button>
          </>
        ) : step === 6 ? (
          <div className="py-8 text-center space-y-6">
            <div className="animate-in zoom-in-95 duration-500">
              <div className="flex justify-center mb-6">
                <div className="w-28 h-28 bg-[#22C55E] rounded-full flex items-center justify-center shadow-lg shadow-green-200 shadow-xl">
                  <Check className="text-white w-14 h-14 drop-shadow-md" strokeWidth={3} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl font-black text-gray-900">Funds Added!</h3>
                <p className="text-gray-500 font-medium">
                  Your wallet has been topped up successfully.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 max-w-sm mx-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 font-bold">Amount Added</span>
                  <span className="text-xl font-black text-gray-900">
                    ₹{parseInt(amount).toLocaleString()}
                  </span>
                </div>
                <div className="h-px bg-gray-200 w-full" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold">Transaction ID</span>
                  <span className="font-mono font-bold text-gray-600">
                    TXN{Date.now().toString().slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold">Payment Method</span>
                  <span className="font-bold text-gray-600">Razorpay</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-w-sm mx-auto pt-4">
              <button
                onClick={() => setStep(8)}
                className="w-full h-14 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-lg font-bold transition-all hover:bg-gray-50 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Download size={20} /> Download Receipt
              </button>
              <button
                onClick={onClose}
                className="w-full h-14 bg-[#111827] text-white rounded-2xl text-lg font-bold shadow-lg shadow-gray-200 transition-all hover:bg-black hover:shadow-xl active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        ) : step === 7 ? (
          <div className="py-8 text-center space-y-6">
            <div className="animate-in zoom-in-95 duration-500">
              <div className="flex justify-center mb-6">
                <div className="w-28 h-28 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-200 shadow-xl">
                  <X className="text-white w-14 h-14 drop-shadow-md" strokeWidth={3} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl font-black text-gray-900">Transaction Failed</h3>
                <p className="text-gray-500 font-medium max-w-xs mx-auto">
                  {paymentError || "We couldn't process your payment. Please try again."}
                </p>
              </div>
            </div>

            <div className="flex gap-4 max-w-sm mx-auto pt-4">
              <button
                onClick={onClose}
                className="flex-1 h-14 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-lg font-bold transition-all hover:bg-gray-50 active:scale-[0.98]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setStep(1);
                  setPaymentError(null);
                }}
                className="flex-1 h-14 bg-[#FF5A5F] text-white rounded-2xl text-lg font-bold shadow-lg shadow-red-200 transition-all hover:bg-[#FF4046] hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : step === 8 ? (
          <div className="space-y-6">
            {/* Company Header */}
            <div className="flex justify-between items-start">
              <div>
                <div className="text-2xl font-black text-[#1D4ED8] flex items-center gap-1">
                  Klar<span className="text-[#FF5A5F] text-xl">✦</span>
                </div>
                <div className="mt-4 space-y-1 text-xs text-gray-500 font-medium">
                  <p>123 Business Avenue, Mumbai</p>
                  <p>Maharashtra 400001, India</p>
                  <p>GSTIN: 27AABCU9603R1Z5</p>
                  <p>Email: support@klar.com</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide mb-2 bg-green-100 text-green-700">
                  Success
                </span>
                <p className="text-xs font-bold text-gray-900">
                  Receipt #TXN{Date.now().toString().slice(-8)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString()}</p>
                <p className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>

            {/* Transaction Details Table */}
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-4">Transaction Details</h3>
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-gray-100 p-3 flex justify-between text-xs font-black text-gray-500 uppercase tracking-wider">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-white">
                  <div>
                    <p className="text-sm font-black text-gray-900">Wallet Top-up</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Funds added to wallet via Razorpay
                    </p>
                  </div>
                  <span className="text-sm font-black text-gray-900">
                    ₹{parseInt(amount).toLocaleString()}
                  </span>
                </div>
                <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-white">
                  <div>
                    <p className="text-sm font-black text-gray-900">Processing Fee</p>
                    <p className="text-xs text-gray-500 mt-0.5">No transaction charges</p>
                  </div>
                  <span className="text-sm font-black text-gray-900">₹0.00</span>
                </div>
                <div className="p-4 flex justify-between items-center bg-gray-50">
                  <p className="text-sm font-black text-gray-900">Total Amount Paid</p>
                  <span className="text-xl font-black text-[#1D4ED8]">
                    ₹{parseInt(amount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                  Payment Method
                </h3>
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-white">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <CreditCard className="text-blue-500 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Razorpay</p>
                    <p className="text-xs text-gray-500">Online Payment Gateway</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                  Credited To
                </h3>
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-white">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <Landmark className="text-red-500 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Klar Wallet</p>
                    <p className="text-xs text-gray-500">Available Balance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="flex-1 h-14 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-lg font-bold transition-all hover:bg-gray-50 active:scale-[0.98]"
              >
                Close
              </button>
              <button className="h-14 w-14 flex items-center justify-center bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all">
                <Printer size={24} />
              </button>
              <button
                onClick={() => setStep(9)}
                className="flex-1 h-14 bg-[#2563EB] text-white rounded-2xl text-lg font-bold flex items-center justify-center gap-2 hover:bg-[#1D4ED8] transition-colors shadow-lg shadow-blue-100"
              >
                <Mail size={20} /> Email
              </button>
              <button
                onClick={() => setStep(10)}
                className="flex-1 h-14 bg-[#FF5A5F] text-white rounded-2xl text-lg font-bold flex items-center justify-center gap-2 hover:bg-[#FF4046] transition-colors shadow-lg shadow-red-100"
              >
                <Share2 size={20} /> Share
              </button>
            </div>
          </div>
        ) : step === 9 ? (
          <div className="space-y-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div>
                  <label className="block text-sm font-black text-gray-900 mb-2">
                    Recipient Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      defaultValue="admin@klar.com"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-400 font-bold mt-2 ml-1">
                    We'll send the receipt to this email address
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-4 border-2 border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors group">
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-300 group-hover:border-blue-500 flex items-center justify-center transition-colors">
                      <Check className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      Send a copy to my registered email
                    </span>
                  </label>

                  <div>
                    <label className="block text-sm font-black text-gray-900 mb-2">
                      Message (Optional)
                    </label>
                    <textarea
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white outline-none transition-all h-32 resize-none"
                      placeholder="Add a note..."
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-gray-50 rounded-3xl p-6 border border-gray-100">
                <h4 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Email Preview
                </h4>

                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="border-b border-gray-100 pb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                      <Mail className="text-blue-500 w-5 h-5" />
                    </div>
                    <h5 className="text-lg font-black text-gray-900">Transaction Receipt</h5>
                    <p className="text-sm text-gray-500 mt-1">
                      Funds added to wallet successfully via Razorpay
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <span className="text-xs text-gray-400 font-bold">Amount</span>
                      <span className="text-sm font-black text-gray-900">
                        ₹{parseInt(amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <span className="text-xs text-gray-400 font-bold">Date</span>
                      <span className="text-sm font-bold text-gray-900">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <span className="text-xs text-gray-400 font-bold">Transaction ID</span>
                      <span className="text-xs font-mono font-bold text-gray-600">
                        TXN{Date.now().toString().slice(-8)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <span className="text-xs text-gray-400 font-bold">Payment Method</span>
                      <span className="text-xs font-bold text-gray-600">Razorpay</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 font-medium px-2">
                    <Check className="text-green-500 w-3 h-3" />
                    PDF attachment: receipt.pdf
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setStep(8)}
                className="flex-1 h-14 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-lg font-bold transition-all hover:bg-gray-50 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <X size={20} /> Cancel
              </button>
              <button
                onClick={onClose}
                className="flex-1 h-14 bg-[#2563EB] text-white rounded-2xl text-lg font-bold shadow-lg shadow-blue-200 transition-all hover:bg-[#1D4ED8] hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Send size={20} /> Send Email
              </button>
            </div>
          </div>
        ) : step === 10 ? (
          <div className="space-y-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-8">
                <div>
                  <h4 className="text-sm font-black text-gray-900 mb-4">Share via</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="h-24 bg-white border-2 border-green-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-green-200 hover:bg-green-50/30 transition-all group">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MessageSquare className="text-green-600 w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-700">WhatsApp</span>
                    </button>
                    <button className="h-24 bg-white border-2 border-blue-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Mail className="text-blue-600 w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-700">Email</span>
                    </button>
                    <button className="h-24 bg-white border-2 border-sky-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-sky-200 hover:bg-sky-50/30 transition-all group">
                      <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Send className="text-sky-600 w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-700">Telegram</span>
                    </button>
                    <button className="h-24 bg-white border-2 border-purple-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-purple-200 hover:bg-purple-50/30 transition-all group">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Smartphone className="text-purple-600 w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-700">SMS</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-gray-900 mb-4">Receipt Link</h4>
                  <div className="flex gap-2">
                    <div className="flex-1 h-12 bg-gray-50 border border-gray-200 rounded-xl flex items-center px-4 overflow-hidden">
                      <span className="text-xs text-gray-500 font-mono truncate">
                        https://klar.com/receipt/TXN{Math.floor(Math.random() * 100000000)}
                      </span>
                    </div>
                    <button className="h-12 px-6 bg-[#111827] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors">
                      <Copy size={16} /> Copy
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    Share this link with anyone to view the receipt
                  </p>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                  <Info className="text-blue-500 w-5 h-5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-700">Secure Sharing</h4>
                    <p className="text-xs text-blue-600/80 mt-1 leading-relaxed">
                      The receipt link is secure and can only be accessed by those with the link. It
                      will remain valid for 90 days.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-8">
                <div>
                  <h4 className="text-sm font-black text-gray-900 mb-4">QR Code</h4>
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 flex flex-col items-center text-center">
                    <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                      <QrCode className="w-40 h-40 text-gray-900" />
                    </div>
                    <h5 className="text-sm font-black text-gray-900 mb-1">QR Code</h5>
                    <p className="text-xs text-gray-400 font-medium mb-6">Scan to view receipt</p>
                    <div className="bg-white/50 px-4 py-2 rounded-lg border border-gray-100">
                      <p className="text-[10px] whitespace-nowrap text-gray-400 font-bold uppercase tracking-wider">
                        Transaction:
                      </p>
                      <p className="text-xs font-black text-gray-900 font-mono">
                        TXN{Date.now().toString().slice(-8)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-gray-900 mb-4">Download Options</h4>
                  <div className="space-y-3">
                    <button className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-between hover:border-red-100 hover:bg-red-50/10 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors">
                          <FileText className="text-red-500 w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h5 className="text-sm font-black text-gray-900">Download as PDF</h5>
                          <p className="text-xs text-gray-400 font-medium">
                            Save receipt as PDF file
                          </p>
                        </div>
                      </div>
                      <Download className="text-gray-300 w-5 h-5 group-hover:text-red-500 transition-colors" />
                    </button>
                    <button className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-between hover:border-purple-100 hover:bg-purple-50/10 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                          <Image className="text-purple-500 w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h5 className="text-sm font-black text-gray-900">Download QR Code</h5>
                          <p className="text-xs text-gray-400 font-medium">
                            Save QR code as PNG image
                          </p>
                        </div>
                      </div>
                      <Download className="text-gray-300 w-5 h-5 group-hover:text-purple-500 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={() => setStep(8)}
                className="w-full h-14 bg-[#111827] text-white rounded-2xl text-lg font-bold shadow-lg shadow-gray-200 transition-all hover:bg-black hover:shadow-xl active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
};

export default AddFundsModal;

// import React, { useState } from 'react';
// import { X, Landmark, CreditCard, Smartphone, Globe, Loader2, Check, Download, Printer, Mail, Share2, Send, Copy, QrCode, FileText, Image, MessageSquare, Info, Plus } from 'lucide-react';
// import CreditCardForm from '../../../features/bookings/components/CreditCardForm';
// import { createOrder, verifyPaymentStatus } from '@/api/payment.service';

// interface AddFundsModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     onProceed?: (amount: number) => void;
// }

// const AddFundsModal: React.FC<AddFundsModalProps> = ({ isOpen, onClose, onProceed }) => {
//     const [amount, setAmount] = useState<string>('');
//     const [step, setStep] = useState(1);
//     const [isProcessingPayment, setIsProcessingPayment] = useState(false);
//     const [paymentError, setPaymentError] = useState<string | null>(null);

//     // Load Cashfree SDK
//     const loadCashfreeSDK = (): Promise<void> => {
//         return new Promise((resolve, reject) => {
//             if ((window as any).Cashfree) {
//                 resolve();
//                 return;
//             }

//             const script = document.createElement('script');
//             script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
//             script.async = true;
//             script.onload = () => {
//                 console.log('Cashfree SDK loaded successfully');
//                 resolve();
//             };
//             script.onerror = () => {
//                 console.error('Failed to load Cashfree SDK');
//                 reject(new Error('Failed to load payment gateway'));
//             };
//             document.body.appendChild(script);
//         });
//     };

//     // Handle Cashfree Payment
//     const handleCashfreePayment = async () => {
//         const amountValue = parseInt(amount);
//         if (isNaN(amountValue) || amountValue <= 0) {
//             setPaymentError('Please enter a valid amount');
//             return;
//         }

//         setIsProcessingPayment(true);
//         setPaymentError(null);

//         try {
//             const token = getItemWithTTL('token');
//             if (!token) {
//                 throw new Error('No authentication token found');
//             }

//             const backendUrl = import.meta.env.VITE_BACKEND_AUTH_URL || 'http://localhost:5010';

//             // Fetch user data
//             const userResponse = await fetch(`${backendUrl}/user/auth/me`, {
//                 headers: {
//                     'Authorization': `Bearer ${token}`,
//                     'Content-Type': 'application/json'
//                 }
//             });

//             if (!userResponse.ok) {
//                 throw new Error('Failed to fetch user data');
//             }

//             const userDataResponse = await userResponse.json();
//             const userData = userDataResponse.data?.user || userDataResponse;

//             const userId = userData.id || userData._id || userData.userId || 'guest_' + Date.now();
//             const userEmail = userData.email || '';
//             const mobile = userData.mobile || userData.phone || userData.mobileNumber || '';
//             const clientType = userData.clientType || 'B2B';

//             // Create order payload
//             const orderPayload = {
//                 userId: userId,
//                 userEmail: userEmail,
//                 mobile: mobile,
//                 clientType: clientType?.toUpperCase(),
//                 amount: amountValue,
//                 currency: 'INR',
//                 environment: 'sandbox',
//                 purpose: 'WALLET_TOPUP'
//             };

//             const orderResponse = await createOrder(orderPayload);

//             if (orderResponse?.success && orderResponse?.data) {
//                 const paymentSessionId = orderResponse.data.paymentSessionId;

//                 // Store order data in sessionStorage
//                 sessionStorage.setItem('walletTopupOrder', JSON.stringify(orderResponse.data));

//                 // Load Cashfree SDK
//                 await loadCashfreeSDK();

//                 const cashfree = (window as any).Cashfree({
//                     mode: "sandbox"
//                 });

//                 const checkoutOptions = {
//                     paymentSessionId: paymentSessionId,
//                     redirectTarget: "_modal"
//                 };

//                 // Open checkout and handle payment
//                 cashfree.checkout(checkoutOptions).then(async (paymentResult: any) => {
//                     console.log('Payment completed:', paymentResult);

//                     const orderData = JSON.parse(sessionStorage.getItem('walletTopupOrder') || '{}');
//                     const orderId = orderData.orderId;

//                     if (!orderId) {
//                         console.error('No order ID found');
//                         setPaymentError('Unable to verify payment. Please contact support.');
//                         setIsProcessingPayment(false);
//                         return;
//                     }

//                     try {
//                         // Verify payment status
//                         const verificationResult = await verifyPaymentStatus(orderId);

//                         console.log('Verification result:', verificationResult);

//                         if (verificationResult?.success && verificationResult?.data?.status === 'SUCCESS') {
//                             console.log('Payment verified successfully!');
//                             // Move to success step
//                             setStep(6);
//                             // Call parent callback if provided
//                             if (onProceed) {
//                                 onProceed(amountValue);
//                             }
//                         } else {
//                             console.log('Payment verification failed:', verificationResult);
//                             setPaymentError('Payment verification failed. Please contact support.');
//                             setStep(7); // Show error step
//                         }
//                     } catch (error) {
//                         console.error('Verification error:', error);
//                         setPaymentError('Could not verify payment status. Please contact support.');
//                         setStep(7);
//                     } finally {
//                         setIsProcessingPayment(false);
//                     }
//                 }).catch((error: any) => {
//                     console.error('Payment error:', error);
//                     setPaymentError(error?.message || 'Payment failed or was cancelled');
//                     setStep(7);
//                     setIsProcessingPayment(false);
//                 });

//             } else {
//                 throw new Error('Failed to create order');
//             }

//         } catch (error: any) {
//             console.error('Payment processing failed:', error);
//             let errorMessage = 'Unable to process payment. Please try again.';
//             if (error.message?.includes('network') || error.message?.includes('fetch')) {
//                 errorMessage = 'Network connection issue. Please check your internet and try again.';
//             } else if (error.message) {
//                 errorMessage = error.message;
//             }
//             setPaymentError(errorMessage);
//             setStep(7);
//             setIsProcessingPayment(false);
//         }
//     };

//     const quickAmounts = [20000, 50000, 100000, 250000];

//     const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const val = e.target.value.replace(/[^0-9]/g, '');
//         setAmount(val);
//     };

//     const handleQuickSelect = (val: number) => {
//         setAmount(val.toString());
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 p-4">
//             <div
//                 className={`bg-white w-full ${step >= 6 ? 'max-w-[896px]' : 'max-w-lg'} overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] rounded-2xl p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 transition-all ease-in-out`}
//                 onClick={(e) => e.stopPropagation()}
//             >
//                 {/* Header */}
//                 <div className="flex items-start justify-between mb-8">
//                     <div>
//                         <h2 className="text-3xl font-black text-[#111827]">
//                             {step === 8 ? 'Transaction Receipt' : step === 9 ? 'Email Receipt' : step === 10 ? 'Share Receipt' : 'Add Funds'}
//                         </h2>
//                         {step === 6 && (
//                             <p className="text-gray-400 font-bold mt-1">Payment Successful</p>
//                         )}
//                         {step === 7 && (
//                             <p className="text-gray-400 font-bold mt-1">Payment Failed</p>
//                         )}
//                         {step === 8 && (
//                             <p className="text-gray-400 font-bold mt-1">Official transaction document</p>
//                         )}
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
//                     >
//                         <X size={24} />
//                     </button>
//                 </div>

//                 {step === 1 ? (
//                     <>
//                         {/* Amount Input Section */}
//                         <div className="flex flex-col items-center mb-10">
//                             <div className="flex items-center gap-4 border-b-2 border-gray-100 w-full pb-4 px-2 hover:border-red-100 transition-colors group">
//                                 <span className="text-4xl font-black text-gray-300 group-focus-within:text-gray-900 transition-colors">₹</span>
//                                 <input
//                                     type="text"
//                                     value={amount}
//                                     onChange={handleAmountChange}
//                                     placeholder="0"
//                                     className="text-6xl font-black text-gray-900 bg-transparent border-none outline-none w-full placeholder:text-gray-100"
//                                     autoFocus
//                                 />
//                             </div>
//                         </div>

//                         {/* Quick Select Buttons */}
//                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
//                             {quickAmounts.map((val) => (
//                                 <button
//                                     key={val}
//                                     onClick={() => handleQuickSelect(val)}
//                                     className="flex flex-col items-center justify-center py-4 border border-gray-100 rounded-3xl hover:border-red-200 hover:bg-red-50/30 transition-all active:scale-95 group"
//                                 >
//                                     <span className="text-xs font-black text-gray-400 group-hover:text-red-500 mb-0.5">+</span>
//                                     <span className="text-sm font-black text-gray-900 group-hover:text-red-500">₹{val.toLocaleString()}</span>
//                                 </button>
//                             ))}
//                         </div>

//                         {/* Error Display */}
//                         {paymentError && (
//                             <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
//                                 <p className="text-sm text-red-600">{paymentError}</p>
//                             </div>
//                         )}

//                         {/* Proceed Button */}
//                         <button
//                             onClick={handleCashfreePayment}
//                             disabled={!amount || parseInt(amount) <= 0 || isProcessingPayment}
//                             className="w-full h-20 bg-gradient-to-r from-red-300 to-red-400 text-white rounded-2xl text-xl font-black shadow-lg shadow-red-200 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:shadow-none"
//                         >
//                             {isProcessingPayment ? (
//                                 <div className="flex items-center justify-center gap-2">
//                                     <Loader2 className="animate-spin" size={24} />
//                                     <span>Processing...</span>
//                                 </div>
//                             ) : (
//                                 `Pay ₹${parseInt(amount || '0').toLocaleString()}`
//                             )}
//                         </button>
//                     </>
//                 ) : step === 6 ? (
//                     <div className="py-8 text-center space-y-6">
//                         <div className="animate-in zoom-in-95 duration-500">
//                             <div className="flex justify-center mb-6">
//                                 <div className="w-28 h-28 bg-[#22C55E] rounded-full flex items-center justify-center shadow-lg shadow-green-200 shadow-xl">
//                                     <Check className="text-white w-14 h-14 drop-shadow-md" strokeWidth={3} />
//                                 </div>
//                             </div>

//                             <div className="space-y-2">
//                                 <h3 className="text-3xl font-black text-gray-900">Funds Added!</h3>
//                                 <p className="text-gray-500 font-medium">Your wallet has been topped up successfully.</p>
//                             </div>
//                         </div>

//                         <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 max-w-sm mx-auto">
//                             <div className="space-y-4">
//                                 <div className="flex justify-between items-center text-sm">
//                                     <span className="text-gray-400 font-bold">Amount Added</span>
//                                     <span className="text-xl font-black text-gray-900">₹{parseInt(amount).toLocaleString()}</span>
//                                 </div>
//                                 <div className="h-px bg-gray-200 w-full" />
//                                 <div className="flex justify-between items-center text-xs">
//                                     <span className="text-gray-400 font-bold">Transaction ID</span>
//                                     <span className="font-mono font-bold text-gray-600">TXN{Date.now().toString().slice(-8)}</span>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="flex flex-col gap-3 max-w-sm mx-auto pt-4">
//                             <button
//                                 onClick={() => setStep(8)}
//                                 className="w-full h-14 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-lg font-bold transition-all hover:bg-gray-50 active:scale-[0.98] flex items-center justify-center gap-2"
//                             >
//                                 <Download size={20} /> Download Receipt
//                             </button>
//                             <button
//                                 onClick={onClose}
//                                 className="w-full h-14 bg-[#111827] text-white rounded-2xl text-lg font-bold shadow-lg shadow-gray-200 transition-all hover:bg-black hover:shadow-xl active:scale-[0.98]"
//                             >
//                                 Done
//                             </button>
//                         </div>
//                     </div>
//                 ) : step === 7 ? (
//                     <div className="py-8 text-center space-y-6">
//                         <div className="animate-in zoom-in-95 duration-500">
//                             <div className="flex justify-center mb-6">
//                                 <div className="w-28 h-28 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-200 shadow-xl">
//                                     <X className="text-white w-14 h-14 drop-shadow-md" strokeWidth={3} />
//                                 </div>
//                             </div>

//                             <div className="space-y-2">
//                                 <h3 className="text-3xl font-black text-gray-900">Transaction Failed</h3>
//                                 <p className="text-gray-500 font-medium max-w-xs mx-auto">
//                                     {paymentError || "We couldn't process your payment. Please try again."}
//                                 </p>
//                             </div>
//                         </div>

//                         <div className="flex gap-4 max-w-sm mx-auto pt-4">
//                             <button
//                                 onClick={onClose}
//                                 className="flex-1 h-14 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-lg font-bold transition-all hover:bg-gray-50 active:scale-[0.98]"
//                             >
//                                 Close
//                             </button>
//                             <button
//                                 onClick={() => {
//                                     setStep(1);
//                                     setPaymentError(null);
//                                 }}
//                                 className="flex-1 h-14 bg-[#FF5A5F] text-white rounded-2xl text-lg font-bold shadow-lg shadow-red-200 transition-all hover:bg-[#FF4046] hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
//                             >
//                                 Try Again
//                             </button>
//                         </div>
//                     </div>
//                 ) : step === 8 ? (
//                     <div className="space-y-6">
//                         {/* Company Header */}
//                         <div className="flex justify-between items-start">
//                             <div>
//                                 <div className="text-2xl font-black text-[#1D4ED8] flex items-center gap-1">
//                                     Klar<span className="text-[#FF5A5F] text-xl">✦</span>
//                                 </div>
//                                 <div className="mt-4 space-y-1 text-xs text-gray-500 font-medium">
//                                     <p>123 Business Avenue, Mumbai</p>
//                                     <p>Maharashtra 400001, India</p>
//                                     <p>GSTIN: 27AABCU9603R1Z5</p>
//                                     <p>Email: support@klar.com</p>
//                                 </div>
//                             </div>
//                             <div className="text-right">
//                                 <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide mb-2 bg-green-100 text-green-700">
//                                     Success
//                                 </span>
//                                 <p className="text-xs font-bold text-gray-900">Receipt #TXN{Date.now().toString().slice(-8)}</p>
//                                 <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString()}</p>
//                                 <p className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</p>
//                             </div>
//                         </div>

//                         {/* Transaction Details Table */}
//                         <div>
//                             <h3 className="text-lg font-black text-gray-900 mb-4">Transaction Details</h3>
//                             <div className="border border-gray-200 rounded-2xl overflow-hidden">
//                                 <div className="bg-gray-100 p-3 flex justify-between text-xs font-black text-gray-500 uppercase tracking-wider">
//                                     <span>Description</span>
//                                     <span>Amount</span>
//                                 </div>
//                                 <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-white">
//                                     <div>
//                                         <p className="text-sm font-black text-gray-900">Wallet Top-up</p>
//                                         <p className="text-xs text-gray-500 mt-0.5">Funds added to wallet</p>
//                                     </div>
//                                     <span className="text-sm font-black text-gray-900">₹{parseInt(amount).toLocaleString()}</span>
//                                 </div>
//                                 <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-white">
//                                     <div>
//                                         <p className="text-sm font-black text-gray-900">Processing Fee</p>
//                                         <p className="text-xs text-gray-500 mt-0.5">No transaction charges</p>
//                                     </div>
//                                     <span className="text-sm font-black text-gray-900">₹0.00</span>
//                                 </div>
//                                 <div className="p-4 flex justify-between items-center bg-gray-50">
//                                     <p className="text-sm font-black text-gray-900">Total Amount Paid</p>
//                                     <span className="text-xl font-black text-[#1D4ED8]">₹{parseInt(amount).toLocaleString()}</span>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Payment Info */}
//                         <div className="grid grid-cols-2 gap-6">
//                             <div>
//                                 <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Payment Method</h3>
//                                 <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-white">
//                                     <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
//                                         <CreditCard className="text-blue-500 w-5 h-5" />
//                                     </div>
//                                     <div>
//                                         <p className="text-sm font-black text-gray-900">Credit/Debit Card</p>
//                                         <p className="text-xs text-gray-500">Via Cashfree</p>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div>
//                                 <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Credited To</h3>
//                                 <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-white">
//                                     <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
//                                         <Landmark className="text-red-500 w-5 h-5" />
//                                     </div>
//                                     <div>
//                                         <p className="text-sm font-black text-gray-900">Klar Wallet</p>
//                                         <p className="text-xs text-gray-500">Available Balance</p>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Footer Actions */}
//                         <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
//                             <button
//                                 onClick={onClose}
//                                 className="flex-1 h-14 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-lg font-bold transition-all hover:bg-gray-50 active:scale-[0.98]"
//                             >
//                                 Close
//                             </button>
//                             <button className="h-14 w-14 flex items-center justify-center bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all">
//                                 <Printer size={24} />
//                             </button>
//                             <button
//                                 onClick={() => setStep(9)}
//                                 className="flex-1 h-14 bg-[#2563EB] text-white rounded-2xl text-lg font-bold flex items-center justify-center gap-2 hover:bg-[#1D4ED8] transition-colors shadow-lg shadow-blue-100"
//                             >
//                                 <Mail size={20} /> Email
//                             </button>
//                             <button
//                                 onClick={() => setStep(10)}
//                                 className="flex-1 h-14 bg-[#FF5A5F] text-white rounded-2xl text-lg font-bold flex items-center justify-center gap-2 hover:bg-[#FF4046] transition-colors shadow-lg shadow-red-100"
//                             >
//                                 <Share2 size={20} /> Share
//                             </button>
//                         </div>
//                     </div>
//                 ) : step === 9 ? (
//                     <div className="space-y-8">
//                         <div className="flex flex-col lg:flex-row gap-8">
//                             <div className="flex-1 space-y-6">
//                                 <div>
//                                     <label className="block text-sm font-black text-gray-900 mb-2">Recipient Email</label>
//                                     <div className="relative">
//                                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
//                                         <input
//                                             type="email"
//                                             defaultValue="admin@klar.com"
//                                             className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
//                                         />
//                                     </div>
//                                     <p className="text-xs text-gray-400 font-bold mt-2 ml-1">We'll send the receipt to this email address</p>
//                                 </div>

//                                 <div className="space-y-4">
//                                     <label className="flex items-center gap-3 p-4 border-2 border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors group">
//                                         <div className="w-6 h-6 rounded-lg border-2 border-gray-300 group-hover:border-blue-500 flex items-center justify-center transition-colors">
//                                             <Check className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
//                                         </div>
//                                         <span className="text-sm font-bold text-gray-700">Send a copy to my registered email</span>
//                                     </label>

//                                     <div>
//                                         <label className="block text-sm font-black text-gray-900 mb-2">Message (Optional)</label>
//                                         <textarea
//                                             className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white outline-none transition-all h-32 resize-none"
//                                             placeholder="Add a note..."
//                                         ></textarea>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="flex-1 bg-gray-50 rounded-3xl p-6 border border-gray-100">
//                                 <h4 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
//                                     <div className="w-2 h-2 rounded-full bg-blue-500"></div>
//                                     Email Preview
//                                 </h4>

//                                 <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
//                                     <div className="border-b border-gray-100 pb-6">
//                                         <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
//                                             <Mail className="text-blue-500 w-5 h-5" />
//                                         </div>
//                                         <h5 className="text-lg font-black text-gray-900">Transaction Receipt</h5>
//                                         <p className="text-sm text-gray-500 mt-1">Funds added to wallet successfully</p>
//                                     </div>

//                                     <div className="space-y-4">
//                                         <div className="flex justify-between items-center py-3 border-b border-gray-50">
//                                             <span className="text-xs text-gray-400 font-bold">Amount</span>
//                                             <span className="text-sm font-black text-gray-900">₹{parseInt(amount).toLocaleString()}</span>
//                                         </div>
//                                         <div className="flex justify-between items-center py-3 border-b border-gray-50">
//                                             <span className="text-xs text-gray-400 font-bold">Date</span>
//                                             <span className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString()}</span>
//                                         </div>
//                                         <div className="flex justify-between items-center py-3 border-b border-gray-50">
//                                             <span className="text-xs text-gray-400 font-bold">Transaction ID</span>
//                                             <span className="text-xs font-mono font-bold text-gray-600">TXN{Date.now().toString().slice(-8)}</span>
//                                         </div>
//                                     </div>

//                                     <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 font-medium px-2">
//                                         <Check className="text-green-500 w-3 h-3" />
//                                         PDF attachment: receipt.pdf
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="flex gap-4 pt-4 border-t border-gray-100">
//                             <button
//                                 onClick={() => setStep(8)}
//                                 className="flex-1 h-14 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-lg font-bold transition-all hover:bg-gray-50 active:scale-[0.98] flex items-center justify-center gap-2"
//                             >
//                                 <X size={20} /> Cancel
//                             </button>
//                             <button
//                                 onClick={onClose}
//                                 className="flex-1 h-14 bg-[#2563EB] text-white rounded-2xl text-lg font-bold shadow-lg shadow-blue-200 transition-all hover:bg-[#1D4ED8] hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
//                             >
//                                 <Send size={20} /> Send Email
//                             </button>
//                         </div>
//                     </div>
//                 ) : step === 10 ? (
//                     <div className="space-y-8">
//                         <div className="flex flex-col lg:flex-row gap-8">
//                             <div className="flex-1 space-y-8">
//                                 <div>
//                                     <h4 className="text-sm font-black text-gray-900 mb-4">Share via</h4>
//                                     <div className="grid grid-cols-2 gap-4">
//                                         <button className="h-24 bg-white border-2 border-green-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-green-200 hover:bg-green-50/30 transition-all group">
//                                             <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
//                                                 <MessageSquare className="text-green-600 w-5 h-5" />
//                                             </div>
//                                             <span className="text-xs font-bold text-gray-700">WhatsApp</span>
//                                         </button>
//                                         <button className="h-24 bg-white border-2 border-blue-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
//                                             <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
//                                                 <Mail className="text-blue-600 w-5 h-5" />
//                                             </div>
//                                             <span className="text-xs font-bold text-gray-700">Email</span>
//                                         </button>
//                                         <button className="h-24 bg-white border-2 border-sky-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-sky-200 hover:bg-sky-50/30 transition-all group">
//                                             <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
//                                                 <Send className="text-sky-600 w-5 h-5" />
//                                             </div>
//                                             <span className="text-xs font-bold text-gray-700">Telegram</span>
//                                         </button>
//                                         <button className="h-24 bg-white border-2 border-purple-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-purple-200 hover:bg-purple-50/30 transition-all group">
//                                             <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
//                                                 <Smartphone className="text-purple-600 w-5 h-5" />
//                                             </div>
//                                             <span className="text-xs font-bold text-gray-700">SMS</span>
//                                         </button>
//                                     </div>
//                                 </div>

//                                 <div>
//                                     <h4 className="text-sm font-black text-gray-900 mb-4">Receipt Link</h4>
//                                     <div className="flex gap-2">
//                                         <div className="flex-1 h-12 bg-gray-50 border border-gray-200 rounded-xl flex items-center px-4 overflow-hidden">
//                                             <span className="text-xs text-gray-500 font-mono truncate">
//                                                 https://klar.com/receipt/TXN{Math.floor(Math.random() * 100000000)}
//                                             </span>
//                                         </div>
//                                         <button className="h-12 px-6 bg-[#111827] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors">
//                                             <Copy size={16} /> Copy
//                                         </button>
//                                     </div>
//                                     <p className="text-[10px] text-gray-400 mt-2">Share this link with anyone to view the receipt</p>
//                                 </div>

//                                 <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
//                                     <Info className="text-blue-500 w-5 h-5 flex-shrink-0" />
//                                     <div>
//                                         <h4 className="text-sm font-bold text-blue-700">Secure Sharing</h4>
//                                         <p className="text-xs text-blue-600/80 mt-1 leading-relaxed">
//                                             The receipt link is secure and can only be accessed by those with the link. It will remain valid for 90 days.
//                                         </p>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="flex-1 space-y-8">
//                                 <div>
//                                     <h4 className="text-sm font-black text-gray-900 mb-4">QR Code</h4>
//                                     <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 flex flex-col items-center text-center">
//                                         <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
//                                             <QrCode className="w-40 h-40 text-gray-900" />
//                                         </div>
//                                         <h5 className="text-sm font-black text-gray-900 mb-1">QR Code</h5>
//                                         <p className="text-xs text-gray-400 font-medium mb-6">Scan to view receipt</p>
//                                         <div className="bg-white/50 px-4 py-2 rounded-lg border border-gray-100">
//                                             <p className="text-[10px] whitespace-nowrap text-gray-400 font-bold uppercase tracking-wider">Transaction:</p>
//                                             <p className="text-xs font-black text-gray-900 font-mono">TXN{Date.now().toString().slice(-8)}</p>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 <div>
//                                     <h4 className="text-sm font-black text-gray-900 mb-4">Download Options</h4>
//                                     <div className="space-y-3">
//                                         <button className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-between hover:border-red-100 hover:bg-red-50/10 transition-all group">
//                                             <div className="flex items-center gap-4">
//                                                 <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors">
//                                                     <FileText className="text-red-500 w-5 h-5" />
//                                                 </div>
//                                                 <div className="text-left">
//                                                     <h5 className="text-sm font-black text-gray-900">Download as PDF</h5>
//                                                     <p className="text-xs text-gray-400 font-medium">Save receipt as PDF file</p>
//                                                 </div>
//                                             </div>
//                                             <Download className="text-gray-300 w-5 h-5 group-hover:text-red-500 transition-colors" />
//                                         </button>
//                                         <button className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-between hover:border-purple-100 hover:bg-purple-50/10 transition-all group">
//                                             <div className="flex items-center gap-4">
//                                                 <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
//                                                     <Image className="text-purple-500 w-5 h-5" />
//                                                 </div>
//                                                 <div className="text-left">
//                                                     <h5 className="text-sm font-black text-gray-900">Download QR Code</h5>
//                                                     <p className="text-xs text-gray-400 font-medium">Save QR code as PNG image</p>
//                                                 </div>
//                                             </div>
//                                             <Download className="text-gray-300 w-5 h-5 group-hover:text-purple-500 transition-colors" />
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="pt-4 border-t border-gray-100">
//                             <button
//                                 onClick={() => setStep(8)}
//                                 className="w-full h-14 bg-[#111827] text-white rounded-2xl text-lg font-bold shadow-lg shadow-gray-200 transition-all hover:bg-black hover:shadow-xl active:scale-[0.98]"
//                             >
//                                 Close
//                             </button>
//                         </div>
//                     </div>
//                 ) : (
//                     <div></div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default AddFundsModal;
