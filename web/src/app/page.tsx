'use client';
import { useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import SponsorDashboard from '@/components/SponsorDashboard';
import NewAccountGenerator from '@/components/NewAccountGenerator';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'user' | 'sponsor'>('user');
  // Keep state here so it persists across tab switches
  const wallet = useWallet();
  const [keypair, setKeypair] = useState<{
    secretKey: string;
    publicKey: string;
  } | null>(null);
  const [createdAccounts, setCreatedAccounts] = useState<Set<string>>(new Set());

  const onAccountCreated = useCallback((pubkey: string) => {
    setCreatedAccounts((prev) => {
      const next = new Set(prev);
      next.add(pubkey);
      return next;
    });
  }, []);

  const accountCreated = keypair ? createdAccounts.has(keypair.publicKey) : false;

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="mx-auto max-w-lg px-4 py-12">
        {/* Brand header */}
        <header className="mb-8 text-center">
          <div className="mb-2 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
            Sponsored Reserve Onboarding Kit
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Zero<span className="text-indigo-600">XLM</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Join Stellar with zero XLM — your reserve is sponsored
          </p>
        </header>

        {/* Mode switcher */}
        <div className="mb-6 flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('user')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'user'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👤 New User
          </button>
          <button
            onClick={() => setActiveTab('sponsor')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'sponsor'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏢 Sponsor
          </button>
        </div>

        {/* Content */}
        {activeTab === 'user' ? (
          <NewAccountGenerator
            keypair={keypair}
            onKeypairChange={setKeypair}
            accountCreated={accountCreated}
          />
        ) : (
          <SponsorDashboard
            wallet={wallet}
            keypair={keypair}
            onAccountCreated={onAccountCreated}
          />
        )}

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-gray-400">
          Built on Stellar testnet · StellarX PH workshop @ PUP QC
        </footer>
      </div>
    </main>
  );
}
