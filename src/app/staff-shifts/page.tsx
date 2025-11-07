"use client";

import { useState, useEffect } from "react";
import { LuUsers, LuFilter, LuDownload, LuCalendar, LuClock, LuDollarSign, LuShoppingCart, LuCoffee, LuCar } from "react-icons/lu";
import { toast } from "react-toastify";
import ProtectedRoute from "@/components/ProtectedRoute";
import ManagerOnlyRoute from "@/components/ManagerOnlyRoute";
import PageLoader from "@/components/PageLoader";
import { getAuthHeaders } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

interface User {
  id: number;
  username: string;
  full_name: string;
}

interface Transaction {
  order_id: string;
  created_at: string;
  total: number;
  payment_method: string;
  shift_id: number | null;
  user_id: number;
  username: string;
  full_name: string;
  shift_start: string | null;
  shift_end: string | null;
  items: {
    business_unit: "Coffee" | "Carwash";
    item_type: string;
    quantity: number;
    line_total: number;
    details: any;
  }[];
}

function StaffShiftsHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  
  // Filters
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  // Quick date filters
  const setQuickDateFilter = (filter: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case "today":
        setStartDate(today.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        setStartDate(yesterday.toISOString().split("T")[0]);
        setEndDate(yesterday.toISOString().split("T")[0]);
        break;
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        setStartDate(weekStart.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
        break;
      case "last7":
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 6);
        setStartDate(last7.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
        break;
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(monthStart.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
        break;
    }
    setPage(1);
  };

  // Fetch users for filter
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/users`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data: User[] = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        size: pageSize.toString(),
      });
      
      if (selectedStaff) params.append("staffId", selectedStaff);
      if (selectedBusinessUnit) params.append("businessUnit", selectedBusinessUnit);
      if (selectedPayment) params.append("payment", selectedPayment);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(
        `${API_BASE}/api/reports/my-shift/all-transactions?${params}`,
        { headers: getAuthHeaders() }
      );

      if (!res.ok) throw new Error("Failed to fetch transactions");
      
      const data = await res.json();
      setTransactions(data.transactions || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      toast.error("Failed to load shift transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, selectedStaff, selectedBusinessUnit, selectedPayment, startDate, endDate]);

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast.info("No transactions to export");
      return;
    }

    const headers = [
      "Order ID",
      "Date",
      "Time",
      "Staff",
      "Business Unit",
      "Payment",
      "Total",
      "Shift Start",
      "Shift End"
    ];

    const rows = transactions.map((tx) => {
      const businessUnits = [...new Set(tx.items.map(i => i.business_unit))].join(", ");
      const date = new Date(tx.created_at);
      return [
        tx.order_id,
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        tx.full_name,
        businessUnits,
        tx.payment_method,
        tx.total.toFixed(2),
        tx.shift_start ? new Date(tx.shift_start).toLocaleString() : "N/A",
        tx.shift_end ? new Date(tx.shift_end).toLocaleString() : "Active"
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `staff-shift-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully!");
  };

  const resetFilters = () => {
    setSelectedStaff("");
    setSelectedBusinessUnit("");
    setSelectedPayment("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  if (loading && transactions.length === 0) {
    return <PageLoader message="Loading Staff Shift History..." color="blue" />;
  }

  // Calculate stats
  const totalRevenue = transactions.reduce((sum, tx) => sum + Number(tx.total), 0);
  const coffeeTransactions = transactions.filter(tx => 
    tx.items.some(item => item.business_unit === "Coffee")
  );
  const carwashTransactions = transactions.filter(tx => 
    tx.items.some(item => item.business_unit === "Carwash")
  );
  const coffeeRevenue = coffeeTransactions.reduce((sum, tx) => sum + Number(tx.total), 0);
  const carwashRevenue = carwashTransactions.reduce((sum, tx) => sum + Number(tx.total), 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <LuUsers size={32} className="text-blue-600" />
            Staff Shift History
          </h1>
          <p className="text-sm text-gray-600 mt-1">View all staff transactions by shift</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={transactions.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <LuDownload size={18} />
          Export CSV
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <LuShoppingCart size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₱{totalRevenue.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <LuDollarSign size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Coffee Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₱{coffeeRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{coffeeTransactions.length} orders</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <LuCoffee size={24} className="text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Carwash Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₱{carwashRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{carwashTransactions.length} orders</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <LuCar size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Date Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <LuCalendar size={18} className="text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-700">Quick Date Filters</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setQuickDateFilter("today")}
            className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setQuickDateFilter("yesterday")}
            className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors"
          >
            Yesterday
          </button>
          <button
            onClick={() => setQuickDateFilter("last7")}
            className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setQuickDateFilter("week")}
            className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors"
          >
            This Week
          </button>
          <button
            onClick={() => setQuickDateFilter("month")}
            className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors"
          >
            This Month
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <LuFilter size={20} className="text-gray-600" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Staff Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff Member
            </label>
            <select
              value={selectedStaff}
              onChange={(e) => { setSelectedStaff(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Staff</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Business Unit Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Unit
            </label>
            <select
              value={selectedBusinessUnit}
              onChange={(e) => { setSelectedBusinessUnit(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="Coffee">Coffee</option>
              <option value="Carwash">Carwash</option>
            </select>
          </div>

          {/* Payment Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={selectedPayment}
              onChange={(e) => { setSelectedPayment(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="Cash">Cash</option>
              <option value="Gcash">GCash</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={resetFilters}
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Results Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-900">
          Showing <span className="font-bold">{transactions.length}</span> of{" "}
          <span className="font-bold">{total}</span> transactions
          {selectedStaff && users.find(u => u.id === Number(selectedStaff)) && (
            <span> for <span className="font-bold">{users.find(u => u.id === Number(selectedStaff))?.full_name}</span></span>
          )}
        </p>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shift
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((tx) => {
                const businessUnits = [...new Set(tx.items.map(i => i.business_unit))];
                return (
                  <tr key={tx.order_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      #{tx.order_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <LuCalendar size={14} className="text-gray-400" />
                        {new Date(tx.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <LuClock size={12} className="text-gray-400" />
                        {new Date(tx.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{tx.full_name}</div>
                      <div className="text-xs text-gray-500">@{tx.username}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {businessUnits.map((bu, i) => (
                        <span
                          key={i}
                          className={`inline-block px-2 py-1 rounded text-xs font-medium mr-1 ${
                            bu === "Coffee"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {bu}
                        </span>
                      ))}
                      <div className="text-xs text-gray-500 mt-1">
                        {tx.items.length} item{tx.items.length > 1 ? "s" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          tx.payment_method === "Cash"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      ₱{tx.total.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {tx.shift_start ? (
                        <div>
                          <div>Started: {new Date(tx.shift_start).toLocaleTimeString()}</div>
                          {tx.shift_end && (
                            <div>Ended: {new Date(tx.shift_end).toLocaleTimeString()}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">No shift</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <LuUsers size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No transactions found</p>
            <p className="text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffShiftsPage() {
  return (
    <ProtectedRoute>
      <ManagerOnlyRoute>
        <StaffShiftsHistory />
      </ManagerOnlyRoute>
    </ProtectedRoute>
  );
}
