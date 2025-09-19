"use client";

import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";

export function WalletConnection() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const { data: balance } = useBalance({
    address: address,
  });

  if (isConnected) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Wallet Connected
        </h2>

        <div className="space-y-3 text-sm mb-4">
          <div className="p-3 bg-gray-50 rounded">
            <p className="font-semibold text-gray-700">Address:</p>
            <p className="font-mono text-gray-900 break-all">{address}</p>
          </div>

          <div className="p-3 bg-gray-50 rounded">
            <p className="font-semibold text-gray-700">Network:</p>
            <p className="text-gray-900">
              {chain?.name} (ID: {chain?.id})
            </p>
          </div>

          {balance && (
            <div className="p-3 bg-gray-50 rounded">
              <p className="font-semibold text-gray-700">Balance:</p>
              <p className="text-gray-900">
                {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => disconnect()}
          className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Connect Your Wallet
      </h2>

      <div className="space-y-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? (
              <span>Connecting...</span>
            ) : (
              <>
                {connector.name === "MetaMask" && "🦊"}
                {connector.name === "Coinbase Wallet" && "💙"}
                {connector.name === "WalletConnect" && "🔗"}
                {connector.name}
              </>
            )}
          </button>
        ))}
      </div>

      {!connectors.length && (
        <p className="text-gray-500 text-center">
          No wallet connectors available
        </p>
      )}
    </div>
  );
}
