"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import Image from "next/image";
import {
  ArrowRight,
  Shield,
  Award,
  TrendingUp,
  Target,
  Users,
  DollarSign,
  Vote,
  CheckCircle,
  Wallet,
  Star,
  Coins,
} from "lucide-react";
import { Modal } from "./ui/Modal";

// Wallet information helper
const getWalletInfo = (walletName: string) => {
  const wallets: Record<string, { icon: JSX.Element; description: string }> = {
    MetaMask: {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <path d="M36.5 3.5L22 13.5L24.5 7.5L36.5 3.5Z" fill="#E17726" stroke="#E17726" />
          <path d="M3.5 3.5L17.8 13.6L15.5 7.5L3.5 3.5Z" fill="#E27625" stroke="#E27625" />
          <path d="M31 28.5L27.5 34.5L35.5 36.5L37.5 28.5H31Z" fill="#E27625" stroke="#E27625" />
          <path d="M2.5 28.5L4.5 36.5L12.5 34.5L9 28.5H2.5Z" fill="#E27625" stroke="#E27625" />
          <path d="M12 17.5L10 20.5L18 20.8L17.7 12.5L12 17.5Z" fill="#E27625" stroke="#E27625" />
          <path d="M28 17.5L22.2 12.4L22 20.8L30 20.5L28 17.5Z" fill="#E27625" stroke="#E27625" />
          <path d="M12.5 34.5L17 32.5L13.2 28.6L12.5 34.5Z" fill="#E27625" stroke="#E27625" />
          <path d="M23 32.5L27.5 34.5L26.8 28.6L23 32.5Z" fill="#E27625" stroke="#E27625" />
        </svg>
      ),
      description: "Connect using MetaMask browser extension",
    },
    "Coinbase Wallet": {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#0052FF" />
          <path
            d="M20 36C28.8366 36 36 28.8366 36 20C36 11.1634 28.8366 4 20 4C11.1634 4 4 11.1634 4 20C4 28.8366 11.1634 36 20 36Z"
            fill="#0052FF"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M11 20C11 15.0294 15.0294 11 20 11C24.9706 11 29 15.0294 29 20C29 24.9706 24.9706 29 20 29C15.0294 29 11 24.9706 11 20ZM17.5 17.5H22.5V22.5H17.5V17.5Z"
            fill="white"
          />
        </svg>
      ),
      description: "Connect using Coinbase Wallet app",
    },
    WalletConnect: {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#3B99FC" />
          <path
            d="M12.5 15.5C17 11 25 11 29.5 15.5L30 16L27.5 18.5L27 18C24 15 17 15 14 18L13.5 18.5L11 16L12.5 15.5Z"
            fill="white"
          />
          <path d="M24 21L26 23L20 29L14 23L16 21L20 25L24 21Z" fill="white" />
        </svg>
      ),
      description: "Scan QR code with mobile wallet app",
    },
  };

  return (
    wallets[walletName] || {
      icon: <Wallet className="w-6 h-6 text-violet-600" />,
      description: "Connect with your wallet",
    }
  );
};

