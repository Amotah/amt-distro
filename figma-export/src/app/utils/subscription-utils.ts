import { getBillingHistory } from './payment-api';

/**
 * Check if a partner has an active paid subscription
 * Accepts any completed partner subscription payment
 */
export async function hasActivePartnerSubscription(): Promise<boolean> {
  try {
    const history = await getBillingHistory();
    const now = new Date();
    
    const activeSubscription = history.find(
      (record) => {
        // Must be a completed partner subscription
        if (record.type !== 'subscription' || record.plan !== 'partner' || record.status !== 'completed' || record.provider !== 'paystack') {
          return false;
        }
        
        // Must not be cancelled
        if (record.cancelledAt) {
          return false;
        }
        
        // If expiresAt is set, check expiry
        if (record.expiresAt && new Date(record.expiresAt) <= now) {
          return false;
        }
        
        // Subscription is valid
        return true;
      }
    );

    return !!activeSubscription;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Get the most recent partner subscription record
 */
export async function getActivePartnerSubscription() {
  try {
    const history = await getBillingHistory();
    const now = new Date();
    
    return history.find(
      (record) => {
        // Must be a completed partner subscription
        if (record.type !== 'subscription' || record.plan !== 'partner' || record.status !== 'completed' || record.provider !== 'paystack') {
          return false;
        }
        
        // Must not be cancelled
        if (record.cancelledAt) {
          return false;
        }
        
        // If expiresAt is set, check expiry
        if (record.expiresAt && new Date(record.expiresAt) <= now) {
          return false;
        }
        
        // Subscription is valid
        return true;
      }
    ) || null;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}
