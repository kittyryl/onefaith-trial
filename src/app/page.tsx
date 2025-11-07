"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from "react";
import {
  LuLayoutDashboard,
  LuCoffee,
  LuCar,
  LuFileText,
  LuTriangleAlert,
  LuPackage,
  LuClock,
  LuTrendingUp,
  LuCalendar,
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
import ProtectedRoute from "@/components/ProtectedRoute";
import PageLoader from "@/components/PageLoader";
import { getAuthHeaders } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";

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

interface MyShiftTotals {
  orderCount: number;
  totalSales: number;
  byBusinessUnit: { Coffee: number; Carwash: number };
  byPayment: { Cash: number; Gcash: number };
}

interface MyShiftSummaryResp {
  shift: {
    id: number;
    user_id: number;
    start_time: string;
    end_time: string | null;
    status: 'active' | 'ended';
  } | null;
  totals: MyShiftTotals;
}

interface MyShiftTransaction {
  order_id: string;
  created_at: string;
  total: number | string;
  payment_method: string;
  items: {
    business_unit: "Coffee" | "Carwash";
    item_type: string;
    quantity: number;
    line_total: number | string;
    details: unknown;
  }[];
}

// Dashboard
function Dashboard() {
  const { isManager } = useAuth();
  const [summaryData, setSummaryData] = useState<SalesSummary[]>([]);
  const [chartData, setChartData] = useState<SalesByBusinessByDay[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);
  const [inProgressServices, setInProgressServices] = useState<
    CarwashService[]
  >([]);
  const [myShiftSummary, setMyShiftSummary] = useState<MyShiftSummaryResp | null>(null);
  const [myShiftTransactions, setMyShiftTransactions] = useState<MyShiftTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const API_URL =
        process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
      if (isManager()) {
        // Manager: fetch sales summary and chart as well
        const [summaryRes, chartRes, ingredientsRes, carwashRes] =
          await Promise.all([
            fetch(`${API_URL}/api/reports/summary`, {
              headers: getAuthHeaders(),
            }),
            fetch(`${API_URL}/api/reports/sales-by-business-by-day`, {
              headers: getAuthHeaders(),
            }),
            fetch(`${API_URL}/api/ingredients`, {
              headers: getAuthHeaders(),
            }),
            fetch(`${API_URL}/api/carwash/services`, {
              headers: getAuthHeaders(),
            }),
          ]);

        if (!summaryRes.ok) throw new Error("Failed to fetch sales summary.");
        if (!chartRes.ok) throw new Error("Failed to fetch chart data.");
        if (!ingredientsRes.ok)
          throw new Error("Failed to fetch inventory data.");
        if (!carwashRes.ok)
          throw new Error("Failed to fetch carwash services.");

        const summary: SalesSummary[] = await summaryRes.json();
        const chart: SalesByBusinessByDay[] = await chartRes.json();
        const ingredients: Ingredient[] = await ingredientsRes.json();
        const carwashServices: CarwashService[] = await carwashRes.json();

        setSummaryData(summary);
        setChartData(chart);

        // Low stock
        setLowStockItems(
          ingredients.filter(
            (item) => Number(item.current_stock) < Number(item.required_stock)
          )
        );

        // Carwash in-progress
        setInProgressServices(
          carwashServices.filter((service) => service.status === "in_progress")
        );
      } else {
        // Staff: fetch inventory, carwash services, and my-shift data
        console.log("[Dashboard] Fetching staff data...");
        const [ingredientsRes, carwashRes] = await Promise.all([
          fetch(`${API_URL}/api/ingredients`, {
            headers: getAuthHeaders(),
          }),
          fetch(`${API_URL}/api/carwash/services`, {
            headers: getAuthHeaders(),
          }),
        ]);

        if (!ingredientsRes.ok)
          throw new Error("Failed to fetch inventory data.");
        if (!carwashRes.ok)
          throw new Error("Failed to fetch carwash services.");

        const ingredients: Ingredient[] = await ingredientsRes.json();
        const carwashServices: CarwashService[] = await carwashRes.json();

        // My Shift endpoints (best-effort)
        try {
          const [myShiftSummaryRes, myShiftTxRes] = await Promise.all([
            fetch(`${API_URL}/api/reports/my-shift/summary`, {
              headers: getAuthHeaders(),
            }),
            fetch(`${API_URL}/api/reports/my-shift/transactions?size=5`, {
              headers: getAuthHeaders(),
            }),
          ]);
          if (myShiftSummaryRes.ok) {
            const summaryJson = await myShiftSummaryRes.json();
            console.log("[MyShift] Summary response:", summaryJson);
            setMyShiftSummary(summaryJson);
          } else {
            console.warn("[MyShift] Summary failed:", myShiftSummaryRes.status, await myShiftSummaryRes.text());
            setMyShiftSummary(null);
          }
          if (myShiftTxRes.ok) {
            const txJson = await myShiftTxRes.json();
            console.log("[MyShift] Transactions response:", txJson);
            setMyShiftTransactions(txJson.transactions || []);
          } else {
            console.warn("[MyShift] Transactions failed:", myShiftTxRes.status, await myShiftTxRes.text());
            setMyShiftTransactions([]);
          }
        } catch (e) {
          console.error("My Shift endpoints error:", e);
          setMyShiftSummary(null);
          setMyShiftTransactions([]);
        }

        // Ensure sales data is cleared for staff
        setSummaryData([]);
        setChartData([]);

        // Low stock
        setLowStockItems(
          ingredients.filter(
            (item) => Number(item.current_stock) < Number(item.required_stock)
          )
        );

        // Carwash in-progress
        setInProgressServices(
          carwashServices.filter((service) => service.status === "in_progress")
        );
      }
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

  // Browser notifications for low stock
  useEffect(() => {
    if (lowStockItems.length === 0) return;

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Show notification if permission granted
    if ("Notification" in window && Notification.permission === "granted") {
      const criticalItems = lowStockItems.filter(
        (item) => item.current_stock < item.required_stock * 0.2
      );

      if (criticalItems.length > 0) {
        const itemNames = criticalItems.map((i) => i.name).join(", ");
        new Notification("⚠️ Critical Low Stock Alert", {
          body: `${criticalItems.length} item(s) critically low: ${itemNames}`,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "low-stock",
          requireInteraction: false,
        });
      }
    }
  }, [lowStockItems]);

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

  if (loading)
    return <PageLoader message="Loading Dashboard..." color="amber" />;

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold flex items-center mb-6 sm:mb-8">
        <LuLayoutDashboard size={28} className="mr-2 sm:mr-3 text-gray-700" />
        Dashboard
      </h1>

      {/* Metrics */}
      {isManager() ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <p className="text-xs sm:text-sm text-gray-500 mb-1">
              Total Revenue
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-emerald-600 text-base sm:text-lg shrink-0">
                ₱
              </span>
              <span
                className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums tracking-tight break-all leading-tight"
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
      ) : (
        <>
          <div className="mb-6 sm:mb-8">
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-600">
                Sales metrics are visible to managers.
              </p>
            </div>
          </div>

          <div className="mb-6 sm:mb-8">
            <div className="bg-linear-to-br from-blue-50 to-indigo-50 p-6 sm:p-8 rounded-2xl border border-blue-200 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white p-3 rounded-xl shadow-md">
                    <LuClock size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Shift</h2>
                    <p className="text-sm text-gray-600">
                      {myShiftSummary?.shift ? (
                        <>
                          <LuCalendar className="inline mr-1" size={14} />
                          {new Date(myShiftSummary.shift.start_time).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </>
                      ) : (
                        'No active shift today'
                      )}
                    </p>
                  </div>
                </div>
                {myShiftSummary?.shift && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Status</div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                      myShiftSummary.shift.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {myShiftSummary.shift.status === 'active' ? '● Active' : '● Ended'}
                    </span>
                  </div>
                )}
              </div>

              {myShiftSummary && myShiftSummary.totals && myShiftSummary.totals.orderCount > 0 ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <LuFileText size={18} className="text-gray-500" />
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Orders</p>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{myShiftSummary.totals.orderCount}</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <LuTrendingUp size={18} className="text-emerald-600" />
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Sales</p>
                      </div>
                      <p className="text-2xl font-bold text-emerald-600">
                        ₱{Number(myShiftSummary.totals.totalSales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <LuCoffee size={18} className="text-amber-700" />
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Coffee</p>
                      </div>
                      <p className="text-xl font-bold text-amber-700">
                        ₱{Number(myShiftSummary.totals.byBusinessUnit?.Coffee || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <LuCar size={18} className="text-blue-600" />
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Carwash</p>
                      </div>
                      <p className="text-xl font-bold text-blue-600">
                        ₱{Number(myShiftSummary.totals.byBusinessUnit?.Carwash || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                      Recent Transactions
                    </h3>
                    <div className="space-y-2">
                      {myShiftTransactions.length > 0 ? (
                        myShiftTransactions.map((tx) => (
                          <div key={tx.order_id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-gray-900">#{tx.order_id}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  tx.payment_method === 'Cash' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {tx.payment_method}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                ₱{Number(tx.total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No transactions yet</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <LuFileText size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No transactions yet</p>
                  <p className="text-sm text-gray-500">Start taking orders to see your shift stats!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Sales + Low Stock */}
      {isManager() ? (
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
      ) : (
        <div className="mb-6 sm:mb-8">
          {/* Low stock alerts only for staff */}
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
      )}

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

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
