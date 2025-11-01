import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { AuthLayout } from "../../components/AuthLayout";
import { ticketsAPI, assistAPI } from "../../lib/api";
import CommentSection from "../../components/CommentSection";
import AttachmentUploader from "../../components/AttachmentUploader";
import { toast } from "react-hot-toast";

export default function TicketDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const [ticket, setTicket] = useState(null);
    const [saving, setSaving] = useState(false);
    const [assist, setAssist] = useState(null);
    const [assistLoading, setAssistLoading] = useState(false);

    useEffect(() => {
        if (!id) return;
        ticketsAPI
            .getById(id)
            .then((r) => setTicket(r.data))
            .catch(() => toast.error("Failed to load ticket"));
    }, [id]);

    async function update(field, value) {
        if (!id) return;
        setSaving(true);
        try {
            const r = await ticketsAPI.update(id, { [field]: value });
            setTicket(r.data);
            toast.success("Updated");
        } catch {
            toast.error("Update failed");
        } finally {
            setSaving(false);
        }
    }

    async function getSuggestions() {
        if (!id) return;
        setAssistLoading(true);
        try {
            const r = await assistAPI.suggestForTicket(id);
            setAssist(r.data);
        } catch (e) {
            toast.error("Failed to get suggestions");
        } finally {
            setAssistLoading(false);
        }
    }

    if (!ticket) {
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
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">
                            Ticket #{ticket.id}
                        </h1>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="card space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Title
                                    </label>
                                    <input
                                        className="input w-full"
                                        defaultValue={ticket.title}
                                        onBlur={(e) =>
                                            update("title", e.target.value)
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        className="input w-full"
                                        rows={5}
                                        defaultValue={ticket.description}
                                        onBlur={(e) =>
                                            update(
                                                "description",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>
                                <div className="flex space-x-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Status
                                        </label>
                                        <select
                                            className="input"
                                            defaultValue={ticket.status}
                                            onChange={(e) =>
                                                update("status", e.target.value)
                                            }
                                        >
                                            <option value="open">Open</option>
                                            <option value="in_progress">
                                                In Progress
                                            </option>
                                            <option value="closed">
                                                Closed
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Priority
                                        </label>
                                        <select
                                            className="input"
                                            defaultValue={ticket.priority}
                                            onChange={(e) =>
                                                update(
                                                    "priority",
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">
                                                Medium
                                            </option>
                                            <option value="high">High</option>
                                            <option value="critical">
                                                Critical
                                            </option>
                                        </select>
                                    </div>
                                </div>
                                {saving && (
                                    <p className="text-xs text-gray-500">
                                        Saving...
                                    </p>
                                )}
                            </div>

                            <div className="card">
                                <h2 className="text-lg font-semibold mb-3">
                                    Comments
                                </h2>
                                <CommentSection
                                    storageKey={`ticket:${ticket.id}:comments`}
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="card">
                                <h2 className="text-lg font-semibold mb-3">
                                    Attachments
                                </h2>
                                <AttachmentUploader
                                    storageKey={`ticket:${ticket.id}:files`}
                                />
                            </div>
                            <div className="card">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-lg font-semibold">
                                        Technician Assist
                                    </h2>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={getSuggestions}
                                        disabled={assistLoading}
                                    >
                                        {assistLoading
                                            ? "Thinking..."
                                            : "Get AI Suggestions"}
                                    </button>
                                </div>
                                {assist && (
                                    <div className="text-sm space-y-3">
                                        {assist.steps &&
                                            Array.isArray(assist.steps) && (
                                                <div>
                                                    <p className="font-medium mb-1">
                                                        Suggested Steps
                                                    </p>
                                                    <ul className="list-disc ml-5 space-y-1">
                                                        {assist.steps.map(
                                                            (s, i) => (
                                                                <li key={i}>
                                                                    {s}
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        {assist.reply && (
                                            <div>
                                                <p className="font-medium mb-1">
                                                    Draft Reply
                                                </p>
                                                <div className="p-2 bg-gray-50 rounded border text-gray-700 whitespace-pre-wrap">
                                                    {assist.reply}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="card text-sm text-gray-600">
                                <p>
                                    <span className="font-medium">
                                        Created:
                                    </span>{" "}
                                    {new Date(
                                        ticket.created_at
                                    ).toLocaleString()}
                                </p>
                                {ticket.updated_at && (
                                    <p>
                                        <span className="font-medium">
                                            Updated:
                                        </span>{" "}
                                        {new Date(
                                            ticket.updated_at
                                        ).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </AuthLayout>
        </ProtectedRoute>
    );
}
