'use client';

import React, { useState } from 'react';
import Script from 'next/script';

interface RazorpayCheckoutProps {
  amount: number; // in paise
  currency?: string;
  name?: string;
  description?: string;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  buttonText?: string;
  className?: string;
}

const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({
  amount,
  currency = 'INR',
  name = 'Nexa Print',
  description = 'Order Payment',
  onSuccess,
  onError,
  buttonText = 'Pay Now',
  className = '',
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Create order on the backend
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency }),
      });

      const orderData = await response.json();

      if (!response.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      const { order_id } = orderData;

      // 2. Configure Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name,
        description,
        order_id,
        handler: async function (response: any) {
          // 3. Verify payment on the backend
          try {
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              if (onSuccess) onSuccess(response);
              alert('Payment Successful!');
            } else {
              throw new Error(verifyData.message || 'Verification failed');
            }
          } catch (err: any) {
            console.error('Verification Error:', err);
            if (onError) onError(err);
            alert('Payment verification failed: ' + err.message);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#3399cc',
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            console.log('Checkout modal closed');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment Failed:', response.error);
        if (onError) onError(response.error);
        alert('Payment Failed: ' + response.error.description);
        setLoading(false);
      });

      rzp.open();
    } catch (error: any) {
      console.error('Checkout Error:', error);
      if (onError) onError(error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <button
        onClick={handlePayment}
        disabled={loading}
        className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 ${className}`}
      >
        {loading ? 'Processing...' : buttonText}
      </button>
    </>
  );
};

export default RazorpayCheckout;
