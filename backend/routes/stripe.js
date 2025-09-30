const express = require('express');
const router = express.Router();

// Initialize Stripe only if the secret key is available
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.');
}

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe service not available' });
  }
  
  try {
    const { plan, properties, userId, userEmail, organizationId } = req.body;

    // Calculate price based on properties
    const pricePerProperty = 2000; // $20.00 in cents
    const totalPrice = properties * pricePerProperty;

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        userId,
        organizationId: organizationId || '',
        properties: properties.toString(),
      },
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'PropFi Pro',
              description: `Property management for ${properties} ${properties === 1 ? 'property' : 'properties'} at $20/property/month`,
            },
            unit_amount: totalPrice,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing`,
      metadata: {
        userId,
        organizationId: organizationId || '',
        properties: properties.toString(),
      },
      subscription_data: {
        trial_period_days: 30, // 1 month free trial
        metadata: {
          userId,
          organizationId: organizationId || '',
          properties: properties.toString(),
        },
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create customer portal session
router.post('/create-portal-session', async (req, res) => {
  try {
    const { customerId } = req.body;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subscription status
router.get('/subscription-status', async (req, res) => {
  try {
    const { userId } = req.query;

    // Find customer by userId in metadata
    const customers = await stripe.customers.list({
      limit: 100,
    });

    const customer = customers.data.find(c => c.metadata.userId === userId);

    if (!customer) {
      return res.json({ 
        hasSubscription: false, 
        status: 'inactive',
        properties: 0 
      });
    }

    // Get subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
    });

    if (subscriptions.data.length === 0) {
      return res.json({ 
        hasSubscription: false, 
        status: 'inactive',
        properties: parseInt(customer.metadata.properties) || 0 
      });
    }

    const activeSubscription = subscriptions.data.find(sub => 
      sub.status === 'active' || sub.status === 'trialing'
    );

    if (!activeSubscription) {
      return res.json({ 
        hasSubscription: false, 
        status: 'inactive',
        properties: parseInt(customer.metadata.properties) || 0 
      });
    }

    res.json({
      hasSubscription: true,
      status: activeSubscription.status,
      customerId: customer.id,
      subscriptionId: activeSubscription.id,
      properties: parseInt(customer.metadata.properties) || 0,
      currentPeriodEnd: activeSubscription.current_period_end,
      trialEnd: activeSubscription.trial_end,
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook handler for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Checkout session completed:', session.id);
      // Here you could update your database with the subscription info
      break;

    case 'customer.subscription.created':
      const subscription = event.data.object;
      console.log('Subscription created:', subscription.id);
      break;

    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object;
      console.log('Subscription updated:', updatedSubscription.id);
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      console.log('Subscription deleted:', deletedSubscription.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
