"use client";

import { useState, useEffect } from "react";
import {
  LuFileText,
  LuDownload,
  LuDollarSign,
  LuCalendar,
  LuSearch,
  LuArrowUpDown,
  LuClock,
} from "react-icons/lu";
import { toast } from "react-toastify";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAuthHeaders } from "@/lib/auth";

// Types
interface SalesOrderItem {
  item_type: string;
  business_unit: "Coffee" | "Carwash";
  quantity: number;
  line_total: string;
  details: {
    option?: string;
    vehicle?: string;
  };
}

interface SalesOrder {
  order_id: string;
  created_at: string;
  total: string;
  discount: string;
  payment_method: string;
  order_type: string | null;
  discount_type: string | null;
  items_summary: SalesOrderItem[];
}

// Sales Page
function Sales() {
  const [salesData, setSalesData] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  // --- State for filters ---
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [businessUnit, setBusinessUnit] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // CSV export
  const exportToCSV = () => {
    const dataToExport = filteredAndSortedData();

    if (dataToExport.length === 0) {
      toast.warning("No data to export");
      return;
    }

    // CSV Headers
    const headers = [
      "Order ID",
      "Date/Time",
      "Business Unit",
      "Items",
      "Discount",
      "Discount Type",
      "Payment Method",
      "Total",
    ];

    // Convert data to CSV rows
    const rows = dataToExport.map((order) => {
      const dateTime = new Date(order.created_at).toLocaleString("en-US");
      const items = order.items_summary
        .map((item) => {
          const details = item.details?.option || item.details?.vehicle || "";
          return `${item.item_type}${details ? ` (${details})` : ""} x${
            item.quantity
          }`;
        })
        .join("; ");

      return [
        order.order_id,
        dateTime,
        order.items_summary[0]?.business_unit || "N/A",
        `"${items}"`, // Quoted to handle commas in item names
        Number(order.discount).toFixed(2),
        order.discount_type || "None",
        order.payment_method,
        Number(order.total).toFixed(2),
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `sales-report-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${dataToExport.length} transactions to CSV`);
  };

  // Fetch sales (reacts to filters)
  const fetchSalesData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (businessUnit) params.append("businessUnit", businessUnit);

      const queryString = params.toString();

      const response = await fetch(
        `${API_BASE}/api/reports/summary?${queryString}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch sales data. Server responded with ${response.status}`
        );
      }

      const data: SalesOrder[] = await response.json();
      setSalesData(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : "An unexpected error occurred";
      toast.error(`Could not load sales reports: ${message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate, businessUnit]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Quick date presets
  const setDatePreset = (preset: "today" | "7days" | "30days" | "all") => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    switch (preset) {
      case "today":
        setStartDate(formatDate(today));
        setEndDate(formatDate(today));
        break;
      case "7days":
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        setStartDate(formatDate(weekAgo));
        setEndDate(formatDate(today));
        break;
      case "30days":
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        setStartDate(formatDate(monthAgo));
        setEndDate(formatDate(today));
        break;
      case "all":
        setStartDate("");
        setEndDate("");
        break;
    }
  };

  // Sort handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Filter + sort
  const filteredAndSortedData = () => {
    const filtered = salesData.filter((order) => {
      const matchesSearch =
        order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items_summary.some((item) =>
          item.item_type.toLowerCase().includes(searchQuery.toLowerCase())
        );
      return matchesSearch;
    });

    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";

        switch (sortColumn) {
          case "date":
            aVal = new Date(a.created_at).getTime();
            bVal = new Date(b.created_at).getTime();
            break;
          case "total":
            aVal = Number(a.total);
            bVal = Number(b.total);
            break;
          case "business":
            aVal = a.items_summary[0]?.business_unit || "";
            bVal = b.items_summary[0]?.business_unit || "";
            break;
          case "payment":
            aVal = a.payment_method;
            bVal = b.payment_method;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const dataToDisplay = filteredAndSortedData();

  // Derived metrics (after filters)
  const filteredTotalSales = dataToDisplay.reduce(
    (sum, order) => sum + Number(order.total),
    0
  );
  const filteredTotalOrders = dataToDisplay.length;

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 via-white to-rose-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header and Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center">
            <LuFileText size={28} className="mr-2 md:mr-3 text-gray-700" />
            Sales Reports
          </h1>
          <button
            onClick={exportToCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
          >
            <LuDownload size={18} className="mr-2" />
            Export to CSV
          </button>
        </div>

        {/* --- Search Bar --- */}
        <div className="mb-6">
          <div className="relative">
            <LuSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by Order ID or item name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        {/* --- Quick Date Presets --- */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setDatePreset("today")}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
          >
            <LuClock size={14} className="mr-1.5" />
            Today
          </button>
          <button
            onClick={() => setDatePreset("7days")}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDatePreset("30days")}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setDatePreset("all")}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            All Time
          </button>
        </div>

        {/* --- Filter Bar --- */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
            {/* Date Range */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <LuCalendar size={20} className="text-gray-500 hidden sm:block" />
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto"
              />
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto"
              />
            </div>

            {/* Business Unit */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Business:
              </label>
              <select
                value={businessUnit}
                onChange={(e) => setBusinessUnit(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">All Units</option>
                <option value="Coffee">Coffee POS</option>
                {/* --- FIX: Corrected value --- */}
                <option value="Carwash">Carwash POS</option>
              </select>
            </div>
          </div>
        </div>

        {/* --- Metrics Row --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center">
            <div className="p-3 rounded-lg bg-emerald-100 mr-4">
              <LuDollarSign size={32} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {filteredTotalSales.toLocaleString("en-PH", {
                  style: "currency",
                  currency: "PHP",
                })}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {filteredTotalOrders} orders
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center">
            <div className="p-3 rounded-lg bg-blue-100 mr-4">
              <LuFileText size={32} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold mt-1">{filteredTotalOrders}</p>
              <p className="text-xs text-gray-400 mt-1">
                Avg:{" "}
                {filteredTotalOrders > 0
                  ? (filteredTotalSales / filteredTotalOrders).toLocaleString(
                      "en-PH",
                      { style: "currency", currency: "PHP" }
                    )
                  : "₱0.00"}
              </p>
            </div>
          </div>
        </div>

        {/* --- Main Sales Table --- */}
        <h2 className="text-xl md:text-2xl font-semibold mb-4">
          Transaction History
        </h2>
        <div className="bg-white p-3 sm:p-6 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-amber-600 mr-3" />
              <span className="text-gray-500">Fetching sales data...</span>
            </div>
          ) : dataToDisplay.length === 0 ? (
            <p className="text-center py-10 text-gray-500">
              {searchQuery
                ? "No transactions match your search."
                : "No sales records found for the selected filters."}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Order ID
                    </th>
                    <th
                      className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Date/Time</span>
                        <LuArrowUpDown
                          size={14}
                          className={
                            sortColumn === "date"
                              ? "text-amber-600"
                              : "text-gray-400"
                          }
                        />
                      </div>
                    </th>
                    <th
                      className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                      onClick={() => handleSort("business")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Business</span>
                        <LuArrowUpDown
                          size={14}
                          className={
                            sortColumn === "business"
                              ? "text-amber-600"
                              : "text-gray-400"
                          }
                        />
                      </div>
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Details
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Discount
                    </th>
                    <th
                      className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                      onClick={() => handleSort("payment")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Payment</span>
                        <LuArrowUpDown
                          size={14}
                          className={
                            sortColumn === "payment"
                              ? "text-amber-600"
                              : "text-gray-400"
                          }
                        />
                      </div>
                    </th>
                    <th
                      className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                      onClick={() => handleSort("total")}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Total</span>
                        <LuArrowUpDown
                          size={14}
                          className={
                            sortColumn === "total"
                              ? "text-amber-600"
                              : "text-gray-400"
                          }
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataToDisplay.map((order) => (
                    <tr key={order.order_id} className="hover:bg-gray-50/80">
                      <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        {order.order_id.split("-")[0]}...
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString("en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        <span
                          // --- FIX: Corrected conditional logic ---
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg ${
                            order.items_summary[0]?.business_unit === "Coffee"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {order.items_summary[0]?.business_unit}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700">
                        {order.items_summary.map((item, index) => (
                          <div key={index} className="text-xs">
                            {item.item_type}{" "}
                            {item.details?.option && `(${item.details.option})`}
                            {item.details?.vehicle &&
                              `(${item.details.vehicle})`}
                            <span className="text-gray-500">
                              {" "}
                              x{item.quantity}
                            </span>
                          </div>
                        ))}
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-red-600 tabular-nums">
                        {Number(order.discount) > 0
                          ? `${Number(order.discount).toLocaleString("en-PH", {
                              style: "currency",
                              currency: "PHP",
                            })} (${order.discount_type || "N/A"})`
                          : "—"}
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        <span className="px-2 py-1 rounded-full bg-gray-100 text-xs font-medium">
                          {order.payment_method}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-right text-sm sm:text-base font-bold text-gray-900 tabular-nums">
                        {Number(order.total).toLocaleString("en-PH", {
                          style: "currency",
                          currency: "PHP",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SalesPage() {
  return (
    <ProtectedRoute>
      <Sales />
    </ProtectedRoute>
  );
}
