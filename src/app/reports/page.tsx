"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

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

export default function ReportsPage() {
  const [popularServices, setPopularServices] = useState<PopularService[]>([]);
  const [cancellations, setCancellations] = useState<CancellationStats[]>([]);
  const [servicesByVehicle, setServicesByVehicle] = useState<ServiceByVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch all reports in parallel
      const [popularRes, cancellationsRes, vehicleRes] = await Promise.all([
        fetch(`${API_BASE}/api/reports/carwash/popular-services`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/reports/carwash/cancellations`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/reports/carwash/services-by-vehicle`, {
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
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Carwash Analytics</h1>

      {/* Popular Services */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Most Popular Services</h2>
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
                  <td className="px-4 py-2 text-right">{service.times_ordered}</td>
                  <td className="px-4 py-2 text-right">{service.total_quantity}</td>
                  <td className="px-4 py-2 text-right">₱{Number(service.total_revenue).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">₱{Number(service.avg_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {popularServices.length === 0 && (
            <div className="text-center py-4 text-gray-500">No data available</div>
          )}
        </div>
      </div>

      {/* Services by Vehicle Type */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Services by Vehicle Type</h2>
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
                  <td className="px-4 py-2 text-right">₱{Number(item.revenue).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {servicesByVehicle.length === 0 && (
            <div className="text-center py-4 text-gray-500">No data available</div>
          )}
        </div>
      </div>

      {/* Cancellations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Cancellation Analysis</h2>
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
                  <td className="px-4 py-2 text-right">{item.times_cancelled}</td>
                  <td className="px-4 py-2 text-right">₱{Number(item.revenue_lost).toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{item.common_reasons || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {cancellations.length === 0 && (
            <div className="text-center py-4 text-gray-500">No cancellations recorded</div>
          )}
        </div>
      </div>
    </div>
  );
}
