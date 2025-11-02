// app/carwash-pos/page.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import {
  LuSearch,
  LuCoffee,
  LuX,
  LuPlus,
  LuMinus,
  LuTrash2,
  LuCar,
  LuPrinter,
} from "react-icons/lu"; // We'll use LuCar
import { toast } from "react-toastify";

// ----- NEW: Carwash Data Structure -----
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
  cartId: string; // A unique ID for this specific cart item
  serviceName: string; // e.g., "Detailed Wash"
  vehicle: string; // e.g., "Sedan"
  price: number; // e.g., 200
  quantity: number; // We'll just start with 1
}

// ----- NEW: All Carwash Services Data -----
const allServices: CarwashService[] = [
  {
    id: "detailed_wash",
    name: "Detailed Wash",
    category: "Basic",
    description: "Experience a comprehensive exterior and interior cleaning...",
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
    description:
      "Comprehensive cleaning and detailing, including hand waxing...",
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
      "The ultimate luxury treatment... auto detailing techniques...",
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
    description: "", // No description on menu
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
    description: "",
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
    description: "",
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
    description: "",
    prices: [
      { vehicle: "S", price: 400 },
      { vehicle: "M", price: 500 },
      { vehicle: "L", price: 600 },
      { vehicle: "XL", price: 700 },
      { vehicle: "XXL", price: 800 },
    ],
  },
];

// ----- NEW: Vehicle Selection Modal -----
interface VehicleSelectionModalProps {
  service: CarwashService;
  onClose: () => void;
  onSelect: (priceInfo: ServicePrice) => void; // Passes back the selected { vehicle, price }
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
}

function VehicleSelectionModal({
  service,
  onClose,
  onSelect,
}: VehicleSelectionModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
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

        {/* --- This is where we loop over the prices --- */}
        <div className="grid grid-cols-2 gap-3">
          {service.prices.map((priceOption) => (
            <button
              key={priceOption.vehicle}
              onClick={() => onSelect(priceOption)}
              className="p-4 rounded-lg border text-left cursor-pointer hover:bg-gray-100"
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
  // ... (all the numpad logic and JSX from the coffee page)
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
      if ((value === "0" || value === "00") && cashTendered === "") {
        return;
      }
      setCashTendered(cashTendered + value);
    }
  };

  const handleSubmit = () => {
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
        {/* ... (all the JSX for the numpad modal) ... */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Cash Payment</h3>
          <button
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
              key={key}
              onClick={() => handleNumpadClick(key)}
              className="p-4 rounded-lg text-xl font-bold bg-gray-200 hover:bg-gray-300 cursor-pointer"
            >
              {key}
            </button>
          ))}
        </div>
        <button
          onClick={handleSubmit}
          className="w-full bg-green-500 text-white p-3 rounded-lg font-bold text-lg cursor-pointer"
        >
          Confirm Payment
        </button>
      </div>
    </div>
  );
}

// ----- COPIED & ADAPTED: Receipt Modal Component -----
interface ReceiptModalProps {
  order: CarwashOrderDetails; // <-- CHANGED from OrderDetails
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

