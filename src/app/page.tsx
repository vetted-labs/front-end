import { WalletConnection } from "../components/WalletConnection";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Crypto App</h1>
          <p className="text-gray-600">Connect your wallet to get started</p>
        </div>

        <WalletConnection />

        {/* Add your crypto app features here */}
        <div className="mt-12 text-center">
          <p className="text-gray-500">
            Ready to build your crypto features! 🚀
          </p>
        </div>
      </div>
    </main>
  );
}
