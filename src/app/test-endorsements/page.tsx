"use client";

import { useAccount } from "wagmi";
import { useMyActiveEndorsements } from "@/lib/hooks/useVettedContracts";

export default function TestEndorsementsPage() {
  const { address, isConnected } = useAccount();
  const { endorsements, isLoading, error } = useMyActiveEndorsements();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Endorsements Debug Page</h1>

      <div className="space-y-6 max-w-4xl">
        {/* Connection Status */}
        <div className="border border-green-500 p-4 rounded">
          <h2 className="text-xl font-bold mb-2">1. Wallet Connection</h2>
          <p>Connected: {isConnected ? '✅ Yes' : '❌ No'}</p>
          <p>Address: {address || 'Not connected'}</p>
        </div>

        {/* Hook Status */}
        <div className="border border-blue-500 p-4 rounded">
          <h2 className="text-xl font-bold mb-2">2. Hook Status</h2>
          <p>Loading: {isLoading ? '⏳ Yes' : '✅ No'}</p>
          <p>Error: {error || '✅ None'}</p>
          <p>Endorsements Count: {endorsements.length}</p>
        </div>

        {/* API URL */}
        <div className="border border-purple-500 p-4 rounded">
          <h2 className="text-xl font-bold mb-2">3. API Configuration</h2>
          <p>API URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}</p>
          <p>Full Endpoint: {`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/blockchain/endorsements/expert/${address || 'YOUR_ADDRESS'}`}</p>
        </div>

        {/* Raw Data */}
        <div className="border border-orange-500 p-4 rounded">
          <h2 className="text-xl font-bold mb-2">4. Raw Data</h2>
          <pre className="text-xs bg-gray-900 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify({
              isConnected,
              address,
              isLoading,
              error,
              endorsementsCount: endorsements.length,
              firstEndorsement: endorsements[0] || null
            }, null, 2)}
          </pre>
        </div>

        {/* Endorsements List */}
        {endorsements.length > 0 && (
          <div className="border border-green-500 p-4 rounded">
            <h2 className="text-xl font-bold mb-4">5. Endorsements Preview</h2>
            <div className="space-y-2">
              {endorsements.map((e: any, idx: number) => (
                <div key={idx} className="bg-gray-900 p-3 rounded">
                  <p className="font-bold">{idx + 1}. {e.job?.title || 'No title'}</p>
                  <p className="text-sm text-gray-400">Candidate: {e.candidate?.name || 'No name'}</p>
                  <p className="text-sm text-gray-400">Stake: {e.stakeAmount || '0'} VTD</p>
                  <p className="text-sm text-gray-400">Status: {e.status || 'unknown'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Button */}
        <div className="border border-yellow-500 p-4 rounded">
          <h2 className="text-xl font-bold mb-2">6. Manual Test</h2>
          <button
            onClick={async () => {
              if (!address) {
                alert('Connect wallet first!');
                return;
              }

              try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                const url = `${apiUrl}/api/blockchain/endorsements/expert/${address}?status=active&limit=50`;
                console.log('Fetching from:', url);

                const response = await fetch(url);
                const data = await response.json();

                console.log('Response:', data);
                alert(`Success! Found ${data.data?.length || 0} endorsements. Check console for details.`);
              } catch (err: any) {
                console.error('Error:', err);
                alert(`Error: ${err.message}`);
              }
            }}
            className="bg-yellow-500 text-black px-4 py-2 rounded font-bold hover:bg-yellow-400"
          >
            Test API Call Manually
          </button>
        </div>
      </div>
    </div>
  );
}
