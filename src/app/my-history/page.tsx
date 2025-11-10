"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LuClock,
  LuCalendar,
  LuShoppingCart,
  LuCoffee,
  LuCar,
} from "react-icons/lu";
import { toast } from "react-toastify";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageLoader from "@/components/PageLoader";
import { getAuthHeaders } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

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
    details: Record<string, unknown>;
  }[];
}

function MyShiftTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 50;

  const fetchTodaysTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/api/reports/my-shift/transactions?size=${pageSize}&page=${page}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!res.ok) throw new Error("Failed to fetch transactions");

      const data = await res.json();
      const newTransactions = data.transactions || [];

      if (page === 1) {
        setTransactions(newTransactions);
      } else {
        setTransactions((prev) => [...prev, ...newTransactions]);
      }

      setHasMore(newTransactions.length === pageSize);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTodaysTransactions();
  }, [fetchTodaysTransactions]);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  if (loading && page === 1) {
    return (
      <PageLoader message="Loading Today's Transactions..." color="blue" />
    );
  }

  const coffeeTransactions = transactions.filter((tx) =>
    tx.items.some((item) => item.business_unit === "Coffee")
  );
  const carwashTransactions = transactions.filter((tx) =>
    tx.items.some((item) => item.business_unit === "Carwash")
  );

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <LuClock size={32} className="text-blue-600" />
            Today&apos;s Transactions
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            All your transactions from today&apos;s shift
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Transactions
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {transactions.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <LuShoppingCart size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Coffee Orders
                </p>
                <p className="text-2xl font-bold text-amber-700 mt-1">
                  {coffeeTransactions.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <LuCoffee size={24} className="text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Carwash Orders
                </p>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {carwashTransactions.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <LuCar size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <LuClock size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-700">
              No transactions yet today
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Start taking orders to see them here!
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                All Transactions ({transactions.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {transactions.map((tx) => (
                <div
                  key={tx.order_id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          #{tx.order_id}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            tx.payment_method === "Cash"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {tx.payment_method}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <LuCalendar size={12} />
                        {new Date(tx.created_at).toLocaleDateString()}
                        <LuClock size={12} className="ml-2" />
                        {new Date(tx.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        ₱{Number(tx.total).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {tx.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm text-gray-600"
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
          </div>
        )}

        {/* Load More Button */}
        {hasMore && transactions.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function MyHistoryPage() {
  return <MyShiftTransactions />;
}
