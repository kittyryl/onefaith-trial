"use client";

import { useState, useEffect } from "react";
import {
  LuLayoutDashboard,
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

  // Nicely formatted revenue (without currency symbol, we render ₱ separately for better styling)
  const formattedRevenue = totalSales.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold flex items-center mb-6 sm:mb-8">
        <LuLayoutDashboard size={28} className="mr-2 sm:mr-3 text-gray-700" />
        Dashboard
      </h1>

      {/* --- Metrics Row --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs sm:text-sm text-gray-500">Total Revenue</p>
          <div className="mt-1 flex items-baseline gap-1 sm:gap-2">
            <span
              className="text-emerald-600 text-lg sm:text-xl lg:text-2xl"
              aria-hidden
            >
              ₱
            </span>
            <span
              className="text-2xl sm:text-3xl lg:text-4xl font-bold tabular-nums tracking-tight whitespace-nowrap"
              title={`₱${formattedRevenue}`}
            >
              {formattedRevenue}
            </span>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center">
          <div className="mr-3 sm:mr-4 flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
            <LuFileText size={22} className="text-gray-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500">Total Orders</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">
              {totalOrders}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center">
          <div className="mr-3 sm:mr-4 flex items-center justify-center w-10 h-10 rounded-full bg-amber-50">
            <LuCoffee size={22} className="text-amber-800" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500">Coffee Orders</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">
              {totalCoffeeOrders}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center">
          <div className="mr-3 sm:mr-4 flex items-center justify-center w-10 h-10 rounded-full bg-blue-50">
            <LuCar size={22} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500">Carwash Orders</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">
              {totalCarwashOrders}
            </p>
          </div>
        </div>
      </div>

      {/* --- WIDGET ROW (Chart and Low Stock) --- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* WIDGET 1: Sales Chart (7 Days) */}
        <div className="xl:col-span-2 bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">
            Sales Trend (Last 7 Days)
          </h2>

          {/* --- THIS IS THE DIV THAT IS FIXED --- */}
          {/* Added h-[300px] to give the container a fixed height */}
          <div className="w-full h-[250px] sm:h-[300px]">
            {formattedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    fontSize={11}
                    tickFormatter={(value: number) =>
                      `₱${value.toLocaleString()}`
                    }
                    width={50}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(220, 220, 220, 0.3)" }}
                    formatter={(value: number, name: string) => [
                      `₱${value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`,
                      name,
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
              <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-gray-500 text-sm sm:text-base px-4 text-center">
                No sales data in the last 7 days to display a chart.
              </div>
            )}
          </div>
        </div>

        {/* WIDGET 2: Low Stock Alerts */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">
            Low Stock Alerts
          </h2>
          <div className="space-y-3 sm:space-y-4 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
            {lowStockItems.length > 0 ? (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <LuTriangleAlert
                      size={20}
                      className="text-red-600 shrink-0 mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                          {item.name}
                        </span>
                        <span className="text-xs sm:text-sm text-red-700 font-medium">
                          {Math.max(
                            item.required_stock - item.current_stock,
                            0
                          )}{" "}
                          short
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-red-700 mt-1">
                        Stock: {item.current_stock} / Required:{" "}
                        {item.required_stock}
                      </p>
                      <div className="mt-2 h-2 w-full bg-red-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{
                            width: `${Math.min(
                              (item.current_stock /
                                Math.max(item.required_stock, 1)) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
                <LuPackage
                  size={20}
                  className="text-green-600 mr-2 sm:mr-3 shrink-0"
                />
                <p className="text-xs sm:text-sm text-green-700">
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
