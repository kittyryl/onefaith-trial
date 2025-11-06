"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/auth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import Card from "@/components/ui/Card";
import ManagerOnlyRoute from "@/components/ManagerOnlyRoute";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

interface PopularService {
  service_name: string;
  category: string;
  times_ordered: number;
  total_quantity: number;
  total_revenue: string;
  avg_price: string;
}

interface CancellationStats {
  service_name: string;
  times_cancelled: number;
  revenue_lost: string;
  common_reasons: string;
}

interface ServiceByVehicle {
  vehicle_type: string;
  service_name: string;
  times_ordered: number;
  revenue: string;
}

interface RevenuePoint {
  date: string;
  revenue: number;
}

interface CoffeeTopProduct {
  product_name: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
}

function ReportsPage() {
  const [popularServices, setPopularServices] = useState<PopularService[]>([]);
  const [cancellations, setCancellations] = useState<CancellationStats[]>([]);
  const [servicesByVehicle, setServicesByVehicle] = useState<
    ServiceByVehicle[]
  >([]);
  const [carwashRevenue, setCarwashRevenue] = useState<RevenuePoint[]>([]);

  // Coffee analytics state
  const [coffeeTopProducts, setCoffeeTopProducts] = useState<CoffeeTopProduct[]>(
    []
  );
  const [coffeeRevenue, setCoffeeRevenue] = useState<RevenuePoint[]>([]);

  const [activeTab, setActiveTab] = useState<"carwash" | "coffee">(
    "carwash"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch all reports in parallel
      const [
        popularRes,
        cancellationsRes,
        vehicleRes,
        carwashRevenueRes,
        coffeeTopRes,
        coffeeRevenueRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/reports/carwash/popular-services`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/reports/carwash/cancellations`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/reports/carwash/services-by-vehicle`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/reports/carwash/revenue-trends`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/reports/coffee/top-products`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/reports/coffee/revenue-trends`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (popularRes.ok) {
        const data = await popularRes.json();
        setPopularServices(data);
      }
      if (cancellationsRes.ok) {
        const data = await cancellationsRes.json();
        setCancellations(data);
      }
      if (vehicleRes.ok) {
        const data = await vehicleRes.json();
        setServicesByVehicle(data);
      }
      if (carwashRevenueRes.ok) {
        const data: RevenuePoint[] = await carwashRevenueRes.json();
        setCarwashRevenue(data);
      }
      if (coffeeTopRes.ok) {
        const data: CoffeeTopProduct[] = await coffeeTopRes.json();
        setCoffeeTopProducts(data);
      }
      if (coffeeRevenueRes.ok) {
        const data: RevenuePoint[] = await coffeeRevenueRes.json();
        setCoffeeRevenue(data);
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Reports & Analytics</h1>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <nav className="flex gap-4">
          <button
            className={`px-4 py-2 -mb-px border-b-2 ${
              activeTab === "carwash"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("carwash")}
          >
            Carwash
          </button>
          <button
            className={`px-4 py-2 -mb-px border-b-2 ${
              activeTab === "coffee"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("coffee")}
          >
            Coffee
          </button>
        </nav>
      </div>

      {activeTab === "carwash" && (
        <div className="space-y-6">
          {/* Revenue trend line chart */}
          <Card title="Carwash Revenue (Last 30 days)">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={carwashRevenue} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `₱${v}`} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => `₱${Number(value).toFixed(2)}`}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Popular Services - add a small bar chart + table */}
          <Card title="Most Popular Services">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={popularServices.map((s) => ({
                      name: s.service_name,
                      revenue: Number(s.total_revenue),
                      orders: s.times_ordered,
                    }))}
                    margin={{ left: 8, right: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis tickFormatter={(v) => `₱${v}`} />
                    <Tooltip
                      formatter={(value: number) => `₱${Number(value).toFixed(2)}`}
                    />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Service</th>
                      <th className="px-4 py-2 text-left">Category</th>
                      <th className="px-4 py-2 text-right">Orders</th>
                      <th className="px-4 py-2 text-right">Total Quantity</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                      <th className="px-4 py-2 text-right">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popularServices.map((service, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{service.service_name}</td>
                        <td className="px-4 py-2">{service.category}</td>
                        <td className="px-4 py-2 text-right">
                          {service.times_ordered}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {service.total_quantity}
                        </td>
                        <td className="px-4 py-2 text-right">
                          ₱{Number(service.total_revenue).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          ₱{Number(service.avg_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {popularServices.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Services by Vehicle Type */}
          <Card title="Services by Vehicle Type">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Vehicle Type</th>
                    <th className="px-4 py-2 text-left">Service</th>
                    <th className="px-4 py-2 text-right">Orders</th>
                    <th className="px-4 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {servicesByVehicle.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{item.vehicle_type}</td>
                      <td className="px-4 py-2">{item.service_name}</td>
                      <td className="px-4 py-2 text-right">{item.times_ordered}</td>
                      <td className="px-4 py-2 text-right">
                        ₱{Number(item.revenue).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {servicesByVehicle.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </Card>

          {/* Cancellations */}
          <Card title="Cancellation Analysis">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Service</th>
                    <th className="px-4 py-2 text-right">Cancelled</th>
                    <th className="px-4 py-2 text-right">Revenue Lost</th>
                    <th className="px-4 py-2 text-left">Common Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {cancellations.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{item.service_name}</td>
                      <td className="px-4 py-2 text-right">
                        {item.times_cancelled}
                      </td>
                      <td className="px-4 py-2 text-right">
                        ₱{Number(item.revenue_lost).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {item.common_reasons || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {cancellations.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No cancellations recorded
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "coffee" && (
        <div className="space-y-6">
          {/* Coffee revenue trend */}
          <Card title="Coffee Revenue (Last 30 days)">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={coffeeRevenue} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `₱${v}`} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => `₱${Number(value).toFixed(2)}`}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top products chart + table */}
          <Card title="Top Coffee Products">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coffeeTopProducts} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product_name" hide />
                    <YAxis tickFormatter={(v) => `₱${v}`} />
                    <Tooltip
                      formatter={(value: number) => `₱${Number(value).toFixed(2)}`}
                    />
                    <Bar
                      dataKey="total_revenue"
                      name="Revenue"
                      fill="#f59e0b"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-left">Category</th>
                      <th className="px-4 py-2 text-right">Quantity</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coffeeTopProducts.map((p, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{p.product_name}</td>
                        <td className="px-4 py-2">{p.category}</td>
                        <td className="px-4 py-2 text-right">{p.total_quantity}</td>
                        <td className="px-4 py-2 text-right">
                          ₱{Number(p.total_revenue).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {coffeeTopProducts.length === 0 && (
                  <div className="text-center py-4 text-gray-500">No data available</div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ReportsPageWrapper() {
  return (
    <ManagerOnlyRoute>
      <ReportsPage />
    </ManagerOnlyRoute>
  );
}

export default ReportsPageWrapper;
