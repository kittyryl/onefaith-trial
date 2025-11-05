"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-toastify";
import { getAuthHeaders } from "@/lib/auth";
import Spinner from "@/components/Spinner";
import PageLoader from "@/components/PageLoader";
import { LuPlus, LuPencil, LuTrash2, LuUserCog, LuClock } from "react-icons/lu";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

type Role = "manager" | "staff";

interface AppUser {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

interface Shift {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  start_time: string;
  end_time: string | null;
  status: "active" | "ended";
  notes: string | null;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"accounts" | "shifts">("accounts");

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-linear-to-br from-amber-50 via-white to-rose-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">Settings</h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("accounts")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "accounts"
                  ? "text-amber-700 border-b-2 border-amber-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LuUserCog size={18} className="inline mr-2" />
              Accounts
            </button>
            <button
              onClick={() => setActiveTab("shifts")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "shifts"
                  ? "text-amber-700 border-b-2 border-amber-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LuClock size={18} className="inline mr-2" />
              Shift History
            </button>
          </div>

          {activeTab === "accounts" ? <StaffManagement /> : <ShiftHistory />}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function ShiftHistory() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [startingShift, setStartingShift] = useState(false);
  const [endingShift, setEndingShift] = useState(false);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/shifts/history`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch shifts");
      const data: Shift[] = await res.json();
      setShifts(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load shift history");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentShift = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/shifts/current`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 404) {
        // No active shift
        setCurrentShift(null);
        return;
      }
      if (!res.ok) {
        setCurrentShift(null);
        return;
      }
      const data: Shift = await res.json();
      setCurrentShift(data);
    } catch (err) {
      console.error(err);
      setCurrentShift(null);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchCurrentShift();
  }, []);

  const handleStartShift = async () => {
    try {
      setStartingShift(true);
      const res = await fetch(`${API_BASE}/api/shifts/start`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to start shift");
      }
      toast.success("Shift started!");
      await fetchCurrentShift();
      await fetchShifts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start shift");
    } finally {
      setStartingShift(false);
    }
  };

  const handleEndShift = async () => {
    const notes = prompt("Add any notes for this shift (optional):");
    try {
      setEndingShift(true);
      const res = await fetch(`${API_BASE}/api/shifts/end`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to end shift");
      }
      toast.success("Shift ended!");
      setCurrentShift(null);
      await fetchShifts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end shift");
    } finally {
      setEndingShift(false);
    }
  };

  const calculateDuration = (start: string, end: string | null) => {
    if (!end) return "In progress";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) return <PageLoader message="Loading Shifts..." color="amber" />;

  return (
    <div>
      {/* Shift Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            {currentShift ? (
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-semibold text-gray-900">Shift Active</p>
                  <p className="text-sm text-gray-600">
                    Started {new Date(currentShift.start_time).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
                <div>
                  <p className="font-semibold text-gray-900">No Active Shift</p>
                  <p className="text-sm text-gray-600">
                    Start a shift to track your work time
                  </p>
                </div>
              </div>
            )}
          </div>
          <div>
            {currentShift ? (
              <button
                onClick={handleEndShift}
                disabled={endingShift}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {endingShift ? <Spinner size="sm" color="gray" /> : "End Shift"}
              </button>
            ) : (
              <button
                onClick={handleStartShift}
                disabled={startingShift}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {startingShift ? (
                  <Spinner size="sm" color="gray" />
                ) : (
                  "Start Shift"
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Shift History Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Start Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                End Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {shifts.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">{s.full_name}</div>
                    <div className="text-xs text-gray-500">@{s.username}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {new Date(s.start_time).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  {s.end_time ? new Date(s.end_time).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-sm">
                  {calculateDuration(s.start_time, s.end_time)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      s.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {s.notes || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shifts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No shift history yet.
          </div>
        )}
      </div>
    </div>
  );
}

function StaffManagement() {
  const { isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/auth/users`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data: AppUser[] = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManager()) fetchUsers();
    else setLoading(false);
  }, [isManager]);

  if (!isManager()) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-gray-600">
          Only managers can access account management.
        </p>
      </div>
    );
  }

  if (loading) return <Spinner size="lg" color="amber" label="Loading..." />;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center">
          <LuUserCog size={24} className="mr-2 text-amber-700" /> Account
          Management
        </h2>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="bg-amber-800 text-white px-4 py-2 rounded-lg flex items-center hover:bg-amber-700"
        >
          <LuPlus size={18} className="mr-2" /> Add Account
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Full Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3">{u.full_name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      u.role === "manager"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      u.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditing(u);
                        setShowModal(true);
                      }}
                      className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center"
                    >
                      <LuPencil size={16} className="mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(u, setUsers)}
                      className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(u, setUsers)}
                      className="px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 flex items-center"
                    >
                      <LuTrash2 size={16} className="mr-1" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500">No accounts yet.</div>
        )}
      </div>

      {showModal && (
        <UserModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchUsers();
          }}
          editing={editing}
        />
      )}
    </>
  );

  function handleToggleActive(
    u: AppUser,
    setUsersState: (v: AppUser[]) => void
  ) {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/users/${u.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            fullName: u.full_name,
            role: u.role,
            isActive: !u.is_active,
          }),
        });
        if (!res.ok) throw new Error("Failed to update user");
        toast.success(
          `${!u.is_active ? "Activated" : "Deactivated"} ${u.username}`
        );
        setUsersState(
          users.map((x) =>
            x.id === u.id ? { ...x, is_active: !u.is_active } : x
          )
        );
      } catch (err) {
        console.error(err);
        toast.error("Update failed");
      } finally {
      }
    })();
  }

  function handleDelete(u: AppUser, setUsersState: (v: AppUser[]) => void) {
    if (!confirm(`Delete user ${u.username}? This cannot be undone.`)) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/users/${u.id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          const data = await res
            .json()
            .catch(() => ({ message: "Failed to delete user" }));
          throw new Error(data.message || "Failed to delete user");
        }
        toast.success(`Deleted ${u.username}`);
        setUsersState(users.filter((x) => x.id !== u.id));
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Delete failed");
      } finally {
      }
    })();
  }
}

function UserModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: AppUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState(editing?.username || "");
  const [fullName, setFullName] = useState(editing?.full_name || "");
  const [role, setRole] = useState<Role>(editing?.role || "staff");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(editing);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      if (!fullName.trim()) {
        toast.error("Full name is required");
        return;
      }

      if (!isEdit && !username.trim()) {
        toast.error("Username is required");
        return;
      }

      if (!isEdit && password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      if (password && password !== confirm) {
        toast.error("Passwords do not match");
        return;
      }

      const payload: Record<string, unknown> = isEdit
        ? {
            fullName,
            role,
            isActive: editing!.is_active,
            username: username.trim(),
          }
        : { username, fullName, role, password };
      if (password) payload.password = password;

      const res = await fetch(
        isEdit
          ? `${API_BASE}/api/auth/users/${editing!.id}`
          : `${API_BASE}/api/auth/users`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Save failed");
      }

      toast.success(isEdit ? "Account updated" : "Account created");
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">{title(editing)}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg p-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg p-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2 bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="staff">staff</option>
              <option value="manager">manager</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEdit ? "New Password (optional)" : "Password"}
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required={Boolean(password)}
              minLength={password ? 6 : undefined}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-800 text-white hover:bg-amber-700 flex items-center"
              disabled={saving}
            >
              {saving ? (
                <Spinner size="sm" thickness={2} />
              ) : isEdit ? (
                "Save"
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function title(editing: AppUser | null) {
  return editing ? "Edit Account" : "Add Account";
}
