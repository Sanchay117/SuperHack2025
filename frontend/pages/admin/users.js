import { useState, useEffect } from "react";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AuthLayout } from "../components/AuthLayout";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { useAuth } from "../contexts/AuthContext";
import { usersAPI } from "../../lib/api";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { Users, UserPlus, Edit, Trash2 } from "lucide-react";

export default function AdminUsersPage() {
    const { user, hasRole } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const [inviteData, setInviteData] = useState({
        email: "",
        role: "technician",
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data } = await usersAPI.getAll();
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        toast.success(`Invitation sent to ${inviteData.email}`);
        setShowInviteModal(false);
        setInviteData({ email: "", role: "technician" });
    };

    const handleRoleChange = async (userId, newRole) => {
        toast.success("User role updated!");
        fetchUsers();
    };

    const handleDeactivate = async (userId) => {
        if (confirm("Are you sure you want to deactivate this user?")) {
            toast.success("User deactivated");
            fetchUsers();
        }
    };

    const columns = [
        {
            key: "id",
            label: "ID",
            sortable: true,
        },
        {
            key: "name",
            label: "Name",
            sortable: true,
        },
        {
            key: "email",
            label: "Email",
            sortable: true,
        },
        {
            key: "role",
            label: "Role",
            sortable: true,
            render: (value) => (
                <span className="badge badge-medium capitalize">{value}</span>
            ),
        },
        {
            key: "created_at",
            label: "Created",
            sortable: true,
            render: (value) =>
                value ? format(new Date(value), "MMM dd, yyyy") : "Unknown",
        },
    ];

    if (!hasRole("admin")) {
        return (
            <ProtectedRoute>
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

    if (loading) {
        return (
            <ProtectedRoute requiredRole="admin">
                <AuthLayout>
                    <div>Loading...</div>
                </AuthLayout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute requiredRole="admin">
            <AuthLayout>
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">
                            User Management
                        </h1>
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="btn btn-primary flex items-center space-x-2"
                        >
                            <UserPlus size={20} />
                            <span>Invite User</span>
                        </button>
                    </div>

                    <div className="card">
                        <DataTable
                            data={users}
                            columns={columns}
                            searchable={true}
                            actions={(row) => (
                                <div className="flex items-center space-x-2">
                                    <select
                                        value={row.role}
                                        onChange={(e) =>
                                            handleRoleChange(
                                                row.id,
                                                e.target.value
                                            )
                                        }
                                        className="input text-xs py-1"
                                    >
                                        <option value="user">User</option>
                                        <option value="technician">
                                            Technician
                                        </option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeactivate(row.id);
                                        }}
                                        className="p-1 text-red-600 hover:text-red-800"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        />
                    </div>

                    {/* Invite Modal */}
                    <Modal
                        isOpen={showInviteModal}
                        onClose={() => setShowInviteModal(false)}
                        title="Invite New User"
                    >
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={inviteData.email}
                                    onChange={(e) =>
                                        setInviteData({
                                            ...inviteData,
                                            email: e.target.value,
                                        })
                                    }
                                    required
                                    className="input w-full"
                                    placeholder="user@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Role
                                </label>
                                <select
                                    value={inviteData.role}
                                    onChange={(e) =>
                                        setInviteData({
                                            ...inviteData,
                                            role: e.target.value,
                                        })
                                    }
                                    className="input w-full"
                                >
                                    <option value="user">User</option>
                                    <option value="technician">
                                        Technician
                                    </option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    type="submit"
                                    className="btn btn-primary flex-1"
                                >
                                    Send Invitation
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
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
