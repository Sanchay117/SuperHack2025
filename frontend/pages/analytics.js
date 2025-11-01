import { useState, useEffect } from "react";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AuthLayout } from "../components/AuthLayout";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { format, subDays } from "date-fns";
import { BarChart3 } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function AnalyticsPage() {
    const { hasRole } = useAuth();
    const [dateRange, setDateRange] = useState({
        from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
        to: format(new Date(), "yyyy-MM-dd"),
    });

    // Static demo datasets (intentionally mocked for demo visuals)
    const ticketData = [
        { date: "Jan 1", created: 12, resolved: 8 },
        { date: "Jan 2", created: 15, resolved: 12 },
        { date: "Jan 3", created: 8, resolved: 10 },
        { date: "Jan 4", created: 20, resolved: 15 },
        { date: "Jan 5", created: 10, resolved: 14 },
    ];

    const alertData = [
        { severity: "Critical", count: 45, automated: 20 },
        { severity: "High", count: 120, automated: 85 },
        { severity: "Medium", count: 280, automated: 200 },
        { severity: "Low", count: 450, automated: 380 },
    ];

    const automationData = [
        { name: "Automated", value: 75, count: 685 },
        { name: "Manual", value: 25, count: 210 },
    ];

    if (!hasRole("technician")) {
        return (
            <ProtectedRoute requiredRole="technician">
                <AuthLayout>
                    <div className="text-center py-8">
                        <p className="text-gray-600">
                            You don't have permission to view this page.
                        </p>
                    </div>
                </AuthLayout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <AuthLayout>
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">
                            Analytics
                        </h1>
                        <div className="flex items-center space-x-4">
                            <input
                                type="date"
                                value={dateRange.from}
                                onChange={(e) =>
                                    setDateRange({
                                        ...dateRange,
                                        from: e.target.value,
                                    })
                                }
                                className="input"
                            />
                            <span>to</span>
                            <input
                                type="date"
                                value={dateRange.to}
                                onChange={(e) =>
                                    setDateRange({
                                        ...dateRange,
                                        to: e.target.value,
                                    })
                                }
                                className="input"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Key Metrics */}
                        <div className="card">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Summary Metrics
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Total Alerts Handled
                                    </span>
                                    <span className="font-bold text-2xl">
                                        895
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Automation Rate
                                    </span>
                                    <span className="font-bold text-2xl text-green-600">
                                        76%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Avg Resolution Time
                                    </span>
                                    <span className="font-bold text-2xl">
                                        2.3h
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Cost Saved
                                    </span>
                                    <span className="font-bold text-2xl text-blue-600">
                                        $45,200
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Alerts by Severity */}
                        <div className="card">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Alerts by Severity
                            </h2>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={alertData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="severity" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" fill="#8884d8" />
                                    <Bar dataKey="automated" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Tickets Over Time */}
                        <div className="card">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Tickets Over Time
                            </h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={ticketData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="created"
                                        stroke="#8884d8"
                                        name="Created"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="resolved"
                                        stroke="#82ca9d"
                                        name="Resolved"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Automation Distribution */}
                        <div className="card">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Automation Coverage
                            </h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={automationData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) =>
                                            `${name} ${(percent * 100).toFixed(
                                                0
                                            )}%`
                                        }
                                    >
                                        {automationData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    COLORS[
                                                        index % COLORS.length
                                                    ]
                                                }
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </AuthLayout>
        </ProtectedRoute>
    );
}
