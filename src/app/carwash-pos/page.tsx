"use client";

import { useState, useEffect } from "react";
import {
  LuCar,
  LuX,
  LuPlus,
  LuMinus,
  LuTrash2,
  LuPrinter,
  LuPencilLine,
} from "react-icons/lu";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid"; // For unique cart IDs

// --- 1. INTERFACES ---

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
  order_type: null; // Carwash doesn't have "Dine in"
}

// --- 2. CARWASH DATA ---
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

// --- 3. MODAL COMPONENTS ---

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

// --- 4. MAIN PAGE COMPONENT ---
export default function CarwashPosPage() {
  const [cart, setCart] = useState<CarwashCartItem[]>([]);
  const [selectedService, setSelectedService] = useState<CarwashService | null>(
    null
  );

  // Payment States
  const [discountType, setDiscountType] = useState<
    "Senior" | "PWD" | "Employee" | null
  >(null);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Gcash" | null>(
    null
  );
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [cashTendered, setCashTendered] = useState<string>("");
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] =
    useState<CarwashOrderDetails | null>(null);

  // --- Cart Handlers ---
  const handleAddToCart = (
    service: CarwashService,
    priceInfo: ServicePrice
  ) => {
    const existingItem = cart.find(
      (item) =>
        item.serviceId === service.id && item.vehicle === priceInfo.vehicle
    );

    if (existingItem) {
      handleIncrementQuantity(existingItem.cartId);
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

  const handleIncrementQuantity = (cartId: string) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.cartId === cartId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const handleDecrementQuantity = (cartId: string) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.cartId === cartId
            ? { ...item, quantity: Math.max(0, item.quantity - 1) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (cartId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountType(null);
    setPaymentMethod(null);
  };

  // --- Calculation ---
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const DISCOUNT_RATE = 0.2;
  const discount = discountType ? subtotal * DISCOUNT_RATE : 0;
  const total = subtotal - discount;

  // --- API Submission ---
  const submitOrderToAPI = async (orderDetails: CarwashOrderDetails) => {
    const payload = {
      orderDetails: {
        ...orderDetails,
        order_type: null, // Ensure order_type is null for carwash
      },
      businessUnit: "Carwash", // Identify the source as Carwash
    };

    try {
      // NOTE: Ensure your IP address is correct
      const response = await fetch("http://192.168.1.4:5000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // --- Payment Flow Handlers ---
  const handleProceedToPayment = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }
    if (!paymentMethod) {
      toast.error("Please select a Payment Method.");
      return;
    }

    const baseOrder: CarwashOrderDetails = {
      orderId: `ORD-${uuidv4().slice(0, 8)}`,
      items: cart,
      subtotal: subtotal,
      discount: discount,
      total: total,
      payment: paymentMethod,
      discount_type: discountType,
      cashTendered: null,
      changeDue: null,
      order_type: null,
    };

    if (paymentMethod === "Gcash") {
      const submissionResult = await submitOrderToAPI(baseOrder);
      if (submissionResult) {
        setCompletedOrder(baseOrder);
        setIsReceiptModalOpen(true);
      }
    } else if (paymentMethod === "Cash") {
      setIsPaymentModalOpen(true);
    }
  };

  const handleCashPaymentSubmit = async (cashAmount: number) => {
    const orderDetails: CarwashOrderDetails = {
      orderId: `ORD-${uuidv4().slice(0, 8)}`,
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
    toast.success("New order started!");
  };

  // --- RENDER ---
  return (
    <div className="flex h-full">
      {/* Modals */}
      {selectedService && (
        <VehicleSelectionModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onSelect={(priceInfo) => handleAddToCart(selectedService, priceInfo)}
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

      {/* ----- Services Section (Center) ----- */}
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Carwash POS</h1>
        {/* --- UPDATED LAYOUT --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {allServices.map((service) => (
            <div
              key={service.id}
              onClick={() => setSelectedService(service)}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow flex flex-col justify-between p-6 h-full"
            >
              <div>
                <span className="text-xs text-blue-500 font-semibold uppercase">
                  {service.category}
                </span>
                <h3 className="text-lg font-bold mt-1 mb-2">{service.name}</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {service.description}
                </p>
              </div>
              <p className="text-lg font-bold text-gray-800 mt-2">
                P{Math.min(...service.prices.map((p) => p.price))} - P
                {Math.max(...service.prices.map((p) => p.price))}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ----- Current Order Section (Right) ----- */}
      <div className="w-96 bg-white p-6 border-l border-gray-200 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Current Order</h2>
          <button
            onClick={clearCart}
            className="text-sm text-red-500 hover:underline cursor-pointer"
          >
            Clear All
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <LuCar size={60} />
              <p className="mt-4">No services selected</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.cartId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.serviceName}</h4>
                    <p className="text-sm text-gray-500">{item.vehicle}</p>
                    <p className="text-base font-semibold mt-1">
                      P{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDecrementQuantity(item.cartId)}
                      className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 cursor-pointer"
                    >
                      <LuMinus size={16} />
                    </button>
                    <span className="font-bold w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleIncrementQuantity(item.cartId)}
                      className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 cursor-pointer"
                    >
                      <LuPlus size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.cartId)}
                    className="text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    <LuTrash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="border-t pt-6">
          <div className="flex justify-between mb-2">
            <span>Items</span>
            <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Subtotal</span>
            <span>P{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Discount</span>
            <span className="font-semibold text-red-500">
              - P{discount.toFixed(2)}
            </span>
          </div>

          {/* Discount Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <button
              onClick={() => setDiscountType("Senior")}
              className={`p-2 rounded-lg border text-xs cursor-pointer ${
                discountType === "Senior"
                  ? "bg-amber-800 text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              Senior
            </button>
            <button
              onClick={() => setDiscountType("PWD")}
              className={`p-2 rounded-lg border text-xs cursor-pointer ${
                discountType === "PWD"
                  ? "bg-amber-800 text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              PWD
            </button>
            <button
              onClick={() => setDiscountType("Employee")}
              className={`p-2 rounded-lg border text-xs cursor-pointer ${
                discountType === "Employee"
                  ? "bg-amber-800 text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              Employee
            </button>
            <button
              onClick={() => setDiscountType(null)}
              className="p-2 rounded-lg border text-xs text-red-500 hover:bg-gray-50 cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="flex justify-between items-center text-xl font-bold mb-6">
            <span>Total</span>
            <span>P{total.toFixed(2)}</span>
          </div>

          {/* Payment Method Buttons */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod("Cash")}
                className={`p-2 rounded-lg border text-center cursor-pointer ${
                  paymentMethod === "Cash"
                    ? "bg-amber-800 text-white border-amber-800"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                Cash
              </button>
              <button
                onClick={() => setPaymentMethod("Gcash")}
                className={`p-2 rounded-lg border text-center cursor-pointer ${
                  paymentMethod === "Gcash"
                    ? "bg-amber-800 text-white border-amber-800"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                Gcash
              </button>
            </div>
          </div>

          <button
            onClick={handleProceedToPayment}
            className="w-full bg-amber-800 text-white p-3 rounded-lg font-bold cursor-pointer disabled:bg-gray-400"
            disabled={cart.length === 0}
          >
            Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );
}
