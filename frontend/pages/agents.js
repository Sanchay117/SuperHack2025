import { useState, useEffect } from "react";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AuthLayout } from "../components/AuthLayout";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { useSocket } from "../lib/socket";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { agentsAPI } from "../lib/api";
import { Plus, Play, Clock, CheckCircle } from "lucide-react";

export default function AgentsPage() {
    const [actions, setActions] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: "all" });

    const [newAction, setNewAction] = useState({
        type: "diagnostics",
        payload: "{}",
    });

    const { socket } = useSocket({
        "action:updated": (data) => {
            toast.success("Action updated!");
            setActions((prev) =>
                prev.map((a) => (a.id === data.id ? data : a))
            );
        },
    });

    useEffect(() => {
        fetchActions();
    }, []);

    const fetchActions = async () => {
        try {
            const { data } = await agentsAPI.getActions();
            setActions(data || []);
        } catch (error) {
            console.error("Error fetching actions:", error);
            setActions([]);
        } finally {
            setLoading(false);
        }
    };

    const submitAction = async (e) => {
        e.preventDefault();

        try {
            const payload = JSON.parse(newAction.payload);
            await agentsAPI.submitAction(newAction.type, payload);
            toast.success("Action queued successfully!");
            setShowModal(false);
            setNewAction({ type: "diagnostics", payload: "{}" });
            fetchActions();
        } catch (error) {
            toast.error("Failed to submit action: " + error.message);
        }
    };

    const getFilteredActions = () => {
        if (filters.status === "all") return actions;
        return actions.filter((a) => a.status === filters.status);
    };

    const quickSimulate = async (type, payload) => {
        try {
            const { data } = await agentsAPI.submitAction(type, payload);
            const id = data?.action?.id;
            if (!id) {
                toast.error("Failed to queue action");
                return;
            }
            await fetch(`/api/agents/run/${id}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            toast.success(`Simulated ${type}`);
            fetchActions();
        } catch (e) {
            toast.error("Simulation failed: " + (e.message || "unknown"));
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "queued":
            case "pending":
                return <Clock className="text-yellow-600" size={16} />;
            case "running":
                return <Play className="text-blue-600" size={16} />;
            case "done":
            case "completed":
                return <CheckCircle className="text-green-600" size={16} />;
            default:
                return null;
        }
    };

    const columns = [
        {
            key: "id",
            label: "ID",
            sortable: true,
        },
        {
            key: "type",
            label: "Type",
            sortable: true,
        },
        {
            key: "status",
            label: "Status",
            sortable: true,
            render: (value) => (
                <div className="flex items-center space-x-2">
                    {getStatusIcon(value)}
                    <span className="capitalize">{value || "pending"}</span>
                </div>
            ),
        },
        {
            key: "created_at",
            label: "Created",
            sortable: true,
            render: (value) =>
                value ? format(new Date(value), "MMM dd, HH:mm") : "Unknown",
        },
    ];

    const runQueued = async () => {
        const queued = actions.filter(
            (a) =>
                (a.status || "pending") === "queued" || a.status === "pending"
        );
        await Promise.all(
            queued.map((a) =>
                fetch(`/api/agents/run/${a.id}`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                })
            )
        );
        toast.success("Triggered agent runner");
        fetchActions();
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <AuthLayout>
                    <div>Loading...</div>
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
                            Agent Actions
                        </h1>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn btn-primary flex items-center space-x-2"
                        >
                            <Plus size={20} />
                            <span>Request Action</span>
                        </button>
                    </div>
                    <div className="mb-4">
                        <button
                            onClick={runQueued}
                            className="btn btn-secondary"
                        >
                            Simulate Agent Runner (complete queued)
                        </button>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <button
                                className="btn btn-outline"
                                onClick={() =>
                                    quickSimulate("diagnostics", {
                                        target: "server-01",
                                        command: "healthcheck",
                                    })
                                }
                            >
                                Quick Sim: Diagnostics (server-01)
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() =>
                                    quickSimulate("patch", {
                                        target: "server-02",
                                        package: "openssl",
                                        version: "1.1.1u",
                                    })
                                }
                            >
                                Quick Sim: Apply Patch (openssl)
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() =>
                                    quickSimulate("restart", {
                                        service: "web",
                                        target: "web-01",
                                    })
                                }
                            >
                                Quick Sim: Restart Web Service
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() =>
                                    quickSimulate("backup", {
                                        target: "db-01",
                                        scope: "full",
                                    })
                                }
                            >
                                Quick Sim: Backup Database
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() =>
                                    quickSimulate("report", {
                                        period: "last_24h",
                                        focus: "incidents",
                                    })
                                }
                            >
                                Quick Sim: Generate Incident Report
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="card mb-6">
                        <div className="flex items-center space-x-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status Filter
                                </label>
                                <select
                                    value={filters.status}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            status: e.target.value,
                                        })
                                    }
                                    className="input"
                                >
                                    <option value="all">All</option>
                                    <option value="queued">Queued</option>
                                    <option value="running">Running</option>
                                    <option value="done">Done</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Actions Table */}
                    <div className="card">
                        {actions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No agent actions yet. Create one to get started!
                            </div>
                        ) : (
                            <DataTable
                                data={getFilteredActions()}
                                columns={columns}
                                searchable={true}
                            />
                        )}
                    </div>

                    {/* Request Action Modal */}
                    <Modal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        title="Request AI Action"
                        size="lg"
                    >
                        <form onSubmit={submitAction} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Action Type
                                </label>
                                <select
                                    value={newAction.type}
                                    onChange={(e) =>
                                        setNewAction({
                                            ...newAction,
                                            type: e.target.value,
                                        })
                                    }
                                    className="input w-full"
                                >
                                    <option value="diagnostics">
                                        Run Diagnostics
                                    </option>
                                    <option value="patch">Apply Patch</option>
                                    <option value="restart">
                                        Restart Service
                                    </option>
                                    <option value="backup">
                                        Create Backup
                                    </option>
                                    <option value="report">
                                        Generate Report
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payload (JSON)
                                </label>
                                <textarea
                                    value={newAction.payload}
                                    onChange={(e) =>
                                        setNewAction({
                                            ...newAction,
                                            payload: e.target.value,
                                        })
                                    }
                                    required
                                    rows={8}
                                    className="input w-full font-mono text-sm"
                                    placeholder='{"target": "server-01", "command": "check"}'
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Enter valid JSON for the action payload
                                </p>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    type="submit"
                                    className="btn btn-primary flex-1"
                                >
                                    Submit Action
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </Modal>
                </div>
            </AuthLayout>
        </ProtectedRoute>
    );
}
