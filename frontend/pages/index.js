import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import { Shield, Zap, BarChart3, ArrowRight } from "lucide-react";

export default function LandingPage() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push("/dashboard");
        }
    }, [user, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-[#0b3a60]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <header className="py-6">
                    <nav className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-white">
                            The Ninjas
                        </h1>
                        <div className="space-x-4">
                            <Link
                                href="/login"
                                className="text-white hover:text-gray-200"
                            >
                                Log In
                            </Link>
                            <Link
                                href="/register"
                                className="px-4 py-2 bg-white text-primary-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                            >
                                Get Started
                            </Link>
                        </div>
                    </nav>
                </header>

                {/* Hero Section */}
                <div className="py-20 text-center">
                    <h2 className="text-5xl font-bold text-white mb-6">
                        Agentic AI Co-Pilot for IT Operations
                    </h2>
                    <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
                        Automatically detect system issues, create actionable
                        tickets, and execute fixes — so your team focuses on
                        judgment, not routine firefighting.
                    </p>
                    <div className="space-x-4">
                        <Link
                            href="/register"
                            className="inline-flex items-center px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                        >
                            Start Free Trial
                            <ArrowRight className="ml-2" size={20} />
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex items-center px-6 py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 py-16">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                        <Shield className="text-white mb-4" size={40} />
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Smart Alert Detection
                        </h3>
                        <p className="text-primary-100">
                            Automatically prioritize alerts from multiple
                            monitoring systems and eliminate alert fatigue.
                        </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                        <Zap className="text-white mb-4" size={40} />
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Autonomous Actions
                        </h3>
                        <p className="text-primary-100">
                            AI agents execute diagnostics, patches, and fixes
                            with human oversight and approval.
                        </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                        <BarChart3 className="text-white mb-4" size={40} />
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Analytics & Insights
                        </h3>
                        <p className="text-primary-100">
                            Track automation ROI, resolution times, and system
                            health metrics.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
