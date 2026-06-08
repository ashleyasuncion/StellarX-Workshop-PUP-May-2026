import {
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Keypair,
  Horizon,
} from '@stellar/stellar-sdk';
import { server, NETWORK_PASSPHRASE, HORIZON_URL } from './stellar';

const horizon = new Horizon.Server(HORIZON_URL);

/**
 * Build a "sponsorship sandwich" transaction that creates a new account
 * with the sponsor covering the base reserve (~1 XLM).
 *
 * Flow:
 *   1. BeginSponsoringFutureReserves  (source: sponsor)
 *   2. CreateAccount                   (source: sponsor — account doesn't exist yet)
 *   3. EndSponsoringFutureReserves     (source: the new account)
 *
 * Because CreateAccount is the operation creating the sponsored account,
 * the new account does NOT need to sign — only the sponsor signs.
 */
export async function buildSponsoredCreateAccountXDR(
  sponsorKey: string,
  newUserKey: string,
  startingBalance = '0',
): Promise<string> {
  const sponsorAccount = await server.getAccount(sponsorKey);

  const tx = new TransactionBuilder(sponsorAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.beginSponsoringFutureReserves({
        sponsoredId: newUserKey,
      }),
    )
    .addOperation(
      Operation.createAccount({
        destination: newUserKey,
        startingBalance,
      }),
    )
    .addOperation(
      Operation.endSponsoringFutureReserves({
        source: newUserKey,
      }),
    )
    .setTimeout(60)
    .build();

  return tx.toXDR();
}

/**
 * Generate a new Stellar keypair (for the "self-service" account creation flow).
 * Returns the secret seed and the public key.
 */
export function generateKeypair(): { secretKey: string; publicKey: string } {
  const kp = Keypair.random();
  return {
    secretKey: kp.secret(),
    publicKey: kp.publicKey(),
  };
}

/**
 * Take an XDR that was signed by the sponsor (via Freighter) and add the
 * new user's signature on top. The new account must sign because
 * EndSponsoringFutureReserves has its public key as the operation source.
 *
 * CAP-33 exception: when CreateAccount is in the same transaction, the
 * sponsored account doesn't need to pre-sign — but EndSponsoringFutureReserves
 * still requires the sponsored account's signature to be present.
 */
export function addNewUserSignature(
  sponsorSignedXdr: string,
  newUserSecret: string,
): string {
  const tx = TransactionBuilder.fromXDR(sponsorSignedXdr, NETWORK_PASSPHRASE);
  const kp = Keypair.fromSecret(newUserSecret);
  tx.sign(kp);
  return tx.toXDR();
}

/**
 * Check how many accounts a sponsor is sponsoring.
 * Uses Horizon to load the account and check `num_sponsoring` (the count of
 * entries this account is paying the reserve for — NOT `num_sponsored` which
 * counts entries where this account is the beneficiary).
 */
export async function getSponsorInfo(
  sponsorKey: string,
): Promise<{ numSponsoring: number; balance: string; funded: boolean }> {
  try {
    const account = await horizon.loadAccount(sponsorKey);
    return {
      numSponsoring: account.num_sponsoring,
      balance: account.balances.find((b: { asset_type: string }) => b.asset_type === 'native')?.balance ?? '0',
      funded: true,
    };
  } catch {
    return { numSponsoring: 0, balance: '0', funded: false };
  }
}

/**
 * Same as getSponsorInfo but retries up to `maxRetries` times with a 1s delay
 * between attempts. This accounts for Horizon's eventual-consistency lag after
 * a successful sponsorship transaction.
 */
export async function getSponsorInfoWithRetry(
  sponsorKey: string,
  previousCount: number,
  maxRetries = 5,
): Promise<{ numSponsoring: number; balance: string; funded: boolean }> {
  for (let i = 0; i < maxRetries; i++) {
    const info = await getSponsorInfo(sponsorKey);
    if (info.numSponsoring > previousCount) {
      return info;
    }
    // Wait 1s before retrying
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Final attempt after exhausting retries
  return getSponsorInfo(sponsorKey);
}

/**
 * Fetch a list of accounts sponsored by the given sponsor.
 * Uses Horizon's sponsored accounts endpoint.
 */
export async function getSponsoredAccounts(
  sponsorKey: string,
): Promise<{ id: string; balance: string }[]> {
  try {
    const resp = await horizon
      .accounts()
      .sponsor(sponsorKey)
      .call();
    return resp.records.map((r: { id: string; balances: { asset_type: string; balance: string }[] }) => ({
      id: r.id,
      balance:
        r.balances.find((b) => b.asset_type === 'native')?.balance ?? '0',
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch sponsored accounts with retry — same pattern as getSponsorInfoWithRetry.
 */
export async function getSponsoredAccountsWithRetry(
  sponsorKey: string,
  previousCount: number,
  maxRetries = 5,
): Promise<{ id: string; balance: string }[]> {
  for (let i = 0; i < maxRetries; i++) {
    const accounts = await getSponsoredAccounts(sponsorKey);
    if (accounts.length > previousCount) {
      return accounts;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return getSponsoredAccounts(sponsorKey);
}
