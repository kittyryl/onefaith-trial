"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-toastify";
import { getAuthHeaders } from "@/lib/auth";
import Spinner from "@/components/Spinner";
import PageLoader from "@/components/PageLoader";
import {
  LuPlus,
  LuPencil,
  LuTrash2,
  LuUserCog,
  LuClock,
  LuCar,
} from "react-icons/lu";

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
  const [activeTab, setActiveTab] = useState<"accounts" | "shifts" | "carwash">(
    "accounts"
  );

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
            <button
              onClick={() => setActiveTab("carwash")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "carwash"
                  ? "text-amber-700 border-b-2 border-amber-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LuCar size={18} className="inline mr-2" />
              Carwash Services
            </button>
          </div>

          {activeTab === "accounts" ? (
            <StaffManagement />
          ) : activeTab === "shifts" ? (
            <ShiftHistory />
          ) : (
            <CarwashCatalog />
          )}
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
      if (!res.ok) {
        setCurrentShift(null);
        return;
      }
      const data: Shift | null = await res.json();
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

// ===== CARWASH CATALOG MANAGEMENT =====

interface CarwashService {
  id: number;
  name: string;
  category: string;
  description: string;
  display_order: number;
  is_active: boolean;
  prices: CarwashPrice[];
  created_at: string;
  updated_at: string;
}

interface CarwashPrice {
  id: number;
  service_id: number;
  vehicle_type: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

function CarwashCatalog() {
  const [services, setServices] = useState<CarwashService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<CarwashService | null>(
    null
  );
  const [editingPrice, setEditingPrice] = useState<{
    serviceId: number;
    price: CarwashPrice | null;
  } | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/api/carwash-catalog/admin/services`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) throw new Error("Failed to fetch services");
      const data: CarwashService[] = await res.json();
      setServices(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load carwash services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleAddService = () => {
    setEditingService(null);
    setShowServiceModal(true);
  };

  const handleEditService = (service: CarwashService) => {
    setEditingService(service);
    setShowServiceModal(true);
  };

  const handleDeleteService = async (id: number, name: string) => {
    if (
      !confirm(
        `Delete service "${name}"? This will also delete all associated prices.`
      )
    )
      return;

    try {
      const res = await fetch(
        `${API_BASE}/api/carwash-catalog/admin/services/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!res.ok) throw new Error("Failed to delete service");

      toast.success("Service deleted successfully");
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error("Could not delete service");
    }
  };

  const handleAddPrice = (serviceId: number) => {
    setEditingPrice({ serviceId, price: null });
    setShowPriceModal(true);
  };

  const handleEditPrice = (serviceId: number, price: CarwashPrice) => {
    setEditingPrice({ serviceId, price });
    setShowPriceModal(true);
  };

  const handleDeletePrice = async (priceId: number, vehicleType: string) => {
    if (!confirm(`Delete price for "${vehicleType}"?`)) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/carwash-catalog/admin/prices/${priceId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!res.ok) throw new Error("Failed to delete price");

      toast.success("Price deleted successfully");
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error("Could not delete price");
    }
  };

  const handleToggleServiceActive = async (service: CarwashService) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/carwash-catalog/admin/services/${service.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ is_active: !service.is_active }),
        }
      );

      if (!res.ok) throw new Error("Failed to update service");

      toast.success(
        `Service ${!service.is_active ? "activated" : "deactivated"}`
      );
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error("Could not update service");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Carwash Services Catalog</h2>
          <p className="text-sm text-gray-600">
            Manage services and pricing for the POS
          </p>
        </div>
        <button
          onClick={handleAddService}
          className="flex items-center gap-2 bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
        >
          <LuPlus size={18} />
          Add Service
        </button>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {services.map((service) => (
          <div
            key={service.id}
            className={`bg-white rounded-lg shadow-sm border p-6 ${
              !service.is_active ? "opacity-60" : ""
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold">{service.name}</h3>
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                    {service.category}
                  </span>
                  {!service.is_active && (
                    <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {service.description}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleServiceActive(service)}
                  className="p-2 rounded hover:bg-gray-100"
                  title={service.is_active ? "Deactivate" : "Activate"}
                >
                  {service.is_active ? "🟢" : "⚪"}
                </button>
                <button
                  onClick={() => handleEditService(service)}
                  className="p-2 rounded hover:bg-gray-100 text-blue-600"
                  title="Edit service"
                >
                  <LuPencil size={18} />
                </button>
                <button
                  onClick={() => handleDeleteService(service.id, service.name)}
                  className="p-2 rounded hover:bg-gray-100 text-red-600"
                  title="Delete service"
                >
                  <LuTrash2 size={18} />
                </button>
              </div>
            </div>

            {/* Prices */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-sm text-gray-700">
                  Vehicle Prices
                </h4>
                <button
                  onClick={() => handleAddPrice(service.id)}
                  className="text-sm text-amber-700 hover:underline flex items-center gap-1"
                >
                  <LuPlus size={14} />
                  Add Price
                </button>
              </div>
              {service.prices.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No prices set</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {service.prices.map((price) => (
                    <div
                      key={price.id}
                      className={`border rounded-lg p-3 ${
                        !price.is_active ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{price.vehicle_type}</p>
                          <p className="text-lg font-bold text-amber-700">
                            ₱{price.price.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditPrice(service.id, price)}
                            className="p-1 rounded hover:bg-gray-100 text-blue-600"
                            title="Edit price"
                          >
                            <LuPencil size={14} />
                          </button>
                          <button
                            onClick={() =>
                              handleDeletePrice(price.id, price.vehicle_type)
                            }
                            className="p-1 rounded hover:bg-gray-100 text-red-600"
                            title="Delete price"
                          >
                            <LuTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showServiceModal && (
        <ServiceModal
          service={editingService}
          onClose={() => {
            setShowServiceModal(false);
            setEditingService(null);
          }}
          onSave={fetchServices}
        />
      )}

      {showPriceModal && editingPrice && (
        <PriceModal
          serviceId={editingPrice.serviceId}
          price={editingPrice.price}
          onClose={() => {
            setShowPriceModal(false);
            setEditingPrice(null);
          }}
          onSave={fetchServices}
        />
      )}
    </div>
  );
}

// Service Modal Component
interface ServiceModalProps {
  service: CarwashService | null;
  onClose: () => void;
  onSave: () => void;
}

function ServiceModal({ service, onClose, onSave }: ServiceModalProps) {
  const [name, setName] = useState(service?.name || "");
  const [category, setCategory] = useState(service?.category || "Others");
  const [description, setDescription] = useState(service?.description || "");
  const [displayOrder, setDisplayOrder] = useState(service?.display_order || 0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !category.trim()) {
      toast.error("Name and category are required");
      return;
    }

    setSaving(true);

    try {
      const url = service
        ? `${API_BASE}/api/carwash-catalog/admin/services/${service.id}`
        : `${API_BASE}/api/carwash-catalog/admin/services`;

      const res = await fetch(url, {
        method: service ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          description: description.trim() || null,
          display_order: displayOrder,
        }),
      });

      if (!res.ok) throw new Error("Failed to save service");

      toast.success(`Service ${service ? "updated" : "created"} successfully`);
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Could not save service");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">
          {service ? "Edit Service" : "Add Service"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name *
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Detailed Wash"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2 bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Basic">Basic</option>
              <option value="Most Popular">Most Popular</option>
              <option value="Advanced">Advanced</option>
              <option value="Others">Others</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Service details..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Order
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              min={0}
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
              ) : service ? (
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

// Price Modal Component
interface PriceModalProps {
  serviceId: number;
  price: CarwashPrice | null;
  onClose: () => void;
  onSave: () => void;
}

function PriceModal({ serviceId, price, onClose, onSave }: PriceModalProps) {
  const [vehicleType, setVehicleType] = useState(price?.vehicle_type || "");
  const [priceValue, setPriceValue] = useState(price?.price?.toString() || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleType.trim() || !priceValue) {
      toast.error("Vehicle type and price are required");
      return;
    }

    const priceNum = parseFloat(priceValue);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Invalid price");
      return;
    }

    setSaving(true);

    try {
      const url = price
        ? `${API_BASE}/api/carwash-catalog/admin/prices/${price.id}`
        : `${API_BASE}/api/carwash-catalog/admin/prices`;

      const res = await fetch(url, {
        method: price ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          service_id: serviceId,
          vehicle_type: vehicleType.trim(),
          price: priceNum,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save price");
      }

      toast.success(`Price ${price ? "updated" : "added"} successfully`);
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "Could not save price";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">
          {price ? "Edit Price" : "Add Price"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Type *
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              required
              placeholder="e.g. Sedan, SUV, Bike"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (₱) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              required
              placeholder="0.00"
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
              ) : price ? (
                "Save"
              ) : (
                "Add"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
