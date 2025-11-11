"use client";

/*
  Coffee POS Page
  ---------------
  This page implements the Point-of-Sale (POS) system for coffee shop operations. It allows staff to:
    - Browse and search coffee products
    - Add/remove products to a cart
    - Select options (e.g., temperature)
    - Process payments (Cash/Gcash)
    - Print receipts (with Bluetooth/ESC/POS support)
    - View and manage current orders
  ProtectedRoute ensures only authenticated users can access this page.
  The page uses various utility and UI components for printing, receipt preview, and async data handling.
*/

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
// Import icons for UI elements
import {
  LuSearch,
  LuCoffee,
  LuX,
  LuPlus,
  LuMinus,
  LuTrash2,
  LuPrinter,
  LuEye,
  LuTriangleAlert,
} from "react-icons/lu";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import ProtectedRoute from "@/components/ProtectedRoute"; // Restricts access to authenticated users
import Spinner from "@/components/Spinner"; // Loading spinner for async data
import { getAuthHeaders } from "@/lib/auth"; // Helper for API auth headers
import { printElementById } from "@/utils/print"; // Utility for printing DOM elements
import { generateCoffeeReceipt } from "@/utils/escpos"; // ESC/POS receipt generator
import { printWithRawBT, canUseRawBT } from "@/utils/rawbt"; // Bluetooth printing utilities
import ESCPOSPreview from "@/components/ESCPOSPreview"; // Receipt preview component

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

// --------------------
// Type Definitions
// --------------------

// Coffee product definition
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  needs_temp: boolean;
  image_url: string | null;
}

// Cart item for coffee order
interface CartItem {
  cartId: string;
  id: number;
  name: string;
  price: number;
  option: string | null;
  quantity: number;
}

// Order details for coffee transaction
interface OrderDetails {
  orderId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  type: "Dine in" | "Take out";
  payment: "Cash" | "Gcash";
  cashTendered: number | null;
  changeDue: number | null;
  discount_type: string | null;
}

interface TempSelectionModalProps {
  product: Product;
  onSelect: (option: "Hot" | "Cold") => void;
  onCancel: () => void;
}

const placeholderImage =
  "https://images.unsplash.com/photo-1514432324609-a0a200c3b0d5";

// Modals

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

interface ReceiptModalProps {
  order: OrderDetails;
  onClose: () => void;
}

