import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { AuthLayout } from "../../components/AuthLayout";
import { alertsAPI } from "../../lib/api";
import { toast } from "react-hot-toast";

export default function AlertDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const [alertItem, setAlertItem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        // There is no GET /api/alerts/:id, so fetch list and filter
        alertsAPI
            .getAll()
            .then((r) => {
                const found = (r.data || []).find(
                    (a) => String(a.id) === String(id)
                );
                if (!found) {
                    toast.error("Alert not found");
                    router.push("/alerts");
                } else {
                    setAlertItem(found);
                }
            })
            .catch(() => toast.error("Failed to load alert"))
            .finally(() => setLoading(false));
    }, [id, router]);

    async function toggleHandled() {
        if (!alertItem) return;
        try {
            const res = await fetch(`/api/alerts/${alertItem.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ handled: !alertItem.handled }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "update failed");
            setAlertItem(data);
            toast.success("Alert updated");
        } catch (e) {
            toast.error("Failed to update alert");
        }
    }

    if (loading) {
        return (
            <ProtectedRoute>
                <AuthLayout>
                    <div>Loading...</div>
                </AuthLayout>
            </ProtectedRoute>
        );
    }

    if (!alertItem) return null;

    return (
        <ProtectedRoute>
            <AuthLayout>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">
                            Alert #{alertItem.id}
                        </h1>
                        <button
                            onClick={toggleHandled}
                            className="btn btn-primary"
                        >
                            {alertItem.handled
                                ? "Mark Unhandled"
                                : "Mark Handled"}
                        </button>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="card">
                                <h2 className="text-lg font-semibold mb-2">
                                    Summary
                                </h2>
                                <p className="text-gray-800">
                                    {alertItem.summary || "(no summary)"}
                                </p>
                            </div>

                            <div className="card">
                                <h2 className="text-lg font-semibold mb-2">
                                    Details (JSON)
                                </h2>
                                <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto">
                                    {JSON.stringify(
                                        alertItem.details || {},
                                        null,
                                        2
                                    )}
                                </pre>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="card text-sm">
                                <p>
                                    <span className="font-medium">Source:</span>{" "}
                                    {alertItem.source || "unknown"}
                                </p>
                                <p>
                                    <span className="font-medium">
                                        Severity:
                                    </span>{" "}
                                    {alertItem.severity || "medium"}
                                </p>
                                <p>
                                    <span className="font-medium">
                                        Handled:
                                    </span>{" "}
                                    {String(alertItem.handled)}
                                </p>
                                <p>
                                    <span className="font-medium">
                                        Created:
                                    </span>{" "}
                                    {new Date(
                                        alertItem.created_at
                                    ).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthLayout>
        </ProtectedRoute>
    );
}
