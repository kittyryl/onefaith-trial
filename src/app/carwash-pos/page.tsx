"use client";

import { useCallback, useState } from "react";
import { LuCar, LuX, LuTrash2, LuPrinter } from "react-icons/lu";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAuthHeaders } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

// Types

interface ServicePrice {
  vehicle: string;
  price: number;
}

interface CarwashService {
  id: string;
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

// Services catalog
const allServices: CarwashService[] = [
  {
    id: "detailed_wash",
    name: "Detailed Wash",
    category: "Basic",
    description:
      "Exterior wash/dry, tire/wheel cleaning, interior cleaning, vacuum, armor all.",
    prices: [
      { vehicle: "Bike", price: 100 },
      { vehicle: "Big Bike", price: 150 },
      { vehicle: "Sedan", price: 200 },
      { vehicle: "CSUV", price: 250 },
      { vehicle: "SUV", price: 300 },
      { vehicle: "Van Pickup", price: 350 },
      { vehicle: "FB Van Grandia", price: 400 },
    ],
  },
  {
    id: "detailed_wash_wax",
    name: "Detailed Wash & Wax",
    category: "Most Popular",
    description: "All Detailed Wash features + professional hand waxing.",
    prices: [
      { vehicle: "Bike", price: 250 },
      { vehicle: "Big Bike", price: 300 },
      { vehicle: "Sedan", price: 500 },
      { vehicle: "CSUV", price: 600 },
      { vehicle: "SUV", price: 700 },
      { vehicle: "Van Pickup", price: 900 },
      { vehicle: "Truck", price: 950 },
    ],
  },
  {
    id: "ceramic_coating",
    name: "Ceramic Coating",
    category: "Advanced",
    description:
      "Ultimate luxury treatment, paint sealant, glass cleaning, deluxe detailing.",
    prices: [
      { vehicle: "Bikes", price: 3000 },
      { vehicle: "Small", price: 12000 },
      { vehicle: "Medium", price: 15000 },
      { vehicle: "Large", price: 18000 },
      { vehicle: "XLarge", price: 21000 },
      { vehicle: "XXLarge", price: 24000 },
    ],
  },
  {
    id: "bac_2_zero",
    name: "Bac-2-Zero",
    category: "Others",
    description: "Interior sanitation service.",
    prices: [
      { vehicle: "S", price: 500 },
      { vehicle: "M", price: 550 },
      { vehicle: "L", price: 600 },
      { vehicle: "XL", price: 650 },
      { vehicle: "XXL", price: 700 },
    ],
  },
  {
    id: "buffing_wax",
    name: "Buffing Wax",
    category: "Others",
    description: "Machine buffing for paint correction.",
    prices: [
      { vehicle: "S", price: 600 },
      { vehicle: "M", price: 700 },
      { vehicle: "L", price: 800 },
      { vehicle: "XL", price: 900 },
      { vehicle: "XXL", price: 1000 },
    ],
  },
  {
    id: "glass_cleaning",
    name: "Glass Cleaning",
    category: "Others",
    description: "Full exterior/interior glass detailing.",
    prices: [
      { vehicle: "S", price: 1250 },
      { vehicle: "M", price: 1400 },
      { vehicle: "L", price: 1700 },
      { vehicle: "XL", price: 1800 },
      { vehicle: "XXL", price: 1950 },
    ],
  },
  {
    id: "hand_wax",
    name: "Hand Wax",
    category: "Others",
    description: "Protective hand waxing service.",
    prices: [
      { vehicle: "S", price: 400 },
      { vehicle: "M", price: 500 },
      { vehicle: "L", price: 600 },
      { vehicle: "XL", price: 700 },
      { vehicle: "XXL", price: 800 },
    ],
  },
];

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
              key={priceOption.vehicle}
              onClick={() => onSelect(priceOption)}
              className="p-4 rounded-lg border text-left cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <span className="block font-semibold text-lg">
                {priceOption.vehicle}
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
}

function PaymentModal({
  totalDue,
  onClose,
  onSubmit,
  cashTendered,
  setCashTendered,
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
            className="w-full bg-green-500 text-white p-3 rounded-lg font-bold text-lg cursor-pointer"
          >
            Confirm Payment
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
  const [discountType, setDiscountType] = useState<
    "Senior" | "PWD" | "Employee" | null
  >(null);
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
        item.serviceId === service.id && item.vehicle === priceInfo.vehicle
    );

    if (existingItem) {
      // Service already in cart - don't allow duplicates
      toast.info(`${service.name} for ${priceInfo.vehicle} is already in cart`);
    } else {
      const newItem: CarwashCartItem = {
        cartId: uuidv4(),
        serviceId: service.id,
        serviceName: service.name,
        vehicle: priceInfo.vehicle,
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
    setDiscountType(null);
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
  const DISCOUNT_RATE = 0.2;
  const discount = discountType ? subtotal * DISCOUNT_RATE : 0;
  const total = subtotal - discount;

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
      discount: discount,
      total: total,
      payment: paymentMethod!,
      discount_type: discountType,
      cashTendered: null,
      changeDue: null,
      order_type: null,
    };

    if (paymentMethod === "Gcash") {
      const submissionResult = await submitOrderToAPI(baseOrder);
      if (submissionResult) {
        // Create carwash service ticket after successful payment
        await upsertCarwashServiceTicket("queue");
        setCompletedOrder(baseOrder);
        setIsReceiptModalOpen(true);
      }
    } else if (paymentMethod === "Cash") {
      setIsPaymentModalOpen(true);
    }
  };

  const handleCashPaymentSubmit = async (cashAmount: number) => {
    if (!currentOrderId) {
      setCurrentOrderId(`ORD-${uuidv4().slice(0, 8)}`);
    }
    const orderDetails: CarwashOrderDetails = {
      orderId: currentOrderId || `ORD-${uuidv4().slice(0, 8)}`,
      items: cart,
      subtotal: subtotal,
      discount: discount,
      total: total,
      payment: "Cash",
      discount_type: discountType,
      cashTendered: cashAmount,
      changeDue: cashAmount - total,
      order_type: null,
    };
    const submissionResult = await submitOrderToAPI(orderDetails);
    if (submissionResult) {
      // Create carwash service ticket after successful cash payment
      await upsertCarwashServiceTicket("queue");
      setCompletedOrder(orderDetails);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      setCashTendered("");
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
          <div className="flex justify-between text-sm mb-4">
            <span className="text-red-600">
              Discount{discountType ? ` (${discountType})` : ""}
            </span>
            <span className="font-medium text-red-600">
              - ₱
              {discount.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* Discount Buttons */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Apply Discount
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["Senior", "PWD", "Employee"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setDiscountType(type)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    discountType === type
                      ? "bg-amber-600 text-white shadow-md"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50"
                  }`}
                >
                  {type}
                </button>
              ))}
              <button
                onClick={() => setDiscountType(null)}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
              >
                Clear
              </button>
            </div>
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
