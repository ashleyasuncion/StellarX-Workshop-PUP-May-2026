'use client';
import { useState, useEffect, useCallback } from 'react';
import type { WalletState } from '@/hooks/useWallet';
import {
  buildSponsoredCreateAccountXDR,
  addNewUserSignature,
  getSponsorInfo,
  getSponsorInfoWithRetry,
  getSponsoredAccounts,
  getSponsoredAccountsWithRetry,
} from '@/lib/sponsorship';
import { submitSignedXDR, pollTransaction } from '@/lib/payment';
import { fundTestnetAccount, NETWORK_PASSPHRASE } from '@/lib/stellar';
import ConnectWallet from '@/components/ConnectWallet';
import BalanceCard from '@/components/BalanceCard';

type Status = 'idle' | 'building' | 'signing' | 'submitting' | 'polling' | 'success' | 'error';

export default function SponsorDashboard({
  wallet,
  keypair,
  onAccountCreated,
}: {
  wallet: WalletState;
  keypair: { secretKey: string; publicKey: string } | null;
  onAccountCreated: (publicKey: string) => void;
}) {
  const { publicKey, connecting } = wallet;
  const [newUserKey, setNewUserKey] = useState('');
  const [sponsorInfo, setSponsorInfo] = useState<{
    numSponsoring: number;
    balance: string;
    funded: boolean;
  } | null>(null);
  const [sponsoredAccounts, setSponsoredAccounts] = useState<
    { id: string; balance: string }[]
  >([]);
  const [status, setStatus] = useState<Status>('idle');
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fundError, setFundError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Load sponsor info and sponsored accounts when wallet connects or refresh toggles
  useEffect(() => {
    if (!publicKey) return;
    getSponsorInfo(publicKey).then(setSponsorInfo);
    getSponsoredAccounts(publicKey).then(setSponsoredAccounts);
  }, [publicKey, refreshKey]);

  // After a successful sponsorship, retry until Horizon catches up
  // Use sponsoredAccounts.length for the count (num_sponsoring counts ALL
  // sponsored ledger entries — accounts, trustlines, signers — not just accounts).
  const refreshWithRetry = useCallback(async () => {
    if (!publicKey) return;
    const prevCount = sponsoredAccounts.length;
    const [info, accounts] = await Promise.all([
      getSponsorInfoWithRetry(publicKey, prevCount),
      getSponsoredAccountsWithRetry(publicKey, prevCount),
    ]);
    setSponsorInfo(info);
    setSponsoredAccounts(accounts);
  }, [publicKey, sponsoredAccounts.length]);

  const handleCreateSponsoredAccount = async () => {
    if (!publicKey) return;
    setStatus('building');
    setErrorMsg('');
    setTxHash('');

    try {
      setStatus('building');
      const xdr = await buildSponsoredCreateAccountXDR(
        publicKey,
        newUserKey.trim(),
      );

      setStatus('signing');
      const freighter = await import('@stellar/freighter-api');
      const signed = await freighter.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: publicKey,
      });
      if (signed.error) {
        throw new Error(
          typeof signed.error === 'string'
            ? signed.error
            : 'Signing was rejected',
        );
      }

      // Add the new user's signature if we have their keypair
      // (EndSponsoringFutureReserves requires the new account to sign)
      const trimmedKey = newUserKey.trim();
      if (!keypair || trimmedKey !== keypair.publicKey) {
        throw new Error(
          'The public key you entered does not match the one generated in ' +
            'the New User tab. Generate a keypair there and paste that exact ' +
            'public key here — the new account must co-sign the sponsorship ' +
            'transaction.',
        );
      }

      const signedXdr = addNewUserSignature(signed.signedTxXdr, keypair.secretKey);

      setStatus('submitting');
      const hash = await submitSignedXDR(signedXdr);
      setTxHash(hash);

      setStatus('polling');
      await pollTransaction(hash);

      setStatus('success');
      setNewUserKey('');
      onAccountCreated(trimmedKey);
      refreshWithRetry();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Sponsorship failed');
      setStatus('error');
    }
  };

  const busy = ['building', 'signing', 'submitting', 'polling'].includes(status);

  if (!publicKey && !connecting) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          Sponsor Dashboard
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Connect your Freighter wallet as a sponsor to start onboarding users
          with zero XLM.
        </p>
        <ConnectWallet {...wallet} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sponsor header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Sponsor Dashboard
          </h2>
          <p className="text-sm text-gray-500">
            Pay the base reserve so new users can join with zero XLM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConnectWallet {...wallet} />
        </div>
      </div>

      {/* Fund + Balance */}
      <div className="mb-2">
        <button
          onClick={async () => {
            if (!publicKey) return;
            setFundError('');
            try {
              await fundTestnetAccount(publicKey);
              refresh();
            } catch {
              setFundError('Friendbot funding failed. Your account may already be funded.');
            }
          }}
          className="mb-3 rounded bg-amber-400 px-3 py-1.5 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-500"
        >
          Fund sponsor with Friendbot (testnet)
        </button>
        {fundError && <p className="mb-2 text-sm text-red-500">{fundError}</p>}
        {publicKey && <BalanceCard publicKey={publicKey} refreshKey={refreshKey} />}
      </div>

      {/* Sponsor stats — use sponsoredAccounts.length for accuracy */}
      {sponsoredAccounts.length > 0 && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-sm text-indigo-700">
            <span className="font-semibold">{sponsoredAccounts.length}</span>{' '}
            account{sponsoredAccounts.length !== 1 ? 's' : ''} sponsored
          </p>
        </div>
      )}

      {/* Create sponsored account form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 font-medium text-gray-900">
          Create Sponsored Account
        </h3>
        <p className="mb-4 text-xs text-gray-500">
          Enter a new user&apos;s Stellar public key to create their account with
          the reserve sponsored by you.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="G… (new user's public key)"
            value={newUserKey}
            onChange={(e) => setNewUserKey(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleCreateSponsoredAccount}
            disabled={busy || !newUserKey.trim()}
            className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
          >
            {status === 'idle' && 'Create'}
            {status === 'building' && 'Building…'}
            {status === 'signing' && 'Signing…'}
            {status === 'submitting' && 'Submitting…'}
            {status === 'polling' && 'Confirming…'}
            {status === 'success' && 'Create'}
            {status === 'error' && 'Retry'}
          </button>
        </div>

        {/* Status messages */}
        {status === 'success' && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="font-medium text-emerald-700">
              Account created with sponsored reserve!
            </p>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm text-indigo-600 hover:underline"
            >
              View on Stellar Expert →
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Sponsored accounts list */}
      {sponsoredAccounts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 font-medium text-gray-900">
            Sponsored Accounts
          </h3>
          <div className="space-y-2">
            {sponsoredAccounts.slice(0, 20).map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <span className="font-mono text-xs text-gray-700">
                  {acc.id.slice(0, 8)}…{acc.id.slice(-8)}
                </span>
                <span className="text-xs text-gray-500">
                  {parseFloat(acc.balance).toFixed(2)} XLM
                </span>
              </div>
            ))}
          </div>
          {sponsoredAccounts.length > 20 && (
            <p className="mt-2 text-xs text-gray-400">
              +{sponsoredAccounts.length - 20} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}
