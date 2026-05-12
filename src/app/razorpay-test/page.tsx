'use client';

import RazorpayCheckout from '@/components/RazorpayCheckout';

export default function RazorpayTestPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Razorpay Integration
        </h1>
        <p className="text-gray-600 text-center">
          Test the Razorpay Standard Web Checkout integration.
        </p>
        
        <div className="border-t border-gray-100 pt-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-medium text-gray-700">Sample Product</span>
            <span className="text-xl font-bold text-blue-600">₹10.00</span>
          </div>
          
          <div className="flex flex-col space-y-4">
            <RazorpayCheckout 
              amount={1000} // 1000 paise = ₹10
              currency="INR"
              name="Nexa Print Test"
              description="Testing standard checkout"
              onSuccess={(res) => console.log('Payment success:', res)}
              onError={(err) => console.error('Payment error:', err)}
              className="w-full py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
            />
            
            <p className="text-xs text-center text-gray-400">
              This is a test environment. Use test credentials provided in Razorpay docs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
