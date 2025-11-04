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
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

// Types
interface SalesSummary {
  order_id: string;
  total: string;
  items_summary: {
    business_unit: "Coffee" | "Carwash";
  }[];
}

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

interface CarwashService {
  id: number;
  order_id: string;
  status: string;
  vehicle_type: string | null;
  plate_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total: string;
  created_at: string;
  items: {
    service_name: string;
    vehicle: string;
    price: string;
    quantity: number;
  }[];
}

// Dashboard
export default function DashboardPage() {
  const [summaryData, setSummaryData] = useState<SalesSummary[]>([]);
  const [chartData, setChartData] = useState<SalesByBusinessByDay[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);
  const [inProgressServices, setInProgressServices] = useState<
    CarwashService[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

      // Fetch in parallel
      const [summaryRes, chartRes, ingredientsRes, carwashRes] =
        await Promise.all([
          fetch(`${API_URL}/api/reports/summary`),
          fetch(`${API_URL}/api/reports/sales-by-business-by-day`),
          fetch(`${API_URL}/api/ingredients`),
          fetch(`${API_URL}/api/carwash/services`),
        ]);

      if (!summaryRes.ok) throw new Error("Failed to fetch sales summary.");
      if (!chartRes.ok) throw new Error("Failed to fetch chart data.");
      if (!ingredientsRes.ok)
        throw new Error("Failed to fetch inventory data.");
      if (!carwashRes.ok) throw new Error("Failed to fetch carwash services.");

      const summary: SalesSummary[] = await summaryRes.json();
      const chart: SalesByBusinessByDay[] = await chartRes.json();
      const ingredients: Ingredient[] = await ingredientsRes.json();
      const carwashServices: CarwashService[] = await carwashRes.json();

      setSummaryData(summary);
      setChartData(chart);

      // Low stock
      setLowStockItems(
        ingredients.filter((item) => item.current_stock < item.required_stock)
      );

      // Carwash in-progress
      setInProgressServices(
        carwashServices.filter((service) => service.status === "in_progress")
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

  // Derived metrics
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

  // Chart series
  const formattedChartData = chartData.map((item) => ({
    date: format(parseISO(item.date), "MMM d"),
    Coffee: Number(item.coffee_sales),
    Carwash: Number(item.carwash_sales),
  }));

  // Formatted revenue total
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

      {/* Metrics */}
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

      {/* Sales + Low Stock */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Sales chart (7 days) */}
        <div className="xl:col-span-2 bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">
            Sales Trend (Last 7 Days)
          </h2>

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
                    stackId="a"
                    fill="#c08400"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Carwash"
                    stackId="a"
                    fill="#3b82f6"
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

        {/* Low stock alerts */}
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

      {/* In-progress services */}
      <div className="mt-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
            <LuCar size={24} className="mr-2 text-blue-600" />
            In Progress Services
          </h2>
          <div className="space-y-3 sm:space-y-4 max-h-[400px] overflow-y-auto">
            {inProgressServices.length > 0 ? (
              inProgressServices.map((service, index) => (
                <div
                  key={`service-${service.id}-${service.order_id}-${index}`}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-900">
                          {service.order_id}
                        </span>
                        {service.plate_number && (
                          <span className="px-2 py-0.5 bg-gray-700 text-white text-xs font-mono rounded">
                            {service.plate_number}
                          </span>
                        )}
                      </div>
                      {service.customer_name && (
                        <p className="text-sm text-gray-700 mb-1">
                          <span className="font-medium">Customer:</span>{" "}
                          {service.customer_name}
                        </p>
                      )}
                      <div className="text-sm text-gray-600 space-y-1">
                        {service.items.map((item, idx) => (
                          <div key={`${service.id}-item-${idx}`}>
                            • {item.service_name} ({item.vehicle}) x
                            {item.quantity}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold text-blue-700">
                        ₱
                        {Number(service.total).toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(service.created_at).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center p-8 text-gray-500">
                <LuCar size={24} className="mr-2" />
                <p className="text-sm sm:text-base">
                  No services currently in progress
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
