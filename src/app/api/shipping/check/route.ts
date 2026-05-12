import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { pincode } = await request.json();

    if (!pincode || pincode.length !== 6) {
      return NextResponse.json({ error: 'Invalid pincode' }, { status: 400 });
    }

    const email = process.env.NIMBUSPOST_EMAIL;
    const password = process.env.NIMBUSPOST_PASSWORD;
    const permanentToken = process.env.NIMBUSPOST_TOKEN || process.env.NIMBUSPOST_API_KEY;

    let token = permanentToken;

    if (!token) {
      // Login to get the token (NimbusPost V1 fallback)
      const loginRes = await fetch('https://api.nimbuspost.com/v1/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();
      if (!loginData.status || !loginData.data) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      token = loginData.data;
    }

    // Now check serviceability
    const pickupPincode = process.env.NIMBUSPOST_PICKUP_PINCODE || "";
    const serviceabilityRes = await fetch(
      `https://api.nimbuspost.com/v1/courier/serviceability?pincode=${pincode}&weight=0.5&payment_mode=prepaid&order_amount=100${pickupPincode ? `&pickup_pincode=${pickupPincode}` : ''}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const serviceData = await serviceabilityRes.json();

    if (serviceData.status && serviceData.data) {
      let couriers = [];
      if (Array.isArray(serviceData.data)) {
        couriers = serviceData.data;
      } else if (serviceData.data.couriers && Array.isArray(serviceData.data.couriers)) {
        couriers = serviceData.data.couriers;
      }

      const available = couriers.length > 0;
      
      // Find the minimum shipping rate
      let minRate = 0;
      if (available) {
        // Filter out zero rates if possible to avoid false "Free Shipping"
        const rates = couriers.map((c: any) => Number(c.total_amount || c.freight_charges || c.rate || c.charge || c.total_charge || c.shipping_charge || 0));
        const validRates = rates.filter((r: number) => r > 0);
        minRate = validRates.length > 0 ? Math.min(...validRates) : 0;
      }

      console.log(`Pincode Check [${pincode}]: Found ${couriers.length} couriers. Min Rate: ${minRate}`);

      return NextResponse.json({ 
        available, 
        rate: minRate,
        couriers: couriers.slice(0, 3) 
      });
    }

    return NextResponse.json({ available: false });
  } catch (error) {
    console.error('Pincode check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
