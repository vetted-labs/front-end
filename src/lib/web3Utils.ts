/**
 * Get network name from chain ID
 */
export function getNetworkName(chainId: number | undefined): string {
  if (!chainId) return 'Unknown';

  const networks: Record<number, string> = {
    1: 'Ethereum',
    11155111: 'Sepolia',
    137: 'Polygon',
    42161: 'Arbitrum',
    10: 'Optimism',
    8453: 'Base',
  };

  return networks[chainId] || `Chain ${chainId}`;
}

/**
 * Shorten wallet address to display format
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get wallet metadata (description only - components should handle icons)
 */
export function getWalletInfo(walletName: string): {
  name: string;
  description: string;
} {
  const wallets: Record<string, { name: string; description: string }> = {
    MetaMask: {
      name: 'MetaMask',
      description: 'Connect using MetaMask browser extension',
    },
    'Coinbase Wallet': {
      name: 'Coinbase Wallet',
      description: 'Connect using Coinbase Wallet app',
    },
    WalletConnect: {
      name: 'WalletConnect',
      description: 'Scan QR code with mobile wallet app',
    },
  };

  return (
    wallets[walletName] || {
      name: walletName,
      description: 'Connect with your wallet',
    }
  );
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(
  amount: string | number,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  const divisor = Math.pow(10, decimals);
  const result = value / divisor;
  return result.toFixed(displayDecimals);
}

/**
 * Convert currency code to symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    ETH: 'Ξ',
    BTC: '₿',
  };
  return symbols[currency] || currency;
}
