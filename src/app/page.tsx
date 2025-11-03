"use client";

import { useState, useEffect } from "react";
import {
  LuLayoutDashboard,
  LuDollarSign,
  LuCoffee,
  LuCar,
  LuFileText,
  LuTriangleAlert,
  LuPackage,
} from "react-icons/lu";
import { toast } from "react-toastify";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend, // Import Legend
} from "recharts";
import { format, parseISO } from "date-fns";

// --- INTERFACES ---
interface SalesSummary {
  order_id: string;
  total: string;
  items_summary: {
    business_unit: "Coffee" | "Carwash";
  }[];
}

// NEW interface for our stacked chart data
interface SalesByBusinessByDay {
  date: string;
  coffee_sales: string;
  carwash_sales: string;
}

interface Ingredient {
  id: number;
  name: string;
  category: string;
  current_stock: number;
  required_stock: number;
  unit_of_measure: string;
}

// --- MAIN PAGE COMPONENT ---
export default function DashboardPage() {
  const [summaryData, setSummaryData] = useState<SalesSummary[]>([]);
  const [chartData, setChartData] = useState<SalesByBusinessByDay[]>([]); // Updated state
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Data Fetching ---
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // *** REMEMBER TO USE YOUR LAPTOP'S IP ADDRESS ***
      // Example: "http://192.168.1.10:5000"
      const API_URL = "http://192.168.1.4:5000";

      // Fetch all 3 data points in parallel
      const [summaryRes, chartRes, ingredientsRes] = await Promise.all([
        fetch(`${API_URL}/api/reports/summary`),
        // UPDATED: Fetch from the new endpoint
        fetch(`${API_URL}/api/reports/sales-by-business-by-day`),
        fetch(`${API_URL}/api/ingredients`), // Fetches ingredients with stock
      ]);

      if (!summaryRes.ok) throw new Error("Failed to fetch sales summary.");
      if (!chartRes.ok) throw new Error("Failed to fetch chart data.");
      if (!ingredientsRes.ok)
        throw new Error("Failed to fetch inventory data.");

      const summary: SalesSummary[] = await summaryRes.json();
      const chart: SalesByBusinessByDay[] = await chartRes.json(); // Updated data type
      const ingredients: Ingredient[] = await ingredientsRes.json();

      setSummaryData(summary);
      setChartData(chart); // Set the new chart data

      // Filter for low stock items
      setLowStockItems(
        ingredients.filter((item) => item.current_stock < item.required_stock)
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not load dashboard: ${message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- Calculations ---
  const totalSales = summaryData.reduce(
    (sum, order) => sum + Number(order.total),
    0
  );
  const totalOrders = summaryData.length;
  const totalCoffeeOrders = summaryData.filter(
    (order) => order.items_summary[0]?.business_unit === "Coffee"
  ).length;
  const totalCarwashOrders = summaryData.filter(
    (order) => order.items_summary[0]?.business_unit === "Carwash"
  ).length;

  // UPDATED: Format date and convert both sales figures to numbers
  const formattedChartData = chartData.map((item) => ({
    date: format(parseISO(item.date), "MMM d"),
    Coffee: Number(item.coffee_sales),
    Carwash: Number(item.carwash_sales),
  }));

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <h1 className="text-3xl font-bold flex items-center mb-8">
        <LuLayoutDashboard size={32} className="mr-3 text-gray-700" />
        Dashboard
      </h1>

      {/* --- Metrics Row --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
          <LuDollarSign size={40} className="text-green-600 mr-4" />
          <div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-3xl font-bold mt-1">P{totalSales.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
          <LuFileText size={40} className="text-gray-600 mr-4" />
          <div>
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-3xl font-bold mt-1">{totalOrders}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
          <LuCoffee size={40} className="text-amber-800 mr-4" />
          <div>
            <p className="text-sm text-gray-500">Coffee Orders</p>
            <p className="text-3xl font-bold mt-1">{totalCoffeeOrders}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
          <LuCar size={40} className="text-blue-600 mr-4" />
          <div>
            <p className="text-sm text-gray-500">Carwash Orders</p>
            <p className="text-3xl font-bold mt-1">{totalCarwashOrders}</p>
          </div>
        </div>
      </div>

      {/* --- WIDGET ROW (Chart and Low Stock) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WIDGET 1: Sales Chart (7 Days) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Sales Trend (Last 7 Days)
          </h2>

          {/* --- THIS IS THE DIV THAT IS FIXED --- */}
          {/* Added h-[300px] to give the container a fixed height */}
          <div className="w-full h-[300px]">
            {formattedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    fontSize={12}
                    tickFormatter={(value) => `P${value}`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(220, 220, 220, 0.3)" }}
                    formatter={(value: number, name: string) => [
                      `P${value.toFixed(2)}`,
                      name, // Shows "Coffee" or "Carwash"
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="Coffee"
                    stackId="a" // This groups them
                    fill="#c08400" // Amber color
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Carwash"
                    stackId="a" // This groups them
                    fill="#3b82f6" // Blue color
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No sales data in the last 7 days to display a chart.
              </div>
            )}
          </div>
        </div>

        {/* WIDGET 2: Low Stock Alerts */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Low Stock Alerts</h2>
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {lowStockItems.length > 0 ? (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <LuTriangleAlert size={24} className="text-red-600 mr-3" />
                  <div>
                    <span className="font-semibold text-gray-800">
                      {item.name}
                    </span>
                    <p className="text-sm text-red-600">
                      Stock: **{item.current_stock}** (Required:{" "}
                      {item.required_stock})
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <LuPackage size={24} className="text-green-600 mr-3" />
                <p className="text-sm text-green-700">
                  All ingredient stock levels are OK.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
