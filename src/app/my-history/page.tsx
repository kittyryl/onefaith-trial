"use client";

import { useState, useEffect } from "react";
import { LuClock, LuCalendar, LuDollarSign, LuShoppingCart, LuCoffee, LuCar, LuChevronDown, LuChevronUp } from "react-icons/lu";
import { toast } from "react-toastify";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageLoader from "@/components/PageLoader";
import { getAuthHeaders } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

interface ShiftStats {
  orderCount: number;
  totalSales: number;
  byBusinessUnit: {
    Coffee: number;
    Carwash: number;
  };
  byPayment: {
    Cash: number;
    Gcash: number;
  };
}

interface Shift {
  shift_id: number;
  start_time: string;
  end_time: string | null;
  status: string;
  shift_date: string;
  stats: ShiftStats;
}

interface Transaction {
  order_id: string;
  created_at: string;
  total: number;
  payment_method: string;
  items: {
    business_unit: "Coffee" | "Carwash";
    item_type: string;
    quantity: number;
    line_total: number;
    details: any;
  }[];
}

function MyHistory() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedShift, setExpandedShift] = useState<number | null>(null);
  const [shiftTransactions, setShiftTransactions] = useState<{ [key: number]: Transaction[] }>({});
  const [loadingTransactions, setLoadingTransactions] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetchShiftHistory();
  }, []);

  const fetchShiftHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/my-shift/history?size=50`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Failed to fetch shift history");

      const data = await res.json();
      setShifts(data.shifts || []);
    } catch (err) {
      console.error("Error fetching shift history:", err);
      toast.error("Failed to load shift history");
    } finally {
      setLoading(false);
    }
  };

  const fetchShiftTransactions = async (shiftId: number) => {
    if (shiftTransactions[shiftId]) {
      // Already loaded, just toggle
      setExpandedShift(expandedShift === shiftId ? null : shiftId);
      return;
    }

    try {
      setLoadingTransactions({ ...loadingTransactions, [shiftId]: true });
      const res = await fetch(
        `${API_BASE}/api/reports/my-shift/shift-transactions/${shiftId}`,
        { headers: getAuthHeaders() }
      );

      if (!res.ok) throw new Error("Failed to fetch transactions");

      const data = await res.json();
      setShiftTransactions({ ...shiftTransactions, [shiftId]: data.transactions });
      setExpandedShift(shiftId);
    } catch (err) {
      console.error("Error fetching shift transactions:", err);
      toast.error("Failed to load shift transactions");
    } finally {
      setLoadingTransactions({ ...loadingTransactions, [shiftId]: false });
    }
  };

  const toggleShift = (shiftId: number) => {
    if (expandedShift === shiftId) {
      setExpandedShift(null);
    } else {
      fetchShiftTransactions(shiftId);
    }
  };

  if (loading) {
    return <PageLoader message="Loading Your Shift History..." color="blue" />;
  }

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <LuClock size={32} className="text-blue-600" />
            My Shift History
          </h1>
          <p className="text-sm text-gray-600 mt-1">View all your past shifts and transactions</p>
        </div>

        {/* Shifts List */}
        {shifts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <LuClock size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-700">No shift history yet</p>
            <p className="text-sm text-gray-500 mt-2">Start your first shift to see it here!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => (
              <div
                key={shift.shift_id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Shift Header - Clickable */}
                <button
                  onClick={() => toggleShift(shift.shift_id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Date */}
                    <div className="flex flex-col items-center justify-center bg-blue-100 rounded-lg p-3 min-w-[80px]">
                      <div className="text-2xl font-bold text-blue-600">
                        {new Date(shift.start_time).getDate()}
                      </div>
                      <div className="text-xs text-blue-600 uppercase">
                        {new Date(shift.start_time).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>

                    {/* Shift Info */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {new Date(shift.start_time).toLocaleTimeString()} -{" "}
                          {shift.end_time
                            ? new Date(shift.end_time).toLocaleTimeString()
                            : "Active"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            shift.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {shift.status}
                        </span>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1">
                          <LuShoppingCart size={14} className="text-gray-400" />
                          <span className="font-semibold text-gray-700">
                            {shift.stats.orderCount}
                          </span>
                          <span className="text-gray-500">orders</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <LuDollarSign size={14} className="text-green-500" />
                          <span className="font-semibold text-gray-700">
                            ₱{shift.stats.totalSales.toFixed(2)}
                          </span>
                        </div>
                        {shift.stats.byBusinessUnit.Coffee > 0 && (
                          <div className="flex items-center gap-1">
                            <LuCoffee size={14} className="text-amber-500" />
                            <span className="text-gray-600">
                              ₱{shift.stats.byBusinessUnit.Coffee.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {shift.stats.byBusinessUnit.Carwash > 0 && (
                          <div className="flex items-center gap-1">
                            <LuCar size={14} className="text-blue-500" />
                            <span className="text-gray-600">
                              ₱{shift.stats.byBusinessUnit.Carwash.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <div className="ml-4">
                    {expandedShift === shift.shift_id ? (
                      <LuChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <LuChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Transactions - Expandable */}
                {expandedShift === shift.shift_id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    {loadingTransactions[shift.shift_id] ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">Loading transactions...</p>
                      </div>
                    ) : shiftTransactions[shift.shift_id]?.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No transactions in this shift</p>
                    ) : (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          Transactions ({shiftTransactions[shift.shift_id]?.length || 0})
                        </h4>
                        {shiftTransactions[shift.shift_id]?.map((tx) => (
                          <div
                            key={tx.order_id}
                            className="bg-white rounded-lg border border-gray-200 p-3"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <span className="text-sm font-medium text-gray-700">
                                  #{tx.order_id}
                                </span>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {new Date(tx.created_at).toLocaleTimeString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-900">
                                  ₱{Number(tx.total).toFixed(2)}
                                </div>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    tx.payment_method === "Cash"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {tx.payment_method}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {tx.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs text-gray-600"
                                >
                                  <span>
                                    {item.quantity}x {item.item_type}
                                    <span
                                      className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                                        item.business_unit === "Coffee"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {item.business_unit}
                                    </span>
                                  </span>
                                  <span>₱{Number(item.line_total).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function MyHistoryPage() {
  return <MyHistory />;
}
