"use client";

import { useState, useEffect } from "react";
import {
  LuFileText,
  LuDownload,
  LuDollarSign,
  LuCoffee,
  LuCar,
  LuCalendar,
  LuFilter,
} from "react-icons/lu";
import { toast } from "react-toastify";

// --- INTERFACES ---
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

// --- MAIN PAGE COMPONENT ---
export default function SalesPage() {
  const [salesData, setSalesData] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // --- State for filters ---
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [businessUnit, setBusinessUnit] = useState("all");

  // --- Data Fetching ---
  const fetchSalesData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (businessUnit) params.append("businessUnit", businessUnit);

      const queryString = params.toString();

      const response = await fetch(
        `http://192.168.1.4:5000/api/reports/summary?${queryString}`
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

  useEffect(() => {
    fetchSalesData();
  }, []);

  const handleFilter = () => {
    fetchSalesData();
  };

  // --- Calculations ---
  const totalSales = salesData.reduce(
    (sum, order) => sum + Number(order.total),
    0
  );
  const totalOrders = salesData.length;

  return (
    <div className="p-8">
      {/* Header and Title */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <LuFileText size={32} className="mr-3 text-gray-700" />
          Sales Reports
        </h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors">
          <LuDownload size={18} className="mr-2" />
          Export Report
        </button>
      </div>

      {/* --- Filter Bar --- */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-8 flex flex-wrap items-center gap-4">
        {/* Date Range */}
        <div className="flex items-center space-x-2">
          <LuCalendar size={20} className="text-gray-500" />
          <label className="text-sm font-medium text-gray-700">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg text-sm"
          />
          <label className="text-sm font-medium text-gray-700">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Business Unit */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Business:</label>
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

        {/* Filter Button */}
        <button
          onClick={handleFilter}
          className="bg-amber-800 text-white px-5 py-2 rounded-lg flex items-center hover:bg-amber-700 transition-colors"
        >
          <LuFilter size={18} className="mr-2" />
          Filter
        </button>
      </div>

      {/* --- Metrics Row --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
          <LuDollarSign size={40} className="text-green-600 mr-4" />
          <div>
            <p className="text-sm text-gray-500">Total Revenue (Filtered)</p>
            <p className="text-2xl font-bold mt-1">P{totalSales.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
          <LuFileText size={40} className="text-gray-600 mr-4" />
          <div>
            <p className="text-sm text-gray-500">Total Orders (Filtered)</p>
            <p className="text-2xl font-bold mt-1">{totalOrders}</p>
          </div>
        </div>
      </div>

      {/* --- Main Sales Table --- */}
      <h2 className="text-2xl font-semibold mb-4">Transaction History</h2>
      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        {loading ? (
          <p className="text-center py-10 text-gray-500">
            Fetching sales data...
          </p>
        ) : salesData.length === 0 ? (
          <p className="text-center py-10 text-gray-500">
            No sales records found for the selected filters.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesData.map((order) => (
                <tr key={order.order_id}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.order_id.split("-")[0]}...
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleString("en-US", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
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
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {order.items_summary.map((item, index) => (
                      <div key={index} className="text-xs">
                        {item.item_type}{" "}
                        {item.details?.option && `(${item.details.option})`}
                        {item.details?.vehicle && `(${item.details.vehicle})`}
                        <span className="text-gray-500"> x{item.quantity}</span>
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600">
                    {Number(order.discount) > 0
                      ? `-P${Number(order.discount).toFixed(2)} (${
                          order.discount_type || "N/A"
                        })`
                      : "N/A"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.payment_method}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-base font-bold text-gray-900">
                    P{Number(order.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