        {/* Item List */}
        <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border-t border-b py-4 border-dashed">
          {order.items.map((item) => (
            // This part is slightly different for carwash
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

        {/* Summary (This is updated to show change, etc.) */}
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
          className="w-full bg-gray-900 text-white p-3 rounded-lg font-bold cursor-pointer"
        >
          Start New Order
        </button>
      </div>
    </div>
  );
}

// ----- End of new modal component -----

export default function CarwashPosPage() {
  const [selectedService, setSelectedService] = useState<CarwashService | null>(
    null
  );
  const [cart, setCart] = useState<CarwashCartItem[]>([]);
  const [discountType, setDiscountType] = useState<
    "Senior" | "PWD" | "Employee" | null
  >(null);

  const [completedOrder, setCompletedOrder] =
    useState<CarwashOrderDetails | null>(null);
  // --- ADD THESE NEW STATES ---
  // For Payment Method
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Gcash" | null>(
    null
  );

  // For the Numpad Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [cashTendered, setCashTendered] = useState<string>("");

  // For the final Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // We'll also need a new interface for the carwash order details
  // and a state to hold the completed order.
  // ...

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // --- NEW DISCOUNT LOGIC ---
  const DISCOUNT_RATE = 0.2; // 20%

  // Calculate discount based on state
  const discount = discountType ? subtotal * DISCOUNT_RATE : 0;

  // Calculate final total
  const total = subtotal - discount;

  // --- ADD THIS NEW FUNCTION ---
  const handleAddToCart = (
    service: CarwashService,
    priceInfo: ServicePrice
  ) => {
    // Create a new item for the cart
    const newItem: CarwashCartItem = {
      cartId: crypto.randomUUID(), // Create a unique ID
      serviceName: service.name,
      vehicle: priceInfo.vehicle,
      price: priceInfo.price,
      quantity: 1, // Start with quantity of 1
    };

    // Add the new item to our cart array
    setCart((prevCart) => [...prevCart, newItem]);

    // Log to the console so we can see it's working
    console.log("Added to cart:", newItem);

    // Close the modal
    setSelectedService(null);
  };

  // --- ADD THESE NEW FUNCTIONS ---
  const handleIncrementQuantity = (cartId: string) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.cartId === cartId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const handleDecrementQuantity = (cartId: string) => {
    setCart(
      (prevCart) =>
        prevCart
          .map((item) =>
            item.cartId === cartId
              ? { ...item, quantity: Math.max(0, item.quantity - 1) }
              : item
          )
          .filter((item) => item.quantity > 0) // Automatically remove if quantity reaches 0
    );
  };

  const handleRemoveItem = (cartId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleProceedToPayment = () => {
    if (cart.length === 0) {
      toast.error("Cannot proceed: The cart is empty.");
      return;
    }
    if (!paymentMethod) {
      toast.error("Cannot proceed: Please select a Payment Method.");
      return;
    }

    if (paymentMethod === "Gcash") {
      const orderDetails: CarwashOrderDetails = {
        orderId: `ORD-${crypto.randomUUID().slice(0, 8)}`,
        items: cart,
        subtotal: subtotal,
        discount: discount,
        total: total,
        payment: "Gcash",
        cashTendered: null,
        changeDue: null,
      };

      setCompletedOrder(orderDetails);
      setIsReceiptModalOpen(true); // Open receipt modal
    } else if (paymentMethod === "Cash") {
      setIsPaymentModalOpen(true); // Open numpad modal
    }
  };

  const handleCloseReceipt = () => {
    setIsReceiptModalOpen(false);
    clearCart();
    setDiscountType(null);
    setPaymentMethod(null);
    setCompletedOrder(null);
    toast.success("New order started!");
  };

  return (
    <div className="flex h-full">
      {/* --- MODAL 1: Vehicle Selection --- */}
      {selectedService && (
        <VehicleSelectionModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onSelect={(priceInfo) => {
            handleAddToCart(selectedService, priceInfo);
          }}
        />
      )}

      {/* --- MODAL 2: Payment Numpad (Copied) --- */}
      {isPaymentModalOpen && (
        <PaymentModal
          totalDue={total}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setCashTendered("");
          }}
          onSubmit={(cashAmount) => {
            const orderDetails: CarwashOrderDetails = {
              orderId: `ORD-${crypto.randomUUID().slice(0, 8)}`,
              items: cart,
              subtotal: subtotal,
              discount: discount,
              total: total,
              payment: "Cash",
              cashTendered: cashAmount,
              changeDue: cashAmount - total,
            };

            setCompletedOrder(orderDetails);
            setIsPaymentModalOpen(false); // Close numpad
            setIsReceiptModalOpen(true); // Open receipt
            setCashTendered("");
          }}
          cashTendered={cashTendered}
          setCashTendered={setCashTendered}
        />
      )}

      {/* --- MODAL 3: Receipt (Copied) --- */}
      {isReceiptModalOpen && completedOrder && (
        <ReceiptModal order={completedOrder} onClose={handleCloseReceipt} />
      )}

      {/* ----- Services Section (Center) ----- */}
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Carwash POS</h1>

        {/* --- NEW: Looping over services --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedService(service)}
            >
              {/* We can add an image here later */}
              <div className="p-4">
                <span className="text-xs text-blue-500 font-semibold">
                  {service.category}
                </span>
                <h3 className="text-lg font-semibold mt-1">{service.name}</h3>
                <p className="text-gray-600 text-sm mt-2">
                  {service.description}
                </p>
                {/* We show a price range instead of one price */}
                <p className="text-lg font-bold mt-3">
                  P{Math.min(...service.prices.map((p) => p.price))} - P
                  {Math.max(...service.prices.map((p) => p.price))}
                </p>
              </div>
            </div>
          ))}
        </div>
        {/* --- End of loop --- */}
      </div>

      {/* ----- ADD THIS CODE BLOCK ----- */}
      {selectedService && (
        <VehicleSelectionModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onSelect={(priceInfo) => {
            handleAddToCart(selectedService, priceInfo); // <-- Call our new function
          }}
        />
      )}
      {/* ----- END OF NEW CODE BLOCK ----- */}

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

        {/* Order Items */}
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
                  {/* Item Details */}
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.serviceName}</h4>
                    <p className="text-sm text-gray-500">{item.vehicle}</p>
                    <p className="text-base font-semibold mt-1">
                      P{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
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

                  {/* Remove Button */}
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
          <div className="flex justify-between mb-4">
            <span>Discount</span>
            <span className="font-semibold text-red-500">
              - P{discount.toFixed(2)}
            </span>
          </div>
          {/* ----- NEW DISCOUNT BUTTONS ----- */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <button
              onClick={() => setDiscountType("Senior")}
              className={`p-2 rounded-lg border text-xs cursor-pointer ${
                discountType === "Senior"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              Senior
            </button>
            <button
              onClick={() => setDiscountType("PWD")}
              className={`p-2 rounded-lg border text-xs cursor-pointer ${
                discountType === "PWD"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              PWD
            </button>
            <button
              onClick={() => setDiscountType("Employee")}
              className={`p-2 rounded-lg border text-xs cursor-pointer ${
                discountType === "Employee"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              Employee
            </button>
            <button
              onClick={() => setDiscountType(null)} // Clear discount
              className="p-2 rounded-lg border text-xs text-red-500 hover:bg-gray-50 cursor-pointer"
            >
              Clear
            </button>
          </div>
          {/* ----- END OF NEW BUTTONS ----- */}
          <div className="flex justify-between items-center text-xl font-bold mb-6">
            <span>Total</span>
            <span>P{total.toFixed(2)}</span>
          </div>

          {/* ----- NEW PAYMENT METHOD BUTTONS ----- */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod("Cash")}
                className={`p-2 rounded-lg border text-center cursor-pointer ${
                  paymentMethod === "Cash"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                Cash
              </button>
              <button
                onClick={() => setPaymentMethod("Gcash")}
                className={`p-2 rounded-lg border text-center cursor-pointer ${
                  paymentMethod === "Gcash"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                Gcash
              </button>
            </div>
          </div>
          {/* ----- END OF NEW BUTTONS ----- */}

          <button
            onClick={handleProceedToPayment}
            className="w-full bg-gray-900 text-white p-3 rounded-lg font-bold cursor-pointer disabled:bg-gray-400"
            disabled={cart.length === 0}
          >
            Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );
}
