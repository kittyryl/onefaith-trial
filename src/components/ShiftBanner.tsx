"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthHeaders } from "@/lib/auth";
import { toast } from "react-toastify";
import { LuClock, LuLogOut, LuLogIn } from "react-icons/lu";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

interface Shift {
  id: number;
  user_id: number;
  start_time: string;
  end_time: string | null;
  status: "active" | "ended";
  notes: string | null;
}

export default function ShiftBanner() {
  const { user } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState("");

  const fetchCurrentShift = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/shifts/current`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch shift");
      const data = await res.json();
      setShift(data.shift);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  useEffect(() => {
    if (!shift) {
      setElapsed("");
      return;
    }

    const updateElapsed = () => {
      const start = new Date(shift.start_time).getTime();
      const now = Date.now();
      const diff = now - start;
      const hours = Math.floor(diff / 1000 / 60 / 60);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      setElapsed(`${hours}h ${minutes}m`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [shift]);

  const handleStartShift = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/shifts/start`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to start shift");
      }
      toast.success("Shift started!");
      fetchCurrentShift();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to start shift");
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    const notes = prompt("Optional: Add notes about this shift");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/shifts/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to end shift");
      toast.success("Shift ended!");
      setShift(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to end shift");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div
      className={`px-4 py-2 flex items-center justify-between text-sm ${
        shift
          ? "bg-emerald-600 text-white"
          : "bg-amber-100 text-amber-900 border-b border-amber-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <LuClock size={16} />
        {shift ? (
          <span>
            <strong>Shift Active</strong> • Started{" "}
            {new Date(shift.start_time).toLocaleTimeString()} • {elapsed}
          </span>
        ) : (
          <span>No active shift</span>
        )}
      </div>
      <button
        onClick={shift ? handleEndShift : handleStartShift}
        disabled={loading}
        className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
          shift
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-amber-800 hover:bg-amber-700 text-white"
        } disabled:opacity-50`}
      >
        {shift ? (
          <>
            <LuLogOut size={14} /> End Shift
          </>
        ) : (
          <>
            <LuLogIn size={14} /> Start Shift
          </>
        )}
      </button>
    </div>
  );
}
