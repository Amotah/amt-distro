import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { PayoutAccountDetails } from '../../utils/payment-api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface RevenuePayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  isSubmitting: boolean;
  onSubmit: (input: { amount: number; payoutAccount: PayoutAccountDetails }) => Promise<void> | void;
}

export const MIN_PAYOUT_AMOUNT = 50000;

export function RevenuePayoutDialog({
  open,
  onOpenChange,
  availableBalance,
  isSubmitting,
  onSubmit,
}: RevenuePayoutDialogProps) {
  const location = useLocation();
  const isLabelDashboard = location.pathname.startsWith('/label-dashboard');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  useEffect(() => {
    if (!open) {
      setAmount('');
      setError('');
      setAccountName('');
      setAccountNumber('');
      setBankName('');
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid payout amount.');
      return;
    }

    if (parsedAmount < MIN_PAYOUT_AMOUNT) {
      setError('Minimum payout request is ₦50,000.');
      return;
    }

    if (parsedAmount > availableBalance) {
      setError('Payout amount cannot exceed your available earnings.');
      return;
    }

    if (!accountName.trim()) {
      setError('Enter the account name for this payout.');
      return;
    }

    if (!bankName.trim()) {
      setError('Enter the destination bank name.');
      return;
    }

    if (!/^\d{10}$/.test(accountNumber.trim())) {
      setError('Account number must be exactly 10 digits.');
      return;
    }

    setError('');
    await onSubmit({
      amount: parsedAmount,
      payoutAccount: {
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim(),
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#161616] text-white' : ''}>
        <DialogHeader>
          <DialogTitle>Request Revenue Payout</DialogTitle>
          <DialogDescription className={isLabelDashboard ? 'text-[#B3B3B3]' : ''}>
            Request a bank-transfer payout from your available earnings. The amount is reserved immediately and added to Payment History.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={isLabelDashboard ? 'rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4 text-sm text-[#B3B3B3]' : 'rounded-lg bg-slate-50 p-4 text-sm text-slate-700'}>
            <div className={isLabelDashboard ? 'font-medium text-white' : 'font-medium text-slate-900'}>Available earnings</div>
            <div className={isLabelDashboard ? 'mt-1 text-2xl font-semibold text-white' : 'mt-1 text-2xl font-semibold text-slate-900'}>₦{availableBalance.toLocaleString()}</div>
            <div className={isLabelDashboard ? 'mt-1 text-xs text-[#888]' : 'mt-1 text-xs text-slate-500'}>Minimum payout is ₦50,000. You cannot request more than your available earnings.</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payoutAmount">Payout amount</Label>
            <Input
              id="payoutAmount"
              type="number"
              min={MIN_PAYOUT_AMOUNT}
              step="1000"
              inputMode="numeric"
              placeholder="50000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={isSubmitting}
              className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payoutAccountName">Account name</Label>
            <Input
              id="payoutAccountName"
              type="text"
              placeholder="Legal account name"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              disabled={isSubmitting}
              className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]' : ''}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payoutBankName">Bank name</Label>
              <Input
                id="payoutBankName"
                type="text"
                placeholder="Bank name"
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                disabled={isSubmitting}
                className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payoutAccountNumber">Account number</Label>
              <Input
                id="payoutAccountNumber"
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="0123456789"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ''))}
                disabled={isSubmitting}
                className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]' : ''}
              />
            </div>
          </div>

          {error ? <p className={isLabelDashboard ? 'text-sm text-red-200' : 'text-sm text-red-600'}>{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]' : ''}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || availableBalance < MIN_PAYOUT_AMOUNT} className={isLabelDashboard ? 'bg-[#FF6B00] text-white hover:bg-[#ff7f26]' : ''}>
              {isSubmitting ? 'Submitting...' : 'Confirm Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}