export function ExpertHomepage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shouldAutoCheck, setShouldAutoCheck] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-check status after wallet connection (only if user initiated it)
  useEffect(() => {
    if (mounted && isConnected && address && shouldAutoCheck) {
      checkExpertStatus(address);
      setShouldAutoCheck(false); // Reset flag
    }
  }, [mounted, isConnected, address, shouldAutoCheck]);

  const expertFeatures = [
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Earn from Endorsements",
      description:
        "Stake tokens to endorse candidates and earn rewards when they get hired successfully",
    },
    {
      icon: <Vote className="w-6 h-6" />,
      title: "Review Proposals",
      description:
        "Participate in guild governance by reviewing candidate proposals and earning points",
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Build Reputation",
      description:
        "Gain reputation points through accurate assessments and successful endorsements",
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Stake & Earn",
      description:
        "Lock tokens to participate in reviews with aligned incentives and earn rewards",
    },
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Apply as Expert",
      desc: "Submit your proposal to join a guild based on your expertise",
      icon: <Users className="w-5 h-5" />,
    },
    {
      step: "2",
      title: "Get Approved",
      desc: "The founding team reviews and approves your expert application",
      icon: <CheckCircle className="w-5 h-5" />,
    },
    {
      step: "3",
      title: "Review & Endorse",
      desc: "Stake tokens to review proposals and endorse quality candidates",
      icon: <Shield className="w-5 h-5" />,
    },
    {
      step: "4",
      title: "Earn Rewards",
      desc: "Get rewarded for accurate assessments and successful endorsements",
      icon: <Coins className="w-5 h-5" />,
    },
  ];

  const checkExpertStatus = async (walletAddress: string) => {
    console.log("🔍 Checking expert status for:", walletAddress);
    try {
      const response = await fetch(`http://localhost:4000/api/experts/profile?wallet=${walletAddress}`);
      console.log("📡 API Response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("📦 API Response data:", result);

        if (result.success && result.data) {
          const expert = result.data;
          console.log("✅ Expert found, status:", expert.status);

          // Check status and redirect appropriately
          if (expert.status === "approved") {
            console.log("🚀 Redirecting to dashboard...");
            router.push("/expert/dashboard");
            return true;
          } else if (expert.status === "pending") {
            console.log("⏳ Redirecting to pending page...");
            router.push("/expert/application-pending");
            return true;
          }
        } else {
          console.log("⚠️ Response structure unexpected:", result);
        }
      } else if (response.status === 404) {
        console.log("❌ No profile found (404) - redirecting to apply");
        // No profile found - redirect to application
        router.push("/expert/apply");
        return false;
      }
    } catch (error) {
      console.error("❌ Error checking expert status:", error);
      // On error, redirect to apply page
      router.push("/expert/apply");
      return false;
    }

    console.log("⚠️ No redirect performed - falling through");
    return false;
  };

  const handleGetStarted = async () => {
    console.log("🎯 handleGetStarted called - isConnected:", isConnected, "address:", address);
    if (isConnected && address) {
      // User is connected, check their status and redirect immediately
      console.log("✅ User connected, checking status...");
      await checkExpertStatus(address);
    } else {
      // User not connected, show wallet modal
      // Set flag so we auto-check after they connect
      console.log("❌ User not connected, showing wallet modal");
      setShouldAutoCheck(true);
      setShowWalletModal(true);
    }
  };

  const handleWalletConnect = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      try {
        await connect({ connector });
        setShowWalletModal(false);
        // The useEffect will automatically check status once address is available
      } catch (error) {
        console.error("Failed to connect:", error);
        setShouldAutoCheck(false); // Reset flag on error
      }
    }
  };

  const handleDisconnect = () => {
    disconnect();
    // Stay on homepage after disconnect
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Navigation Header */}
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push("/")}>
              <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8" />
              <span className="text-xl font-bold text-slate-900">Vetted</span>
              <span className="text-sm font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded-md">
                Experts
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all"
              >
                For Companies
              </button>
              {mounted && isConnected && address ? (
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg border border-violet-200">
                    <span className="text-xs font-mono text-violet-700">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                  </div>
                  <button
                    onClick={handleGetStarted}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all border border-slate-200 rounded-lg hover:border-slate-300"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGetStarted}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm"
                >
                  <Wallet className="mr-2 w-4 h-4" />
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 bg-violet-50 rounded-full mb-6">
            <Star className="w-4 h-4 text-violet-600 mr-2" />
            <span className="text-sm font-medium text-violet-700">
              Join Expert Guild Reviewers
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Earn by Validating{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Top Talent
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            Join expert guilds to review candidates, stake on quality talent, and earn rewards for
            accurate assessments. Build your reputation in the decentralized hiring ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Wallet className="mr-2 w-5 h-5" />
              {mounted && isConnected ? "Get Started" : "Connect Wallet to Apply"}
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Why Become a Vetted Expert
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Leverage your expertise to earn rewards while building trust in the hiring ecosystem
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {expertFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-100 hover:border-violet-200"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center text-violet-600 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">
            How to Become an Expert
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            A simple process to start earning as a guild expert
          </p>
          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="text-center relative">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold mx-auto mb-4 shadow-lg">
                  <div className="flex flex-col items-center">
                    {item.icon}
                  </div>
                </div>
                <div className="absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-violet-300 to-transparent hidden md:block -z-10">
                  {index === 3 && <div className="hidden" />}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2 text-base">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Earning Potential Section */}
      <div className="bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              How Experts Earn
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Multiple reward streams for active guild members
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center text-violet-600 mb-5">
                <DollarSign className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Endorsement Rewards
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Earn a percentage of the candidate's first-year salary when your endorsed
                candidates get hired successfully.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center text-violet-600 mb-5">
                <Vote className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Proposal Participation
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Earn points (convertible to tokens) for reviewing candidate proposals and voting
                with the majority consensus.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center text-violet-600 mb-5">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Reputation Building
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Increase your reputation score to unlock higher staking limits, better rewards,
                and governance influence.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-xl text-violet-100 mb-8">
            Connect your wallet and apply to become an expert reviewer in your field
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-violet-600 bg-white rounded-xl hover:bg-violet-50 transition-all shadow-lg"
            >
              <Wallet className="mr-2 w-5 h-5" />
              {mounted && isConnected ? "Get Started" : "Connect Wallet"}
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Connection Modal */}
      <Modal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        title="Connect Your Wallet"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600 mb-4">
            Choose your preferred wallet to get started as an expert
          </p>
          {connectors.map((connector) => {
            const walletInfo = getWalletInfo(connector.name);
            return (
              <button
                key={connector.id}
                onClick={() => handleWalletConnect(connector.id)}
                className="w-full flex items-center gap-4 px-4 py-4 border-2 border-slate-200 rounded-xl hover:border-violet-500 hover:bg-gradient-to-r hover:from-violet-50 hover:to-indigo-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-white transition-colors">
                  {walletInfo.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-slate-900">{connector.name}</p>
                  <p className="text-xs text-slate-500">{walletInfo.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-violet-600 transition-colors" />
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8" />
                <span className="text-xl font-bold text-white">Vetted</span>
              </div>
              <p className="text-sm text-slate-400">
                Hiring built on trust, expertise, and accountability.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Experts</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={handleGetStarted} className="hover:text-white transition-colors">Apply as Expert</button></li>
                <li><button onClick={() => router.push("/expert/dashboard")} className="hover:text-white transition-colors">Expert Dashboard</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Companies</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => router.push("/")} className="hover:text-white transition-colors">Company Home</button></li>
                <li><button onClick={() => router.push("/auth/login")} className="hover:text-white transition-colors">Sign In</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="hover:text-white transition-colors">About</button></li>
                <li><button className="hover:text-white transition-colors">How It Works</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2025 Vetted. Building trust in hiring.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