function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);

  const handlePrintBrowser = () => {
    // Print only the receipt content using an isolated iframe to avoid printing overlays/backdrop
    printElementById("receipt-content", {
      title: "ONEFAITH COFFEE Receipt",
      pageWidthMm: 58,
    });
  };

  const handlePrintESCPOS = async () => {
    // Build ESC/POS receipt data
    const escposData = generateCoffeeReceipt({
      orderId: order.orderId,
      items: order.items.map((item) => ({
        name: item.name,
        option: item.option,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.subtotal,
      discountType: order.discount_type,
      discountAmount: order.discount,
      total: order.total,
      paymentMethod: order.payment,
      cashReceived: order.cashTendered ?? undefined,
      change: order.changeDue ?? undefined,
      timestamp: new Date().toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    });

    // Try RawBT
    const success = await printWithRawBT(
      escposData,
      () => {
        toast.success("Sending to thermal printer...");
      },
      (error) => {
        toast.error(
          "RawBT not available. Install RawBT app or use Browser Print."
        );
        console.error("[ESC/POS]", error);
      }
    );

    if (!success) {
      // Fallback to browser print
      handlePrintBrowser();
    }
  };

  const handlePreviewESCPOS = () => {
    // Build ESC/POS receipt data
    const escposData = generateCoffeeReceipt({
      orderId: order.orderId,
      items: order.items.map((item) => ({
        name: item.name,
        option: item.option,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.subtotal,
      discountType: order.discount_type,
      discountAmount: order.discount,
      total: order.total,
      paymentMethod: order.payment,
      cashReceived: order.cashTendered ?? undefined,
      change: order.changeDue ?? undefined,
      timestamp: new Date().toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    });

    setPreviewBytes(escposData);
    setShowPreview(true);
  };

  const currentDate = new Date().toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div
        className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md"
        id="receipt-content"
      >
        <div className="text-center mb-6">
          <LuPrinter size={48} className="mx-auto text-gray-700" />
          <h2 className="text-2xl font-bold mt-4">ONEFAITH COFFEE</h2>
          <p className="text-gray-600 text-xs mt-1">Coffee Shop Receipt</p>
          <div className="text-xs text-gray-500 mt-2">
            <div>{currentDate}</div>
            <div className="font-semibold mt-1">Order: {order.orderId}</div>
          </div>
        </div>
        {/* Item List */}
        <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border-t-2 border-b-2 py-4 border-dashed border-gray-400">
          {order.items.map((item) => (
            <div key={item.cartId} className="text-sm">
              <div className="flex justify-between font-semibold">
                <span>{item.name}</span>
                <span>P{(item.price * item.quantity).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-xs pl-2">
                <span>
                  {item.option && `(${item.option}) `}
                  {item.quantity} x P{item.price.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {/* Summary */}
        <div className="space-y-1 mb-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>P{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <span className="text-red-600">-P{order.discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t-2 border-dashed border-gray-400 pt-2 mt-2">
            <span>TOTAL:</span>
            <span>P{order.total.toFixed(2)}</span>
          </div>
          {order.payment === "Cash" && (
            <div className="border-t border-dashed border-gray-300 pt-2 mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Cash:</span>
                <span>P{order.cashTendered?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Change:</span>
                <span>P{order.changeDue?.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-600 space-y-1 border-t border-gray-300 pt-3">
          <div className="flex justify-between">
            <span>Type:</span>
            <span className="font-medium">{order.type}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment:</span>
            <span className="font-medium">{order.payment}</span>
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 mt-4 border-t border-gray-300 pt-3">
          <p className="font-semibold">Thank you for your order!</p>
          <p className="mt-1">Please come again</p>
        </div>
        <div className="flex gap-2 no-print">
          <button
            onClick={handlePreviewESCPOS}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-bold cursor-pointer transition-colors"
            title="Preview ESC/POS output"
          >
            <LuEye size={20} />
          </button>
          {canUseRawBT() ? (
            <>
              <button
                onClick={handlePrintESCPOS}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold cursor-pointer transition-colors flex items-center justify-center gap-2"
                title="Print via ESC/POS (RawBT)"
              >
                <LuPrinter size={20} />
                Print (Thermal)
              </button>
              <button
                onClick={handlePrintBrowser}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-bold cursor-pointer transition-colors"
                title="Print via browser"
              >
                <LuPrinter size={20} />
              </button>
            </>
          ) : (
            <button
              onClick={handlePrintBrowser}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              <LuPrinter size={20} />
              Print Receipt
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-lg font-bold cursor-pointer transition-colors"
          >
            Start New Order
          </button>
        </div>
      </div>

      {/* ESC/POS Preview Modal */}
      {showPreview && previewBytes && (
        <ESCPOSPreview
          bytes={previewBytes}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

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
    if (value === "C") setCashTendered("");
    else if (cashTendered.length < 10) {
      if ((value === "0" || value === "00") && cashTendered === "") return;
      setCashTendered(cashTendered + value);
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
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

// POS
function CoffeePOS() {
  const router = useRouter();

  // State
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingShift, setCheckingShift] = useState(true);
  const [hasActiveShift, setHasActiveShift] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productForModal, setProductForModal] = useState<Product | null>(null);

  // Payment States
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
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<OrderDetails | null>(
    null
  );
  const [isSubmittingPayment, setIsSubmittingPayment] =
    useState<boolean>(false);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/products`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data: Product[] = await response.json();

        const products: Product[] = data.map((p) => ({
          ...p,
          price: Number(p.price),
          needs_temp: Boolean(p.needs_temp),
        }));

        setAllProducts(products);

        const categories = [...new Set(products.map((p) => p.category))];
        setAllCategories(["All", ...categories]);
        setSelectedCategory("All");
      } catch (error) {
        console.error(error);
        toast.error("Could not load products from database.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Check for active shift
  useEffect(() => {
    const checkShift = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/shifts/current`, {
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          const data = await response.json();
          setHasActiveShift(data && data.status === "active");
        } else {
          setHasActiveShift(false);
        }
      } catch (error) {
        console.error("Failed to check shift:", error);
        setHasActiveShift(false);
      } finally {
        setCheckingShift(false);
      }
    };

    checkShift();
  }, []);

  // Derived
  const visibleProducts = allProducts
    .filter((product) => {
      return (
        selectedCategory === "All" || product.category === selectedCategory
      );
    })
    .filter((product) => {
      return product.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

  // Handlers

  const handleAddToCart = (
    product: Product,
    selectedOption: string | null = null
  ) => {
    if (product.needs_temp && !selectedOption) {
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
      const newItem: CartItem = {
        cartId: uuidv4(),
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

  const handleModalSelection = (selectedOption: "Hot" | "Cold") => {
    if (productForModal) {
      handleAddToCart(productForModal, selectedOption);
    }
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
    setOrderType(null);
    setPaymentMethod(null);
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const DISCOUNT_RATE = 0.2;
  const discount = discountType ? subtotal * DISCOUNT_RATE : 0;
  const total = subtotal - discount;

  // Submit order
  const submitOrderToAPI = async (orderDetails: OrderDetails) => {
    const payload = {
      orderDetails: {
        ...orderDetails,
        order_type: orderDetails.type,
      },
      businessUnit: "Coffee",
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
      const result = await response.json();
      if (!response.ok) {
        // Show backend error message if available
        toast.error(result.message || "Failed to save order to database.");
        return null;
      }
      toast.success(`Order ${result.orderId} Saved!`);
      return result;
    } catch {
      toast.error("Network error: Could not save order.");
      return null;
    }
  };

  const handleProceedToPayment = async () => {
    if (isSubmittingPayment) return;
    if (cart.length === 0) {
      toast.error("Cart is empty. Please add items before checkout.");
      return;
    }
    if (!orderType) {
      toast.error("Please select an Order Type.");
      return;
    }
    if (!paymentMethod) {
      toast.error("Please select a Payment Method.");
      return;
    }

    // For Cash payment, open the payment modal
    if (paymentMethod === "Cash") {
      setIsPaymentModalOpen(true);
      return;
    }

    // For GCash payment, process immediately
    setIsSubmittingPayment(true);
    const baseOrder: OrderDetails = {
      orderId: uuidv4(),
      items: cart,
      subtotal,
      discount,
      total,
      type: orderType,
      payment: paymentMethod,
      cashTendered: null,
      changeDue: null,
      discount_type: discountType,
    };
    const result = await submitOrderToAPI(baseOrder);
    setIsSubmittingPayment(false);
    if (result) {
      setCompletedOrder(baseOrder);
      setIsReceiptModalOpen(true);
      clearCart();
    }
  };

  const handleCashPaymentSubmit = async (cashAmount: number) => {
    if (isSubmittingPayment) return;
    setIsSubmittingPayment(true);
    const orderDetails: OrderDetails = {
      orderId: `ORD-${uuidv4().slice(0, 8)}`,
      items: cart,
      subtotal: subtotal,
      discount: discount,
      total: total,
      type: orderType!,
      payment: "Cash",
      discount_type: discountType,
      cashTendered: cashAmount,
      changeDue: cashAmount - total,
    };

    try {
      const submissionResult = await submitOrderToAPI(orderDetails);
      if (submissionResult) {
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
    toast.success("New order started!");
  };

  // UI
  return (
    <div className="flex h-screen bg-linear-to-br from-gray-50 to-gray-100 flex-col lg:flex-row">
      {/* Shift Warning Overlay */}
      {!checkingShift && !hasActiveShift && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
              <LuTriangleAlert size={40} className="text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              No Active Shift
            </h2>
            <p className="text-gray-600 mb-6">
              You must start a shift before using the Coffee POS system.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/")}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && productForModal && (
        <TempSelectionModal
          product={productForModal}
          onSelect={handleModalSelection}
          onCancel={() => setIsModalOpen(false)}
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

      {/* Products */}
      <div className="flex-1 min-h-0 p-6 overflow-y-auto">
        {/* Search + categories */}
        <div className="relative mb-6">
          <LuSearch
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
          {allCategories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedCategory === category
                  ? "bg-amber-800 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full h-64 flex items-center justify-center">
              <Spinner size="lg" color="amber" label="Loading products..." />
            </div>
          ) : (
            visibleProducts.map((product) => (
              <div
                key={product.id}
                className="group bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-100"
                onClick={() => handleAddToCart(product)}
              >
                <Image
                  src={product.image_url || placeholderImage}
                  alt={product.name}
                  width={300}
                  height={200}
                  className="w-full h-40 object-cover group-hover:scale-[1.01] transition-transform"
                  // Add an error fallback for broken images
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = placeholderImage;
                  }}
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-gray-500 text-sm">{product.category}</p>
                  <p className="text-lg font-bold mt-2 text-gray-900">
                    ₱
                    {product.price.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
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
              <LuCoffee size={60} />
              <p className="mt-4">No items selected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.cartId}
                  className="flex items-center gap-3 bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    {item.option && (
                      <p className="text-sm text-gray-500">{item.option}</p>
                    )}
                    <p className="text-base font-semibold mt-1 text-gray-900">
                      ₱{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDecrementQuantity(item.cartId)}
                      className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-100"
                    >
                      <LuMinus size={16} className="text-gray-700" />
                    </button>
                    <span className="font-bold w-8 text-center text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleIncrementQuantity(item.cartId)}
                      className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-100"
                    >
                      <LuPlus size={16} className="text-gray-700" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.cartId)}
                    className="text-gray-400 hover:text-red-500"
                    title="Remove item"
                  >
                    <LuTrash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
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

          {/* Discount Selection */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Discount (20% off)
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setDiscountType(null)}
                className={`px-2 py-2 rounded-lg font-medium transition-all text-xs btn-chip ${
                  discountType === null
                    ? "bg-gray-800 text-white shadow-md"
                    : "bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200"
                }`}
              >
                None
              </button>
              <button
                onClick={() => setDiscountType("Senior")}
                className={`px-2 py-2 rounded-lg font-medium transition-all text-xs btn-chip ${
                  discountType === "Senior"
                    ? "bg-blue-700 text-white shadow-md"
                    : "bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Senior
              </button>
              <button
                onClick={() => setDiscountType("PWD")}
                className={`px-2 py-2 rounded-lg font-medium transition-all text-xs btn-chip ${
                  discountType === "PWD"
                    ? "bg-purple-700 text-white shadow-md"
                    : "bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200"
                }`}
              >
                PWD
              </button>
              <button
                onClick={() => setDiscountType("Employee")}
                className={`px-2 py-2 rounded-lg font-medium transition-all text-xs btn-chip ${
                  discountType === "Employee"
                    ? "bg-green-700 text-white shadow-md"
                    : "bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Employee
              </button>
            </div>
          </div>

          {/* Order type */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Order Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderType("Dine in")}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  orderType === "Dine in"
                    ? "bg-amber-700 text-white shadow-md"
                    : "bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Dine in
              </button>
              <button
                onClick={() => setOrderType("Take out")}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  orderType === "Take out"
                    ? "bg-amber-700 text-white shadow-md"
                    : "bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Take out
              </button>
            </div>
          </div>

          {/* Payment */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod("Cash")}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  paymentMethod === "Cash"
                    ? "bg-amber-700 text-white shadow-md"
                    : "bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Cash
              </button>
              <button
                onClick={() => setPaymentMethod("Gcash")}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  paymentMethod === "Gcash"
                    ? "bg-amber-700 text-white shadow-md"
                    : "bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200"
                }`}
              >
                GCash
              </button>
            </div>
          </div>

          <button
            onClick={handleProceedToPayment}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
            disabled={cart.length === 0 || isSubmittingPayment}
          >
            {cart.length === 0
              ? "Add Items to Continue"
              : isSubmittingPayment
              ? "Processing..."
              : "Proceed to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PosPage() {
  return (
    <ProtectedRoute>
      <CoffeePOS />
    </ProtectedRoute>
  );
}
