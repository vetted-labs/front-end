// e2e/real-flow/bootstrap/keys.ts
//
// Derives deterministic expert keypairs from a fixed mnemonic that is
// intentionally different from Anvil's default ("test test … junk") so
// generated addresses never collide with the 10 built-in Anvil accounts.
//
// Mnemonic used:
//   "abandon abandon abandon abandon abandon abandon abandon abandon abandon
//    abandon abandon about"
// (BIP-39 standard test vector — well-known, valid, distinct from Anvil)
import { mnemonicToAccount } from "viem/accounts";
import { toHex, type Address, type Hex } from "viem";

// BIP-39 standard test vector — distinct from Anvil's mnemonic so indices
// 0-N never overlap with the 10 built-in deployer/funder accounts.
const E2E_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

export type ExpertKey = { index: number; address: Address; privateKey: Hex };

/**
 * Derives `count` deterministic expert keypairs (indices 0 to count-1).
 * Identical inputs always produce identical outputs across runs and processes.
 */
export function deriveExpertKeys(count: number): ExpertKey[] {
  const keys: ExpertKey[] = [];
  for (let i = 0; i < count; i++) {
    const account = mnemonicToAccount(E2E_MNEMONIC, { addressIndex: i });
    const hdKey = account.getHdKey();
    if (!hdKey.privateKey) {
      throw new Error(`deriveExpertKeys: no private key for index ${i}`);
    }
    keys.push({
      index: i,
      address: account.address,
      privateKey: toHex(hdKey.privateKey),
    });
  }
  return keys;
}
