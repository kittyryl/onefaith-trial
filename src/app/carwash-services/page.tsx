"use client";

import { useState, useEffect } from "react";
import {
  LuCar,
  LuClock,
  LuCheck,
  LuPlay,
  LuX,
  LuRefreshCw,
  LuDownload,
  LuSearch,
  LuEye,
  LuPrinter,
} from "react-icons/lu";
import { toast } from "react-toastify";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAuthHeaders } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

// --- INTERFACES ---
interface ServiceItem {
  service_name: string;
  vehicle: string;
  price: number;
  quantity: number;
}

interface CarwashServiceOrder {
  order_id: string;
  created_at: string;
  items: ServiceItem[];
  total: number;
  payment_method: string;
  status: "queue" | "in_progress" | "completed" | "cancelled";
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  vehicle_type?: string;
  plate_number?: string;
  customer_name?: string;
  customer_phone?: string;
  cancel_reason?: string;
}

type StatusTab = "all" | "queue" | "in_progress" | "completed" | "cancelled";

// --- MAIN COMPONENT ---
function CarwashServices() {
  const [orders, setOrders] = useState<CarwashServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] =
    useState<CarwashServiceOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const reasonOptions = [
    "Customer no-show",
    "Changed mind",
    "Vehicle issue",
    "Scheduling conflict",
    "Other",
  ] as const;
  type ReasonOption = (typeof reasonOptions)[number];
  const [cancelReason, setCancelReason] = useState<ReasonOption | "">("");
  const [cancelNotes, setCancelNotes] = useState<string>("");

  // Fetch orders from backend
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/carwash/services`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch carwash orders");
      }

      const data: CarwashServiceOrder[] = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Could not load carwash services");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter orders by status and search
  const filteredOrders = orders.filter((order) => {
    const matchesTab = activeTab === "all" || order.status === activeTab;
    const matchesSearch =
      order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some((item) =>
        item.service_name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesTab && matchesSearch;
  });

  // Status change handlers
  const handleStartService = async (orderId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/carwash/services/${orderId}/start`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) throw new Error("Failed to start service");

      toast.success("Service started!");
      fetchOrders();
    } catch (error) {
      console.error("Error starting service:", error);
      toast.error("Could not start service");
    }
  };

  const handleCompleteService = async (orderId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/carwash/services/${orderId}/complete`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) throw new Error("Failed to complete service");

      toast.success("Service marked as completed!");
      fetchOrders();
    } catch (error) {
      console.error("Error completing service:", error);
      toast.error("Could not complete service");
    }
  };

  const handleViewDetails = (order: CarwashServiceOrder) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  // Calculate metrics
  const todayOrders = orders.filter((o) => {
    const orderDate = new Date(o.created_at).toDateString();
    const today = new Date().toDateString();
    return orderDate === today;
  });

  const queueCount = todayOrders.filter((o) => o.status === "queue").length;
  const inProgressCount = todayOrders.filter(
    (o) => o.status === "in_progress"
  ).length;
  const completedCount = todayOrders.filter(
    (o) => o.status === "completed"
  ).length;
  const cancelledCount = todayOrders.filter(
    (o) => o.status === "cancelled"
  ).length;

  const avgServiceTime =
    todayOrders
      .filter((o) => o.status === "completed" && o.started_at && o.completed_at)
      .reduce((acc, o) => {
        const start = new Date(o.started_at!).getTime();
        const end = new Date(o.completed_at!).getTime();
        return acc + (end - start) / 1000 / 60; // minutes
      }, 0) / (completedCount || 1);

  // CSV Export
  const exportToCSV = () => {
    if (filteredOrders.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const headers = [
      "Order ID",
      "Date/Time",
      "Vehicle",
      "Plate",
      "Customer Name",
      "Phone",
      "Services",
      "Status",
      "Cancelled At",
      "Cancel Reason",
      "Total",
    ];
    const rows = filteredOrders.map((order) => [
      order.order_id,
      new Date(order.created_at).toLocaleString("en-US"),
      order.vehicle_type || "N/A",
      order.plate_number || "N/A",
      order.customer_name || "N/A",
      order.customer_phone || "N/A",
      `"${order.items
        .map((i) => `${i.service_name} (${i.vehicle})`)
        .join("; ")}"`,
      order.status.replace("_", " ").toUpperCase(),
      order.cancelled_at
        ? new Date(order.cancelled_at).toLocaleString("en-US")
        : "",
      order.cancel_reason ? `"${order.cancel_reason}"` : "",
      Number(order.total).toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `carwash-services-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredOrders.length} service records`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "queue":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "queue":
        return <LuClock className="inline mr-1" size={16} />;
      case "in_progress":
        return <LuPlay className="inline mr-1" size={16} />;
      case "completed":
        return <LuCheck className="inline mr-1" size={16} />;
      case "cancelled":
        return <LuX className="inline mr-1" size={16} />;
      default:
        return null;
    }
  };

  const openCancelModal = (orderId: string) => {
    setCancelOrderId(orderId);
    setCancelReason("");
    setCancelNotes("");
    setShowCancelModal(true);
  };

  const submitCancel = async () => {
    if (!cancelOrderId) return;
    const finalReason =
      cancelReason === "Other" ? cancelNotes.trim() : cancelReason;
    if (!finalReason || finalReason.length === 0) {
      toast.error("Please select a reason or provide notes.");
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE}/api/carwash/services/${cancelOrderId}/cancel`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ reason: finalReason }),
        }
      );
      if (!response.ok) throw new Error("Failed to cancel service");
      setShowCancelModal(false);
      setCancelOrderId(null);
      toast.success("Service cancelled!");
      fetchOrders();
    } catch (error) {
      console.error("Error cancelling service:", error);
      toast.error("Could not cancel service");
    }
  };

  const handleReopenService = async (orderId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/carwash/services/${orderId}/reopen`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error("Failed to reopen service");
      toast.success("Service reopened to queue!");
      fetchOrders();
    } catch (error) {
      console.error("Error reopening service:", error);
      toast.error("Could not reopen service");
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const minutes = Math.floor((end - start) / 1000 / 60);
    return `${minutes} min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-gray-600">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <span className="text-sm">Loading services...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center">
            <LuCar size={28} className="mr-2 md:mr-3 text-blue-600" />
            Carwash Services
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchOrders}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-700 transition-colors shadow-sm"
            >
              <LuRefreshCw size={18} className="mr-2" />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors shadow-sm"
            >
              <LuDownload size={18} className="mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs sm:text-sm text-gray-500">
              Today&apos;s Orders
            </p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">
              {todayOrders.length}
            </p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-yellow-200 shadow-sm">
            <p className="text-xs sm:text-sm text-gray-500">In Queue</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-yellow-600">
              {queueCount}
            </p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-blue-200 shadow-sm">
            <p className="text-xs sm:text-sm text-gray-500">In Progress</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-blue-600">
              {inProgressCount}
            </p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-green-200 shadow-sm">
            <p className="text-xs sm:text-sm text-gray-500">Completed</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-green-600">
              {completedCount}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Avg: {avgServiceTime.toFixed(0)} min
            </p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-red-200 shadow-sm">
            <p className="text-xs sm:text-sm text-gray-500">Cancelled</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-red-600">
              {cancelledCount}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <LuSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by order ID, plate number, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div className="mb-6">
          <div className="inline-flex rounded-lg bg-gray-100 p-1 flex-wrap gap-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "all"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              All Services
            </button>
            <button
              onClick={() => setActiveTab("queue")}
              className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                activeTab === "queue"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <LuClock size={14} className="mr-1.5" />
              Queue ({queueCount})
            </button>
            <button
              onClick={() => setActiveTab("in_progress")}
              className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                activeTab === "in_progress"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <LuPlay size={14} className="mr-1.5" />
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                activeTab === "completed"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <LuCheck size={14} className="mr-1.5" />
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setActiveTab("cancelled")}
              className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                activeTab === "cancelled"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <LuX size={14} className="mr-1.5" />
              Cancelled ({cancelledCount})
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
              <LuCar size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {searchQuery
                  ? "No services match your search"
                  : "No services in this category"}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.order_id}
                className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg font-mono truncate max-w-[220px]">
                          {order.order_id}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {getStatusIcon(order.status)}
                          {order.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Ordered:{" "}
                          {new Date(order.created_at).toLocaleTimeString(
                            "en-US",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </p>
                        {order.status === "in_progress" && order.started_at && (
                          <p className="text-sm text-blue-600 font-medium">
                            Duration: {formatDuration(order.started_at)}
                          </p>
                        )}
                        {order.status === "completed" &&
                          order.started_at &&
                          order.completed_at && (
                            <p className="text-sm text-green-600 font-medium">
                              Completed in:{" "}
                              {formatDuration(
                                order.started_at,
                                order.completed_at
                              )}
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="space-y-1 mb-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          <span className="font-medium">
                            {item.service_name}
                          </span>
                          <span className="text-gray-500">
                            {" "}
                            ({item.vehicle}) x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {order.vehicle_type && (
                        <span className="text-gray-600">
                          <strong>Vehicle:</strong> {order.vehicle_type}
                        </span>
                      )}
                      {order.plate_number && (
                        <span className="text-gray-600">
                          <strong>Plate:</strong> {order.plate_number}
                        </span>
                      )}
                      {order.customer_name && (
                        <span className="text-gray-600">
                          <strong>Name:</strong> {order.customer_name}
                        </span>
                      )}
                      {order.customer_phone && (
                        <span className="text-gray-600">
                          <strong>Phone:</strong> {order.customer_phone}
                        </span>
                      )}
                      <span className="text-gray-600">
                        <strong>Total:</strong>{" "}
                        {Number(order.total).toLocaleString("en-PH", {
                          style: "currency",
                          currency: "PHP",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
                    {order.status === "queue" && (
                      <button
                        onClick={() => handleStartService(order.order_id)}
                        className="flex-1 lg:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        <LuPlay size={16} className="mr-1.5" />
                        Start Service
                      </button>
                    )}
                    {order.status === "in_progress" && (
                      <button
                        onClick={() => handleCompleteService(order.order_id)}
                        className="flex-1 lg:flex-none bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                      >
                        <LuCheck size={16} className="mr-1.5" />
                        Mark Completed
                      </button>
                    )}
                    {(order.status === "queue" ||
                      order.status === "in_progress") && (
                      <button
                        onClick={() => openCancelModal(order.order_id)}
                        className="flex-1 lg:flex-none bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
                      >
                        <LuX size={16} className="mr-1.5" />
                        Cancel
                      </button>
                    )}
                    {order.status === "cancelled" && (
                      <button
                        onClick={() => handleReopenService(order.order_id)}
                        className="flex-1 lg:flex-none bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors flex items-center justify-center"
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      onClick={() => handleViewDetails(order)}
                      className="flex-1 lg:flex-none bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
                    >
                      <LuEye size={16} className="mr-1.5" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Order Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <LuX size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-mono font-bold">{selectedOrder.order_id}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                    selectedOrder.status
                  )}`}
                >
                  {getStatusIcon(selectedOrder.status)}
                  {selectedOrder.status.replace("_", " ").toUpperCase()}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-500">Services</p>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1">
                    <span>
                      {item.service_name} ({item.vehicle}) x{item.quantity}
                    </span>
                    <span className="font-semibold">
                      {Number(item.price * item.quantity).toLocaleString(
                        "en-PH",
                        { style: "currency", currency: "PHP" }
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {selectedOrder.vehicle_type && (
                <div>
                  <p className="text-sm text-gray-500">Vehicle Type</p>
                  <p className="font-medium">{selectedOrder.vehicle_type}</p>
                </div>
              )}

              {selectedOrder.plate_number && (
                <div>
                  <p className="text-sm text-gray-500">Plate Number</p>
                  <p className="font-medium">{selectedOrder.plate_number}</p>
                </div>
              )}

              {selectedOrder.customer_name && (
                <div>
                  <p className="text-sm text-gray-500">Customer Name</p>
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                </div>
              )}

              {selectedOrder.customer_phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedOrder.customer_phone}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="font-medium">{selectedOrder.payment_method}</p>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>
                    {Number(selectedOrder.total).toLocaleString("en-PH", {
                      style: "currency",
                      currency: "PHP",
                    })}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  Ordered:{" "}
                  {new Date(selectedOrder.created_at).toLocaleString("en-US")}
                </p>
                {selectedOrder.started_at && (
                  <p>
                    Started:{" "}
                    {new Date(selectedOrder.started_at).toLocaleString("en-US")}
                  </p>
                )}
                {selectedOrder.completed_at && (
                  <p>
                    Completed:{" "}
                    {new Date(selectedOrder.completed_at).toLocaleString(
                      "en-US"
                    )}
                  </p>
                )}
                {selectedOrder.cancelled_at && (
                  <p>
                    Cancelled:{" "}
                    {new Date(selectedOrder.cancelled_at).toLocaleString(
                      "en-US"
                    )}
                  </p>
                )}
              </div>

              {selectedOrder.cancel_reason && (
                <div>
                  <p className="text-sm text-gray-500">Cancel Reason</p>
                  <p className="font-medium">{selectedOrder.cancel_reason}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  toast.info("Print functionality coming soon");
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <LuPrinter size={16} className="mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Cancel Service</h2>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <LuX size={22} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) =>
                    setCancelReason(e.target.value as ReasonOption)
                  }
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a reason...</option>
                  {reasonOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              {cancelReason === "Other" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (required)
                  </label>
                  <textarea
                    value={cancelNotes}
                    onChange={(e) => setCancelNotes(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Provide details..."
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={submitCancel}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CarwashServicesPage() {
  return (
    <ProtectedRoute>
      <CarwashServices />
    </ProtectedRoute>
  );
}
