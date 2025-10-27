// components/homepage.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Shield,
  Users,
  Zap,
  Briefcase,
  CheckCircle,
  TrendingUp,
  Target,
  Search,
  FileCheck,
  Award,
  Clock,
} from "lucide-react";

export function HomePage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<"employers" | "jobseekers">("employers");

  const employerFeatures = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Verified Talent Pool",
      description:
        "Access candidates validated by expert guilds with stake-backed endorsements",
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Reduced Hiring Risk",
      description:
        "Expert reviewers stake their reputation on every candidate they endorse",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Faster Time-to-Hire",
      description:
        "Pre-screened candidates mean less time reviewing unqualified applications",
    },
    {
      icon: <FileCheck className="w-6 h-6" />,
      title: "Structured Evaluation",
      description:
        "Domain-specific rubrics ensure consistent, objective candidate assessment",
    },
  ];

  const jobSeekerFeatures = [
    {
      icon: <Award className="w-6 h-6" />,
      title: "Stand Out",
      description:
        "Get endorsed by industry experts and build a verified reputation",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Fair Evaluation",
      description:
        "Be judged on skills and merit through structured, objective reviews",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Career Growth",
      description:
        "Receive detailed feedback and build a track record of guild validations",
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Quality Opportunities",
      description:
        "Access vetted companies serious about finding the right talent",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Navigation Header */}
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push("/")}>
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg"></div>
              <span className="text-xl font-bold text-slate-900">Vetted</span>
            </div>

            {/* Navigation Tabs */}
            <div className="hidden md:flex items-center space-x-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setActiveSection("employers")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeSection === "employers"
                    ? "bg-white text-violet-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                For Employers
              </button>
              <button
                onClick={() => setActiveSection("jobseekers")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeSection === "jobseekers"
                    ? "bg-white text-violet-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                For Job Seekers
              </button>
            </div>

            {/* Action Button */}
            <div className="flex items-center">
              <button
                onClick={() => router.push("/auth/login")}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Hiring Built on{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Trust & Expertise
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            Vetted transforms hiring through expert guild validation. Get candidates verified by
            industry professionals who stake their reputation on every endorsement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/auth/login")}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Sign In
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            {activeSection === "jobseekers" && (
              <button
                onClick={() => router.push("/browse/jobs")}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-slate-700 bg-white border-2 border-slate-300 rounded-xl hover:border-violet-600 hover:text-violet-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Search className="mr-2 w-5 h-5" />
                Browse Jobs
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Features Section - Dynamic based on active tab */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            {activeSection === "employers" ? "Why Employers Choose Vetted" : "Why Job Seekers Choose Vetted"}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {activeSection === "employers"
              ? "Hire with confidence using our expert-validated talent pool"
              : "Stand out with expert endorsements and build your verified reputation"}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(activeSection === "employers" ? employerFeatures : jobSeekerFeatures).map((feature, index) => (
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
            How Vetted Works
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            {activeSection === "employers"
              ? "A simple process that connects you with pre-validated talent"
              : "Get endorsed by experts and access quality job opportunities"}
          </p>
          <div className="grid md:grid-cols-4 gap-8">
            {(activeSection === "employers" ?
              [
                {
                  step: "1",
                  title: "Post Your Role",
                  desc: "Define requirements and select the relevant expert guild",
                  icon: <Briefcase className="w-5 h-5" />,
                },
                {
                  step: "2",
                  title: "Applications Flow In",
                  desc: "Candidates apply and submit to guild review",
                  icon: <Users className="w-5 h-5" />,
                },
                {
                  step: "3",
                  title: "Guild Validation",
                  desc: "Expert reviewers evaluate candidates with stake-backed endorsements",
                  icon: <Shield className="w-5 h-5" />,
                },
                {
                  step: "4",
                  title: "Hire Top Talent",
                  desc: "Review validated candidates and make confident hiring decisions",
                  icon: <CheckCircle className="w-5 h-5" />,
                },
              ]
            :
              [
                {
                  step: "1",
                  title: "Create Profile",
                  desc: "Build your profile and upload your resume",
                  icon: <Users className="w-5 h-5" />,
                },
                {
                  step: "2",
                  title: "Apply to Jobs",
                  desc: "Browse vetted companies and apply to roles that match your skills",
                  icon: <Search className="w-5 h-5" />,
                },
                {
                  step: "3",
                  title: "Guild Review",
                  desc: "Expert reviewers evaluate your application and provide endorsements",
                  icon: <Award className="w-5 h-5" />,
                },
                {
                  step: "4",
                  title: "Get Hired",
                  desc: "Stand out with verified credentials and land your next role",
                  icon: <CheckCircle className="w-5 h-5" />,
                },
              ]
            ).map((item, index) => (
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

      {/* Core Platform Features */}
      <div className="bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              The Vetted Difference
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Built on trust, expertise, and accountability
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center text-violet-600 mb-5">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Guild-Based Validation
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Expert communities evaluate talent using domain-specific rubrics.
                Reviewers stake their reputation on every endorsement they make.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center text-violet-600 mb-5">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                AI-Enhanced Review
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Context-aware AI assists human judgment by analyzing portfolios,
                code samples, and work history—but experts always make the final call.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center text-violet-600 mb-5">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Reputation System
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Build a verified track record over time. Both candidates and reviewers
                accumulate credibility through successful placements and accurate assessments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {activeSection === "employers"
              ? "Ready to hire validated talent?"
              : "Ready to get verified and stand out?"}
          </h2>
          <p className="text-xl text-violet-100 mb-8">
            {activeSection === "employers"
              ? "Join companies that trust expert validation over traditional screening"
              : "Join professionals building verified reputations through guild endorsements"}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/auth/login")}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-violet-600 bg-white rounded-xl hover:bg-violet-50 transition-all shadow-lg"
            >
              {activeSection === "employers" ? "Start Hiring Today" : "Join Vetted Today"}
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg"></div>
                <span className="text-xl font-bold text-white">Vetted</span>
              </div>
              <p className="text-sm text-slate-400">
                Hiring built on trust, expertise, and accountability.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Employers</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => router.push("/auth/login")} className="hover:text-white transition-colors">Sign In</button></li>
                <li><button onClick={() => router.push("/dashboard")} className="hover:text-white transition-colors">Dashboard</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Job Seekers</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => router.push("/browse/jobs")} className="hover:text-white transition-colors">Browse Jobs</button></li>
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
