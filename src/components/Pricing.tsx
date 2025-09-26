import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Check, Star } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

interface PricingProps {
  onSubscribe?: (plan: string, properties: number) => void;
}

const Pricing: React.FC<PricingProps> = ({ onSubscribe }) => {
  const { user } = useUser();
  const [selectedProperties, setSelectedProperties] = useState(1);

  const calculatePrice = (properties: number) => {
    return properties * 20;
  };

  const handleSubscribe = (plan: string) => {
    if (onSubscribe) {
      onSubscribe(plan, selectedProperties);
    }
  };

  const features = [
    "Unlimited CSV uploads",
    "AI-powered categorization",
    "Real-time analytics dashboard",
    "Team collaboration",
    "Data export capabilities",
    "Priority support"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start with a free month, then pay only for what you need. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto">
          <Card className="relative border-2 border-primary shadow-xl">
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white">
              <Star className="w-3 h-3 mr-1" />
              Most Popular
            </Badge>
            
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900">
                PropFi Pro
              </CardTitle>
              <CardDescription className="text-gray-600">
                Everything you need to manage your properties
              </CardDescription>
              
              {/* Pricing Display */}
              <div className="mt-6">
                <div className="text-sm text-gray-500 mb-2">First month free, then:</div>
                <div className="text-4xl font-bold text-primary">
                  ${calculatePrice(selectedProperties)}
                  <span className="text-lg text-gray-500">/month</span>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  $20 per property per month
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Property Count Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Number of Properties
                </label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProperties(Math.max(1, selectedProperties - 1))}
                    disabled={selectedProperties <= 1}
                  >
                    -
                  </Button>
                  <span className="w-16 text-center font-medium">
                    {selectedProperties}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProperties(selectedProperties + 1)}
                  >
                    +
                  </Button>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  You can change this anytime in your dashboard
                </div>
              </div>

              {/* Features List */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">What's included:</h3>
                <ul className="space-y-2">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => handleSubscribe('pro')}
              >
                {user ? 'Start Free Trial' : 'Sign Up for Free Trial'}
              </Button>

              <div className="text-center text-xs text-gray-500">
                No credit card required for the first month
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto mt-12 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Cancel Anytime</h3>
            <p className="text-sm text-gray-600">
              No long-term contracts. Cancel your subscription whenever you want.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Scale as You Grow</h3>
            <p className="text-sm text-gray-600">
              Add or remove properties anytime. You only pay for what you use.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Priority Support</h3>
            <p className="text-sm text-gray-600">
              Get help when you need it with our dedicated support team.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                How does the free trial work?
              </h3>
              <p className="text-sm text-gray-600">
                You get full access to all features for the first month at no cost. No credit card required to start.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change my property count later?
              </h3>
              <p className="text-sm text-gray-600">
                Yes! You can add or remove properties anytime from your dashboard. Billing updates automatically.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens if I exceed my property limit?
              </h3>
              <p className="text-sm text-gray-600">
                We'll automatically upgrade your plan and charge the difference. You'll receive an email notification.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Is there a setup fee?
              </h3>
              <p className="text-sm text-gray-600">
                No setup fees, no hidden costs. Just the transparent monthly pricing you see here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
