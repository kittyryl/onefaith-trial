// app/page.tsx
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
  LuPrinter, // Added for the receipt
} from "react-icons/lu";
import { toast } from "react-toastify";

// ----- (Interfaces: Product, CartItem) -----
// (These remain the same)
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  needsTemp?: boolean;
}

interface CartItem {
  cartId: string;
  id: number;
  name: string;
  price: number;
  option: string | null;
  quantity: number;
}

// ----- NEW: Interface for a Completed Order -----
interface OrderDetails {
  orderId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  type: "Dine in" | "Take out";
  payment: "Cash" | "Gcash";
  cashTendered: number | null; // <-- ADD THIS
  changeDue: number | null; // <-- ADD THIS
}

interface TempSelectionModalProps {
  product: Product;
  onSelect: (option: "Hot" | "Cold") => void;
  onCancel: () => void;
}

// --- (Product & Category Data) ---
// (This data remains the same)
const placeholderImage = "/images/cappuccino.jpg";

const allProducts: Product[] = [
  {
    id: 1,
    name: "Espresso",
    category: "Coffee",
    price: 45,
    image: placeholderImage,
  },
  {
    id: 2,
    name: "Doppio",
    category: "Coffee",
    price: 75,
    image: placeholderImage,
  },
  {
    id: 3,
    name: "Latte",
    category: "Coffee",
    price: 145,
    image: placeholderImage,
  },
  {
    id: 4,
    name: "Americano",
    category: "Coffee",
    price: 95,
    image: placeholderImage,
  },
  {
    id: 5,
    name: "Affogato",
    category: "Coffee",
    price: 165,
    image: placeholderImage,
  },
  {
    id: 6,
    name: "Cappuccino",
    category: "Coffee",
    price: 155,
    needsTemp: true,
    image: placeholderImage,
  },
  {
    id: 7,
    name: "Mocha",
    category: "Coffee",
    price: 165,
    needsTemp: true,
    image: placeholderImage,
  },
  {
    id: 8,
    name: "Almond Mocha",
    category: "Coffee",
    price: 175,
    needsTemp: true,
    image: placeholderImage,
  },
  {
    id: 22,
    name: "Chocolate",
    category: "Non-Coffee",
    price: 155,
    image: placeholderImage,
  },
  {
    id: 23,
    name: "Matcha",
    category: "Non-Coffee",
    price: 155,
    image: placeholderImage,
  },
  {
    id: 24,
    name: "Strawberry Latte",
    category: "Non-Coffee",
    price: 165,
    image: placeholderImage,
  },
];

const allCategories: string[] = [
  "All Menu",
  "Coffee",
  "Non-Coffee",
  "Fruitea",
  "Frappe",
  "Milk Tea",
  "Series",
  "Refreshers",
];

