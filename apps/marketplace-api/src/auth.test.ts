import assert from 'node:assert/strict';
import test from 'node:test';
import { privateKeyToAccount } from 'viem/accounts';
import { createAuthChallenge, verifyAuthChallenge, walletForToken } from './auth';
import { openDatabase } from './db';

test('wallet auth verifies a signed challenge and creates a session', async () => {
  const db = openDatabase(':memory:');
  const account = privateKeyToAccount(
    '0x0000000000000000000000000000000000000000000000000000000000000001',
  );
  const challenge = createAuthChallenge(db, account.address, 'BASE');
  const signature = await account.signMessage({ message: challenge.message });

  const session = await verifyAuthChallenge(db, {
    challengeId: challenge.id,
    walletAddress: account.address,
    signature,
    displayName: 'Test Agent',
  });

  assert.equal(walletForToken(db, session.token), account.address.toLowerCase());
});

test('wallet auth rejects nonce reuse', async () => {
  const db = openDatabase(':memory:');
  const account = privateKeyToAccount(
    '0x0000000000000000000000000000000000000000000000000000000000000002',
  );
  const challenge = createAuthChallenge(db, account.address, 'BASE');
  const signature = await account.signMessage({ message: challenge.message });

  await verifyAuthChallenge(db, {
    challengeId: challenge.id,
    walletAddress: account.address,
    signature,
  });

  await assert.rejects(
    () =>
      verifyAuthChallenge(db, {
        challengeId: challenge.id,
        walletAddress: account.address,
        signature,
      }),
    /already used/,
  );
});

