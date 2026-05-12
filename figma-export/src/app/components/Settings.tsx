import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useContractStatusSummary } from '../hooks/useContractStatusSummary';
import {
  User, CreditCard, Bell, Shield, Lock, Link2, Receipt, HelpCircle, FileText, Clock,
} from 'lucide-react';
import { ProfileTab } from './settings/ProfileTab';
import { SecurityTab } from './settings/SecurityTab';
import { PaymentsTab } from './settings/PaymentsTab';
import { NotificationsTab } from './settings/NotificationsTab';
import { PrivacyTab } from './settings/PrivacyTab';
import { IntegrationsTab } from './settings/IntegrationsTab';
import { BillingTab } from './settings/BillingTab';
import { SupportTab } from './settings/SupportTab';

interface SettingsProps {
  onNavigate?: (page: string) => void;
}

type TabId = 'profile' | 'security' | 'payments' | 'notifications' | 'privacy' | 'integrations' | 'billing' | 'support';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Account Security', icon: Shield },
  { id: 'payments', label: 'Payment Methods', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Data', icon: Lock },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'billing', label: 'Billing & Plan', icon: Receipt },
  { id: 'support', label: 'Support & Help', icon: HelpCircle },
];

export function Settings({ onNavigate }: SettingsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const contractSummary = useContractStatusSummary();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [comingSoonMsg, setComingSoonMsg] = useState<string | null>(null);

  const handleNavigate = (path: string) => {
    if (path === 'contracts') {
      navigate('../contracts');
    } else {
      navigate(path);
    }
  };

  return (
    <section className="min-h-screen bg-[#0A0A0A] px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl text-white sm:text-4xl mb-2">Settings</h1>
          <p className="text-sm text-[#B3B3B3] sm:text-base">Manage your account and application settings</p>
        </div>

        {comingSoonMsg && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <Clock className="h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="text-sm text-amber-300"><span className="font-medium">{comingSoonMsg}</span> is coming soon.</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <nav className="lg:w-56 flex-shrink-0">
            {/* Mobile: horizontal scroll tabs */}
            <div className="flex lg:hidden gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-xl text-xs font-medium transition-colors flex-shrink-0 ${
                      active
                        ? 'bg-[#FF6B00] text-white'
                        : 'bg-[#111] border border-white/8 text-[#B3B3B3] hover:bg-[#1a1a1a]'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Desktop: vertical sidebar */}
            <div className="hidden lg:flex flex-col space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                      active
                        ? 'bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/25'
                        : 'text-[#B3B3B3] hover:bg-[#1a1a1a] hover:text-white border border-transparent'
                    }`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {tab.label}
                  </button>
                );
              })}

              {/* Contract Center shortcut */}
              <div className="pt-3 border-t border-white/8 mt-2">
                <button type="button" onClick={() => handleNavigate('contracts')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left text-[#B3B3B3] hover:bg-[#1a1a1a] hover:text-white border border-transparent transition-colors">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <span className="block">Contract Center</span>
                    {contractSummary && (
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                        contractSummary.status === 'signed' ? 'text-emerald-400' :
                        contractSummary.status === 'pending-counterparty' ? 'text-sky-300' : 'text-amber-300'
                      }`}>
                        {contractSummary.status === 'signed' ? 'Signed' :
                         contractSummary.status === 'pending-counterparty' ? 'Awaiting AMT' : 'Draft'}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </nav>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'payments' && <PaymentsTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'privacy' && <PrivacyTab />}
            {activeTab === 'integrations' && <IntegrationsTab />}
            {activeTab === 'billing' && <BillingTab />}
            {activeTab === 'support' && <SupportTab />}
          </main>
        </div>
      </div>
    </section>
  );
}