// --- (TempSelectionModal Component) ---
// (This component remains the same)
function TempSelectionModal({
  product,
  onSelect,
  onCancel,
}: TempSelectionModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">
            Select Option for {product.name}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-800"
          >
            <LuX size={24} />
          </button>
        </div>
        <p className="mb-6">This item requires a temperature selection:</p>
        <div className="flex gap-4">
          <button
            onClick={() => onSelect("Hot")}
            className="flex-1 bg-red-500 text-white p-4 rounded-lg font-bold hover:bg-red-600"
          >
            Hot
          </button>
          <button
            onClick={() => onSelect("Cold")}
            className="flex-1 bg-blue-500 text-white p-4 rounded-lg font-bold hover:bg-blue-600"
          >
            Cold
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- NEW: Receipt Modal Component -----
interface ReceiptModalProps {
  order: OrderDetails;
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
            <div key={item.cartId} className="flex justify-between">
              <div>
                <span className="font-semibold">{item.name}</span>
                {item.option && (
                  <span className="text-gray-500 text-sm">
                    {" "}
                    ({item.option})
                  </span>
                )}
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

        {/* Summary */}
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

          {/* --- NEW CASH DETAILS --- */}
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

          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order Type</span>
              <span className="font-medium">{order.type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment</span>
              <span className="font-medium">{order.payment}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-gray-900 text-white p-4 rounded-lg font-bold cursor-pointer"
        >
          Start New Order
        </button>
      </div>
    </div>
  );
}

// ----- NEW: Payment Modal Component -----
interface PaymentModalProps {
  totalDue: number;
  onClose: () => void;
  onSubmit: (cashTendered: number) => void; // Passes the cash amount back
  cashTendered: string; // From parent state
  setCashTendered: (value: string) => void; // To update parent state
}

function PaymentModal({
  totalDue,
  onClose,
  onSubmit,
  cashTendered,
  setCashTendered,
}: PaymentModalProps) {
  // Numpad button values
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
    "C", // C for Clear
  ];

  // Handle clicks on the numpad
  const handleNumpadClick = (value: string) => {
    if (value === "C") {
      setCashTendered(""); // Clear the input
    } else if (cashTendered.length < 10) {
      // Limit input length
      // Prevent leading zeros like "00" or "0" if empty
      if ((value === "0" || value === "00") && cashTendered === "") {
        return;
      }
      setCashTendered(cashTendered + value);
    }
  };

  // Handle the "Confirm" button click
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
    // If valid, submit the amount
    onSubmit(cashAmount);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Cash Payment</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            <LuX size={24} />
          </button>
        </div>

        {/* Display */}
        <div className="mb-4">
          <div className="flex justify-between text-lg">
            <span>Total Due:</span>
            <span className="font-bold">P{totalDue.toFixed(2)}</span>
          </div>
          <div className="mt-2 p-3 bg-gray-100 rounded text-right text-3xl font-mono">
            {/* Show a placeholder if empty, otherwise format as currency */}
            {cashTendered ? (
              `P${cashTendered}`
            ) : (
              <span className="text-gray-400">P0.00</span>
            )}
          </div>
        </div>

        {/* Numpad */}
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

        {/* Action Buttons */}
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

export default function PosPage() {
  // --- (Existing States) ---
  const [selectedCategory, setSelectedCategory] = useState<string>("All Menu");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productForModal, setProductForModal] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [orderType, setOrderType] = useState<"Dine in" | "Take out" | null>(
    null
  );
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Gcash" | null>(
    null
  );
  const [discountType, setDiscountType] = useState<
    "Senior" | "PWD" | "Employee" | null
  >(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [cashTendered, setCashTendered] = useState<string>("");

  // ----- NEW: States for Receipt Modal -----
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<OrderDetails | null>(
    null
  );

  // ... (visibleProducts logic)
  const visibleProducts = allProducts
    .filter((product) => {
      return (
        selectedCategory === "All Menu" || product.category === selectedCategory
      );
    })
    .filter((product) => {
      return product.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

  // ... (handleAddToCart, handleIncrementQuantity, handleDecrementQuantity, handleRemoveItem) ...
  // (These functions remain the same)
  const handleAddToCart = (
    product: Product,
    selectedOption: string | null = null
  ) => {
    if (product.needsTemp && !selectedOption) {
      setProductForModal(product);
      setIsModalOpen(true);
      return;
    }

    const existingItem = cart.find(
      (item) => item.id === product.id && item.option === selectedOption
    );

    if (existingItem) {
      handleIncrementQuantity(existingItem.cartId);
    } else {
      const cartItemId = crypto.randomUUID();
      const newItem: CartItem = {
        cartId: cartItemId,
        id: product.id,
        name: product.name,
        price: product.price,
        option: selectedOption,
        quantity: 1,
      };
      setCart((prevCart) => [...prevCart, newItem]);
    }

    setIsModalOpen(false);
    setProductForModal(null);
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

  const handleModalSelection = (selectedOption: "Hot" | "Cold") => {
    if (productForModal) {
      handleAddToCart(productForModal, selectedOption);
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const DISCOUNT_RATE = 0.2;

  const discount = discountType ? subtotal * DISCOUNT_RATE : 0;

  const total = subtotal - discount;

  // ...

  // ... (inside your PosPage component)

  // ----- UPDATED: Proceed to Payment Function -----
  const handleProceedToPayment = () => {
    // 1. Validation Checks (with toasts)
    if (cart.length === 0) {
      toast.error("Cannot proceed: The cart is empty.");
      return;
    }
    if (!orderType) {
      toast.error("Cannot proceed: Please select an Order Type.");
      return;
    }
    if (!paymentMethod) {
      toast.error("Cannot proceed: Please select a Payment Method.");
      return;
    }

    // 2. Check Payment Method and open the correct modal
    if (paymentMethod === "Gcash") {
      // Gcash: Go straight to the receipt
      const orderDetails: OrderDetails = {
        orderId: `ORD-${crypto.randomUUID().slice(0, 8)}`,
        items: cart,
        subtotal: subtotal,
        discount: discount,
        total: total,
        type: orderType,
        payment: paymentMethod,
        cashTendered: null, // No cash was tendered
        changeDue: null, // No change
      };

      setCompletedOrder(orderDetails);
      setIsReceiptModalOpen(true);
    } else if (paymentMethod === "Cash") {
      // Cash: Open the numpad modal
      setIsPaymentModalOpen(true);
    }
  };

  // ----- NEW: Handler for Closing the Receipt -----
  const handleCloseReceipt = () => {
    setIsReceiptModalOpen(false); // Close modal
    clearCart(); // Clear cart
    setOrderType(null); // Reset options
    setPaymentMethod(null);
    setCompletedOrder(null); // Clear the completed order
    toast.success("New order started!"); // Give feedback
  };

  return (
    <div className="flex h-full">
      {/* --- (Temp Selection Modal) --- */}
      {isModalOpen && productForModal && (
        <TempSelectionModal
          product={productForModal}
          onSelect={handleModalSelection}
          onCancel={() => {
            setIsModalOpen(false);
            setProductForModal(null);
          }}
        />
      )}

      {/* ----- NEW: Receipt Modal ----- */}
      {isReceiptModalOpen && completedOrder && (
        <ReceiptModal order={completedOrder} onClose={handleCloseReceipt} />
      )}

      {/* ----- MODAL LAYER 3 (ADD IT HERE) ----- */}
      {/* Your NEW Payment Modal (the numpad) */}
      {isPaymentModalOpen && (
        <PaymentModal
          totalDue={total}
          onClose={() => {
            setIsPaymentModalOpen(false); // Close the modal
            setCashTendered(""); // Clear the cash input
          }}
          onSubmit={(cashAmount) => {
            const orderDetails: OrderDetails = {
              orderId: `ORD-${crypto.randomUUID().slice(0, 8)}`,
              items: cart,
              subtotal: subtotal,
              discount: discount,
              total: total,
              type: orderType!, // We know this isn't null because we validated
              payment: "Cash", // We know this is Cash
              cashTendered: cashAmount,
              changeDue: cashAmount - total, // Calculate the change
            };
            // Set the final order, close the payment modal, and open the receipt
            setCompletedOrder(orderDetails);
            setIsPaymentModalOpen(false);
            setIsReceiptModalOpen(true);
            setCashTendered(""); // Clear the cash input
          }}
          cashTendered={cashTendered}
          setCashTendered={setCashTendered}
        />
      )}

      {/* ----- Products Section (Center) ----- */}
      {/* (This section remains the same) */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="relative mb-6">
          <LuSearch
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
          {allCategories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedCategory === category
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleAddToCart(product)}
            >
              <Image
                src={product.image}
                alt={product.name}
                width={300}
                height={200}
                className="w-full h-40 object-cover"
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold">{product.name}</h3>
                <p className="text-gray-500 text-sm">{product.category}</p>
                <p className="text-lg font-bold mt-2">
                  P{product.price.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ----- Current Order Section (Right) ----- */}
      {/* (This section remains the same, but the buttons are now state-driven) */}
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

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <LuCoffee size={60} />
              <p className="mt-4">No items selected</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.cartId} className="flex items-center gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    {item.option && (
                      <p className="text-sm text-gray-500">{item.option}</p>
                    )}
                    <p className="text-base font-semibold">
                      P{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDecrementQuantity(item.cartId)}
                      className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                    >
                      <LuMinus size={16} />
                    </button>
                    <span className="font-bold w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleIncrementQuantity(item.cartId)}
                      className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                    >
                      <LuPlus size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.cartId)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <LuTrash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <div className="flex  justify-between mb-2">
            <span>Items</span>
            <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Subtotal</span>
            <span>P{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-4">
            <span>Discount</span>
            <span>P{discount.toFixed(2)}</span>
          </div>

          {/* ----- NEW DISCOUNT BUTTONS ----- */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <button
              onClick={() => setDiscountType("Senior")}
              className={`p-2 rounded-lg border text-xs ${
                discountType === "Senior"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              Senior
            </button>
            <button
              onClick={() => setDiscountType("PWD")}
              className={`p-2 rounded-lg border text-xs ${
                discountType === "PWD"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              PWD
            </button>
            <button
              onClick={() => setDiscountType("Employee")}
              className={`p-2 rounded-lg border text-xs ${
                discountType === "Employee"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              Employee
            </button>
            <button
              onClick={() => setDiscountType(null)} // Clear discount
              className="p-2 rounded-lg border text-xs text-red-500 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
          {/* ----- END OF NEW BUTTONS ----- */}

          <div className="flex justify-between items-center text-xl font-bold mb-6">
            <span>Total</span>
            <span>P{total.toFixed(2)}</span>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Order Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderType("Dine in")}
                className={`p-3 rounded-lg border text-center cursor-pointer ${
                  orderType === "Dine in"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                Dine in
              </button>
              <button
                onClick={() => setOrderType("Take out")}
                className={`p-3 rounded-lg border text-center cursor-pointer ${
                  orderType === "Take out"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                Take out
              </button>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod("Cash")}
                className={`p-3 rounded-lg border text-center cursor-pointer ${
                  paymentMethod === "Cash"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                Cash
              </button>
              <button
                onClick={() => setPaymentMethod("Gcash")}
                className={`p-3 rounded-lg border text-center cursor-pointer ${
                  paymentMethod === "Gcash"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                Gcash
              </button>
            </div>
          </div>

          <button
            onClick={handleProceedToPayment}
            className="w-full bg-gray-900 text-white p-4 rounded-lg font-bold cursor-pointer"
          >
            Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );
}
