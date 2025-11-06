"use client";

import { useCallback, useState, useEffect } from "react";
import { LuCar, LuX, LuTrash2, LuPrinter } from "react-icons/lu";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAuthHeaders } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

// Types

interface ServicePrice {
  vehicle_type: string;
  price: number;
}

interface CarwashService {
  id: number;
  name: string;
  category: string;
  description: string;
  prices: ServicePrice[];
}

interface CarwashCartItem {
  cartId: string;
  serviceId: string;
  serviceName: string;
  vehicle: string;
  price: number;
  quantity: number;
}

interface CarwashOrderDetails {
  orderId: string;
  items: CarwashCartItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment: "Cash" | "Gcash";
  cashTendered: number | null;
  changeDue: number | null;
  discount_type: string | null;
  order_type: null;
}

// Modals

// -- Vehicle Selection Modal --
interface VehicleSelectionModalProps {
  service: CarwashService;
  onClose: () => void;
  onSelect: (priceInfo: ServicePrice) => void;
}

function VehicleSelectionModal({
  service,
  onClose,
  onSelect,
}: VehicleSelectionModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">{service.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            <LuX size={24} />
          </button>
        </div>
        <p className="mb-4 text-gray-600">Please select a vehicle type:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
          {service.prices.map((priceOption) => (
            <button
              key={priceOption.vehicle_type}
              onClick={() => onSelect(priceOption)}
              className="p-4 rounded-lg border text-left cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <span className="block font-semibold text-lg">
                {priceOption.vehicle_type}
              </span>
              <span className="block text-gray-800 text-base">
                P{priceOption.price.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// -- Customer Details Modal --
interface CustomerDetailsModalProps {
  onClose: () => void;
  onSubmit: (details: {
    customerName: string;
    customerPhone: string;
    plateNumber: string;
  }) => void;
  initialName: string;
  initialPhone: string;
  initialPlate: string;
}

function CustomerDetailsModal({
  onClose,
  onSubmit,
  initialName,
  initialPhone,
  initialPlate,
}: CustomerDetailsModalProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [plate, setPlate] = useState(initialPlate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ customerName: name, customerPhone: phone, plateNumber: plate });
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Customer Details</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800"
            >
              <LuX size={24} />
            </button>
          </div>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                required
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 09XXXXXXXXX"
                required
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Plate Number <span className="text-red-500">*</span>
              </label>
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="e.g. ABC1234"
                required
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-lg font-bold text-lg cursor-pointer transition-colors"
          >
            Continue to Payment
          </button>
        </form>
      </div>
    </div>
  );
}

// -- Payment Modal (Numpad) --
interface PaymentModalProps {
  totalDue: number;
  onClose: () => void;
  onSubmit: (cashTendered: number) => void;
  cashTendered: string;
  setCashTendered: (value: string) => void;
  isSubmitting: boolean;
}

function PaymentModal({
  totalDue,
  onClose,
  onSubmit,
  cashTendered,
  setCashTendered,
  isSubmitting,
}: PaymentModalProps) {
  const numpadKeys = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "00",
    "0",
    "C",
  ];

  const handleNumpadClick = (value: string) => {
    if (value === "C") {
      setCashTendered("");
    } else if (cashTendered.length < 10) {
      if ((value === "0" || value === "00") && cashTendered === "") return;
      setCashTendered(cashTendered + value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cashAmount = parseFloat(cashTendered);
    if (isNaN(cashAmount) || cashTendered === "") {
      toast.error("Please enter a cash amount.");
      return;
    }
    if (cashAmount < totalDue) {
      toast.error("Cash amount is less than the total due.");
      return;
    }
    onSubmit(cashAmount);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Cash Payment</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800"
            >
              <LuX size={24} />
            </button>
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-lg">
              <span>Total Due:</span>
              <span className="font-bold">P{totalDue.toFixed(2)}</span>
            </div>
            <div className="mt-2 p-3 bg-gray-100 rounded text-right text-3xl font-mono">
              {cashTendered ? (
                `P${cashTendered}`
              ) : (
                <span className="text-gray-400">P0.00</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {numpadKeys.map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => handleNumpadClick(key)}
                className="p-4 rounded-lg text-xl font-bold bg-gray-200 hover:bg-gray-300 cursor-pointer"
              >
                {key}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-500 text-white p-3 rounded-lg font-bold text-lg cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Processing..." : "Confirm Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}

// -- Receipt Modal --
interface ReceiptModalProps {
  order: CarwashOrderDetails;
  onClose: () => void;
}

function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <LuPrinter size={48} className="mx-auto text-gray-700" />
          <h2 className="text-2xl font-bold mt-4">Order Confirmed</h2>
          <p className="text-gray-500 text-sm">Order ID: {order.orderId}</p>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border-t border-b py-4 border-dashed">
          {order.items.map((item) => (
            <div key={item.cartId} className="flex justify-between">
              <div>
                <span className="font-semibold">{item.serviceName}</span>
                <span className="text-gray-500 text-sm"> ({item.vehicle})</span>
                <span className="block text-gray-500 text-sm">
                  {item.quantity} x P{item.price.toFixed(2)}
                </span>
              </div>
              <span className="font-semibold">
                P{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">P{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Discount</span>
            <span className="font-medium text-red-500">
              - P{order.discount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total Due</span>
            <span>P{order.total.toFixed(2)}</span>
          </div>

          {order.payment === "Cash" && (
            <div className="border-t border-dashed pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Cash Tendered</span>
                <span className="font-medium">
                  P{order.cashTendered?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Change Due</span>
                <span>P{order.changeDue?.toFixed(2)}</span>
              </div>
            </div>
          )}
          <div className="flex justify-between text-sm mt-4">
            <span className="text-gray-600">Payment</span>
            <span className="font-medium">{order.payment}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-emerald-600 text-white p-3 rounded-lg font-bold cursor-pointer"
        >
          Start New Order
        </button>
      </div>
    </div>
  );
}

// POS
function CarwashPOS() {
  const [allServices, setAllServices] = useState<CarwashService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [cart, setCart] = useState<CarwashCartItem[]>([]);
  const [selectedService, setSelectedService] = useState<CarwashService | null>(
    null
  );
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  // Customer details
  const [plateNumber, setPlateNumber] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Gcash" | null>(
    null
  );
  const [isCustomerDetailsModalOpen, setIsCustomerDetailsModalOpen] =
    useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [cashTendered, setCashTendered] = useState<string>("");
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] =
    useState<CarwashOrderDetails | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] =
    useState<boolean>(false);

  // Fetch services from API
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const res = await fetch(`${API_BASE}/api/carwash-catalog/services`);
        if (!res.ok) throw new Error("Failed to fetch services");
        const data: CarwashService[] = await res.json();
        setAllServices(data);
      } catch (error) {
        console.error("Error fetching services:", error);
        toast.error("Could not load services. Please refresh the page.");
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, []);

  // --- Cart Handlers ---
  const handleSelectServiceWithVehicle = (
    service: CarwashService,
    priceInfo: ServicePrice
  ) => {
    if (!currentOrderId) {
      setCurrentOrderId(`ORD-${uuidv4().slice(0, 8)}`);
    }
    const existingItem = cart.find(
      (item) =>
        item.serviceId === service.id.toString() &&
        item.vehicle === priceInfo.vehicle_type
    );

    if (existingItem) {
      // Service already in cart - don't allow duplicates
      toast.info(
        `${service.name} for ${priceInfo.vehicle_type} is already in cart`
      );
    } else {
      const newItem: CarwashCartItem = {
        cartId: uuidv4(),
        serviceId: service.id.toString(),
        serviceName: service.name,
        vehicle: priceInfo.vehicle_type,
        price: priceInfo.price,
        quantity: 1,
      };
      setCart((prevCart) => [...prevCart, newItem]);
    }
    setSelectedService(null);
  };

  const handleRemoveItem = (cartId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
    setPaymentMethod(null);
    setPlateNumber("");
    setCustomerName("");
    setCustomerPhone("");
  };

  // --- Calculation ---
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const total = subtotal;

  // Upsert service ticket
  const upsertCarwashServiceTicket = useCallback(
    async (status: "queue" | "in_progress" | "completed" = "queue") => {
      if (!currentOrderId || cart.length === 0) return;

      const serviceItems = cart.map((it) => ({
        service_name: it.serviceName,
        vehicle: it.vehicle,
        price: it.price,
        quantity: it.quantity,
      }));

      const inferredVehicleType = cart[0]?.vehicle || null;

      try {
        await fetch(`${API_BASE}/api/carwash/services`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            order_id: currentOrderId,
            status,
            vehicle_type: inferredVehicleType,
            plate_number: plateNumber || null,
            customer_name: customerName || null,
            customer_phone: customerPhone || null,
            payment_method: null,
            total,
            items: serviceItems,
          }),
        });
      } catch (e) {
        // Silent fail for now to not block POS flow
        console.error("Failed to upsert carwash service ticket:", e);
      }
    },
    [currentOrderId, cart, total, plateNumber, customerName, customerPhone]
  );

  // Removed auto-update of queue ticket - only create after payment

  // --- API Submission ---
  const submitOrderToAPI = async (orderDetails: CarwashOrderDetails) => {
    const payload = {
      orderDetails: orderDetails,
      businessUnit: "Carwash", // Identify the source as Carwash
    };

    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Server responded with an error.");
      const result = await response.json();
      toast.success(`Order ${result.orderId} Saved!`);
      return result;
    } catch (error) {
      console.error("API Submission Error:", error);
      toast.error("Failed to save order to database.");
      return null;
    }
  };

  // Link a carwash service ticket (text order_id) to the DB order id (UUID)
  const linkTicketToOrder = useCallback(
    async (ticketId: string, dbOrderId: string) => {
      try {
        await fetch(
          `${API_BASE}/api/carwash/services/${encodeURIComponent(
            ticketId
          )}/link-order`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ order_id: dbOrderId }),
          }
        );
      } catch (e) {
        console.error("Failed to link carwash ticket to order:", e);
      }
    },
    []
  );

  // Payment flow
  const handleProceedToPayment = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }
    if (!paymentMethod) {
      toast.error("Please select a Payment Method.");
      return;
    }
    if (!currentOrderId) {
      setCurrentOrderId(`ORD-${uuidv4().slice(0, 8)}`);
    }
    // Open customer details modal first
    setIsCustomerDetailsModalOpen(true);
  };

  const handleCustomerDetailsSubmit = async (details: {
    customerName: string;
    customerPhone: string;
    plateNumber: string;
  }) => {
    if (isSubmittingPayment) return; // Prevent double submission

    // Update customer details
    setCustomerName(details.customerName);
    setCustomerPhone(details.customerPhone);
    setPlateNumber(details.plateNumber);
    setIsCustomerDetailsModalOpen(false);

    // Proceed with payment
    const baseOrder: CarwashOrderDetails = {
      orderId: currentOrderId || `ORD-${uuidv4().slice(0, 8)}`,
      items: cart,
      subtotal: subtotal,
      discount: 0,
      total: total,
      payment: paymentMethod!,
      discount_type: null,
      cashTendered: null,
      changeDue: null,
      order_type: null,
    };

    if (paymentMethod === "Gcash") {
      setIsSubmittingPayment(true);
      try {
        const submissionResult = await submitOrderToAPI(baseOrder);
        if (submissionResult) {
          // Create carwash service ticket after successful payment
          await upsertCarwashServiceTicket("queue");
          // Link the ticket to the DB order id (optional linkage)
          try {
            await linkTicketToOrder(
              baseOrder.orderId,
              submissionResult.orderId
            );
          } catch {}
          setCompletedOrder(baseOrder);
          setIsReceiptModalOpen(true);
        }
      } finally {
        setIsSubmittingPayment(false);
      }
    } else if (paymentMethod === "Cash") {
      setIsPaymentModalOpen(true);
    }
  };

  const handleCashPaymentSubmit = async (cashAmount: number) => {
    if (isSubmittingPayment) return; // Prevent double submission

    setIsSubmittingPayment(true);
    try {
      if (!currentOrderId) {
        setCurrentOrderId(`ORD-${uuidv4().slice(0, 8)}`);
      }
      const orderDetails: CarwashOrderDetails = {
        orderId: currentOrderId || `ORD-${uuidv4().slice(0, 8)}`,
        items: cart,
        subtotal: subtotal,
        discount: 0,
        total: total,
        payment: "Cash",
        discount_type: null,
        cashTendered: cashAmount,
        changeDue: cashAmount - total,
        order_type: null,
      };
      const submissionResult = await submitOrderToAPI(orderDetails);
      if (submissionResult) {
        // Create carwash service ticket after successful cash payment
        await upsertCarwashServiceTicket("queue");
        // Link the ticket to the DB order id
        try {
          await linkTicketToOrder(
            orderDetails.orderId,
            submissionResult.orderId
          );
        } catch {}
        setCompletedOrder(orderDetails);
        setIsPaymentModalOpen(false);
        setIsReceiptModalOpen(true);
        setCashTendered("");
      }
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleCloseReceipt = () => {
    setIsReceiptModalOpen(false);
    clearCart();
    setCompletedOrder(null);
    setCurrentOrderId(null);
    toast.success("New order started!");
  };

  // --- RENDER ---
  return (
    <div className="flex h-screen bg-linear-to-br from-gray-50 to-gray-100 flex-col lg:flex-row">
      {/* Modals */}
      {selectedService && (
        <VehicleSelectionModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onSelect={(priceInfo) =>
            handleSelectServiceWithVehicle(selectedService, priceInfo)
          }
        />
      )}
      {isCustomerDetailsModalOpen && (
        <CustomerDetailsModal
          onClose={() => setIsCustomerDetailsModalOpen(false)}
          onSubmit={handleCustomerDetailsSubmit}
          initialName={customerName}
          initialPhone={customerPhone}
          initialPlate={plateNumber}
        />
      )}
      {isPaymentModalOpen && (
        <PaymentModal
          totalDue={total}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={handleCashPaymentSubmit}
          cashTendered={cashTendered}
          setCashTendered={setCashTendered}
          isSubmitting={isSubmittingPayment}
        />
      )}
      {isReceiptModalOpen && completedOrder && (
        <ReceiptModal order={completedOrder} onClose={handleCloseReceipt} />
      )}

      {/* Services */}
      <div className="flex-1 min-h-0 p-6 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">
          Carwash Services
        </h1>
        <p className="text-gray-600 mb-6">
          Select services and vehicle types to begin your order
        </p>
        {loadingServices ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <PageLoader />
          </div>
        ) : allServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
            <LuCar size={60} />
            <p className="mt-4">No services available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allServices.map((service) => (
              <div
                key={service.id}
                onClick={() => setSelectedService(service)}
                className="group bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-100 p-6 h-full"
              >
                <div>
                  <span className="text-xs text-blue-600 font-semibold uppercase">
                    {service.category}
                  </span>
                  <h3 className="text-lg font-bold mt-1 mb-2 group-hover:text-blue-600 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {service.description}
                  </p>
                </div>
                <p className="text-lg font-bold text-gray-900 mt-2">
                  ₱
                  {Math.min(
                    ...service.prices.map((p) => p.price)
                  ).toLocaleString()}{" "}
                  - ₱
                  {Math.max(
                    ...service.prices.map((p) => p.price)
                  ).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order */}
      <div className="w-full lg:w-[420px] bg-white p-6 border-t lg:border-l border-gray-200 flex flex-col shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Current Order</h2>
          <button
            onClick={clearCart}
            className="text-sm text-red-500 hover:underline cursor-pointer"
          >
            Clear All
          </button>
        </div>

        {/* Cart */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <LuCar size={60} />
              <p className="mt-4">No services selected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.cartId}
                  className="flex items-center gap-3 bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {item.serviceName}
                    </h4>
                    <p className="text-sm text-gray-500">{item.vehicle}</p>
                    <p className="text-base font-semibold mt-1">
                      ₱{item.price.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.cartId)}
                    className="text-gray-400 hover:text-red-500 cursor-pointer"
                    title="Remove item"
                  >
                    <LuTrash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Details */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Items</span>
            <span className="font-medium">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Subtotal</span>
            <span className="font-medium">
              ₱
              {subtotal.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4 border-2 border-gray-900">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Total
              </span>
              <span className="text-2xl font-bold text-gray-900">
                ₱
                {total.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Payment Method Buttons */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod("Cash")}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  paymentMethod === "Cash"
                    ? "bg-amber-600 text-white shadow-md"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50"
                }`}
              >
                💵 Cash
              </button>
              <button
                onClick={() => setPaymentMethod("Gcash")}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  paymentMethod === "Gcash"
                    ? "bg-amber-600 text-white shadow-md"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50"
                }`}
              >
                📱 GCash
              </button>
            </div>
          </div>

          <button
            onClick={handleProceedToPayment}
            className="w-full bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
            disabled={cart.length === 0}
          >
            {cart.length === 0
              ? "Add Services to Continue"
              : "Proceed to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CarwashPosPage() {
  return (
    <ProtectedRoute>
      <CarwashPOS />
    </ProtectedRoute>
  );
}
