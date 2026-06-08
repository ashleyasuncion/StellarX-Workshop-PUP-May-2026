'use client';
import { useState } from 'react';
import { generateKeypair } from '@/lib/sponsorship';

export default function NewAccountGenerator({
  keypair,
  onKeypairChange,
  accountCreated,
}: {
  keypair: { secretKey: string; publicKey: string } | null;
  onKeypairChange: (kp: { secretKey: string; publicKey: string } | null) => void;
  accountCreated: boolean;
}) {
  const [copied, setCopied] = useState<'public' | 'secret' | null>(null);

  const handleGenerate = () => {
    const kp = generateKeypair();
    onKeypairChange(kp);
  };

  const copyToClipboard = async (text: string, type: 'public' | 'secret') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        Create Your Free Account
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        No XLM needed! Generate a Stellar keypair, then have a sponsor create
        your account with the base reserve covered.
      </p>

      {!keypair ? (
        <button
          onClick={handleGenerate}
          className="w-full rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white transition-all hover:bg-emerald-700"
        >
          Generate New Stellar Account
        </button>
      ) : (
        <div className="space-y-4">
          {/* Public key */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Public Key (give this to a sponsor)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={keypair.publicKey}
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-900"
              />
              <button
                onClick={() =>
                  copyToClipboard(keypair.publicKey, 'public')
                }
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                {copied === 'public' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Secret key */}
          <div>
            <label className="mb-1 block text-xs font-medium text-amber-700">
              Secret Key ⚠️ — save this, it&apos;s shown only once!
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={keypair.secretKey}
                className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-xs text-gray-900"
              />
              <button
                onClick={() =>
                  copyToClipboard(keypair.secretKey, 'secret')
                }
                className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 transition-colors hover:bg-amber-100"
              >
                {copied === 'secret' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {accountCreated ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-lg">🎉</p>
              <p className="mt-1 font-semibold text-emerald-700">
                Your account has been created!
              </p>
              <p className="mt-1 text-sm text-emerald-600">
                Your account is now active on the Stellar testnet with
                a sponsored reserve — zero XLM spent.
              </p>
              <p className="mt-2 text-xs text-emerald-500">
                Use your secret key to import this account into Freighter or
                any Stellar wallet.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
              <p className="text-sm text-indigo-700">
                <span className="font-medium">Next step:</span> Give your
                public key to a sponsor. They&apos;ll create your account with
                the base reserve covered.
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            Generate another keypair
          </button>
        </div>
      )}
    </div>
  );
}
