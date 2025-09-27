import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Check, CreditCard, Calendar, Building2, AlertCircle, ExternalLink } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { getSubscriptionStatus, createCustomerPortalSession } from '../services/stripeService';

interface SubscriptionData {
  hasSubscription: boolean;
  status: string;
  customerId?: string;
  subscriptionId?: string;
  properties: number;
  currentPeriodEnd?: number;
  trialEnd?: number;
}

const SubscriptionManagement: React.FC = () => {
  const { user } = useUser();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubscriptionStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getSubscriptionStatus(user.id);
      setSubscription(data);
    } catch (err) {
      console.error('Error loading subscription status:', err);
      setError('Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSubscriptionStatus();
    }
  }, [user, loadSubscriptionStatus]);

  const handleManageSubscription = async () => {
    if (!subscription?.customerId) return;
    
    try {
      await createCustomerPortalSession(subscription.customerId);
    } catch (err) {
      console.error('Error opening customer portal:', err);
      setError('Failed to open subscription management');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800">Free Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Past Due</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>No Subscription Found</span>
            </CardTitle>
            <CardDescription>
              You don't have an active subscription. Start your free trial today!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToPage', { detail: { page: 'pricing' } }))}
              className="w-full"
            >
              View Pricing Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTrialActive = subscription.status === 'trialing' && subscription.trialEnd;
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscription & Pricing</h2>
        <p className="text-gray-600">Manage your PropFi subscription, billing, and pricing</p>
      </div>

      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Current Plan</span>
              </CardTitle>
              <CardDescription>PropFi Pro Plan</CardDescription>
            </div>
            {getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{subscription.properties} Properties</p>
                <p className="text-xs text-gray-500">Included in plan</p>
              </div>
            </div>
            
            {isTrialActive && subscription.trialEnd && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Trial Ends</p>
                  <p className="text-xs text-gray-500">{formatDate(subscription.trialEnd)}</p>
                </div>
              </div>
            )}
            
            {isActive && subscription.currentPeriodEnd && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Next Billing</p>
                  <p className="text-xs text-gray-500">{formatDate(subscription.currentPeriodEnd)}</p>
                </div>
              </div>
            )}
          </div>

          {isTrialActive && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Free Trial Active</p>
                  <p className="text-xs text-blue-700">
                    Your trial ends on {subscription.trialEnd ? formatDate(subscription.trialEnd) : 'N/A'}. 
                    You'll be charged automatically unless you cancel.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <Button 
              onClick={handleManageSubscription}
              className="flex-1"
              disabled={!subscription.customerId}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Manage Subscription
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToPage', { detail: { page: 'pricing' } }))}
            >
              Change Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan Details */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Details</CardTitle>
          <CardDescription>What's included in your PropFi Pro plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              'Unlimited CSV uploads',
              'AI-powered categorization',
              'Real-time analytics dashboard',
              'Team collaboration',
              'Data export capabilities',
              'Priority support',
              `${subscription.properties} properties at $20 each`
            ].map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing Information */}
      {isActive && (
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>Your current billing cycle and payment details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Properties ({subscription.properties} × $20)
                </span>
                <span className="text-sm font-medium">
                  ${subscription.properties * 20}/month
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="text-sm font-medium text-gray-900">Total</span>
                <span className="text-sm font-medium text-gray-900">
                  ${subscription.properties * 20}/month
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Pricing Plans</span>
          </CardTitle>
          <CardDescription>Current PropFi pricing structure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">PropFi Pro</h3>
                <Badge className="bg-blue-100 text-blue-800">Current Plan</Badge>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                $20 <span className="text-sm font-normal text-gray-600">per property per month</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Start with a 1-month free trial, then pay only for what you need.
              </p>
              <div className="space-y-2">
                {[
                  'Unlimited CSV uploads',
                  'AI-powered categorization',
                  'Real-time analytics dashboard',
                  'Team collaboration',
                  'Data export capabilities',
                  'Priority support',
                  'Secure cloud storage'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-center">
              <Button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigateToPage', { detail: { page: 'pricing' } }))}
                variant="outline"
                className="w-full"
              >
                View Full Pricing Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionManagement;
