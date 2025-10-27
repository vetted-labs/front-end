// components/homepage.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { ArrowRight, Shield, Users, Zap } from "lucide-react";

export function HomePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Decentralized Trust",
      description:
        "Expert communities validate talent through stake-backed endorsements",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Guild-Based Review",
      description:
        "Domain-specific guilds evaluate candidates using structured rubrics",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "AI-Powered Insights",
      description:
        "Context-aware analysis assists human judgment, not replaces it",
    },
  ];

  const handleHiring = () => {
    router.push("/company");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg"></div>
              <span className="text-xl font-bold text-slate-900">Vetted</span>
            </div>
            {isConnected ? (
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <span className="text-slate-500">Connected:</span>
                  <span className="ml-2 font-mono text-slate-700">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowWalletModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Where Talent Meets{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Trust
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            Vetted is a decentralized protocol that transforms hiring into a
            collective intelligence process. Expert guilds validate talent
            through structured review, creating real accountability for human
            judgment.
          </p>
          <button
            onClick={handleHiring}
            className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Start Hiring
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center text-violet-600 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            How Vetted Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Post a Job",
                desc: "Define your role and requirements",
              },
              {
                step: "2",
                title: "Guild Review",
                desc: "Expert reviewers evaluate candidates",
              },
              {
                step: "3",
                title: "Stake & Endorse",
                desc: "Reviewers back their judgment with stake",
              },
              {
                step: "4",
                title: "Hire with Confidence",
                desc: "Get validated, trustworthy talent",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Connect Your Wallet
            </h2>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    connect({ connector });
                    setShowWalletModal(false);
                  }}
                  disabled={isPending}
                  className="w-full py-4 px-6 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 rounded-xl transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {connector.name === "MetaMask" && "🦊"}
                      {connector.name === "Coinbase Wallet" && "💙"}
                      {connector.name === "WalletConnect" && "🔗"}
                    </span>
                    <span className="font-medium text-slate-900">
                      {connector.name}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWalletModal(false)}
              className="w-full mt-4 py-3 text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
