const Razorpay = require('razorpay');
const Order = require('../../models/orderSchema');

const razorpay = new Razorpay({
  key_id: process.env.SECRETKEYID,
  key_secret: process.env.SECRETCODE,
});

exports.createOrder = async (req, res) => {
  const { amount, vendor_id, plan_id } = req.body;
  console.log('Received request:', { amount, vendor_id, plan_id });
  console.log('Razorpay initialized with key_id:',razorpay )


  // Validate input
  if (!amount || !vendor_id || !plan_id) {
    console.error('Missing required fields:', { amount, vendor_id, plan_id });
    return res.status(400).json({
      success: false,
      error: 'Amount, vendor_id, and plan_id are required',
    });
  }

  try {
    console.log('Creating Razorpay order with options...');
    
    const options = {
      amount: parseInt(amount) * 100, // Convert to paise
      currency: 'INR',
      receipt: `rcptid_${Date.now()}`,
      notes: {
        vendor_id,
        plan_id,
      },
    };

    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created:', order);

    const newOrder = new Order({
      orderId: order.id,
      amount: parseInt(amount),
      currency: order.currency,
      status: order.status,
      vendor_id,
      plan_id,
      created_at: new Date(),
    });

    console.log('Saving order to database:', newOrder);
    await newOrder.save();
    console.log('Order saved to database:', newOrder);

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: `Failed to create order: ${error.message || JSON.stringify(error)}`,
    });
  }
};
