// app/coffee-pos/page.tsx
"use client";

import { useState, useEffect } from "react"; // Added useEffect
import Image from "next/image";
import {
  LuSearch,
  LuCoffee,
  LuX,
  LuPlus,
  LuMinus,
  LuTrash2,
  LuPrinter,
} from "react-icons/lu";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid"; // Use uuid

// --- INTERFACES ---
interface Product {
  id: number;
  name: string;
  category: string;
  price: number; // This will be a number after we parse it
  needs_temp: boolean;
  image_url: string | null;
}

interface CartItem {
  cartId: string;
  id: number;
  name: string;
  price: number;
  option: string | null;
  quantity: number;
}

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
  discount_type: string | null; // Added for sales report
}

interface TempSelectionModalProps {
  product: Product;
  onSelect: (option: "Hot" | "Cold") => void;
  onCancel: () => void;
}

// --- Hardcoded Placeholder Image ---
// This is our fallback if a product has no image OR if an image fails to load
const placeholderImage =
  "https://images.unsplash.com/photo-1514432324609-a0a200c3b0d5";

// --- MODAL COMPONENTS ---

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
  // This component displays the final receipt
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
          className="w-full bg-emerald-600 text-white p-3 rounded-lg font-bold cursor-pointer"
        >
          Start New Order
        </button>
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
  // This component is the Numpad for cash payment
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

// --- MAIN PAGE COMPONENT ---
export default function PosPage() {
  // --- STATE ---
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Will be fetched from API
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true); // Loading state

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

  // --- 1. FETCH PRODUCTS FROM DATABASE ---
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // *** REMEMBER TO USE YOUR LAPTOP'S IP ADDRESS ***
        const response = await fetch("http://192.168.1.4:5000/api/products");
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data: Product[] = await response.json();

        // Convert price from string (from DB) to number
        const products: Product[] = data.map((p) => ({
          ...p,
          price: Number(p.price),
          needs_temp: Boolean(p.needs_temp), // Ensure boolean
        }));

        setAllProducts(products);

        // Automatically create category list from products
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
  }, []); // Runs once on page load

  // --- 2. DERIVED DATA (Filtering) ---
  const visibleProducts = allProducts
    .filter((product) => {
      return (
        selectedCategory === "All" || product.category === selectedCategory
      );
    })
    .filter((product) => {
      return product.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

  // --- 3. HANDLERS (Cart, Modals, Payment) ---

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
        cartId: uuidv4(), // Use uuidv4()
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

  // --- API Submission ---
  const submitOrderToAPI = async (orderDetails: OrderDetails) => {
    const payload = {
      orderDetails: orderDetails,
      businessUnit: "Coffee",
    };
    try {
      // *** REMEMBER TO USE YOUR LAPTOP'S IP ADDRESS ***
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

  const handleProceedToPayment = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty.");
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

    const baseOrder: OrderDetails = {
      orderId: `ORD-${uuidv4().slice(0, 8)}`, // Use uuidv4()
      items: cart,
      subtotal: subtotal,
      discount: discount,
      total: total,
      type: orderType,
      payment: paymentMethod,
      discount_type: discountType,
      cashTendered: null,
      changeDue: null,
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
    const orderDetails: OrderDetails = {
      orderId: `ORD-${uuidv4().slice(0, 8)}`, // Use uuidv4()
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
    <div className="flex h-screen bg-linear-to-br from-gray-50 to-gray-100 flex-col lg:flex-row">
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
        />
      )}
      {isReceiptModalOpen && completedOrder && (
        <ReceiptModal order={completedOrder} onClose={handleCloseReceipt} />
      )}

      {/* ----- Products Section (Center) ----- */}
      <div className="flex-1 min-h-0 p-6 overflow-y-auto">
        {/* Header: Search and Categories */}
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

        {/* Category Filters */}
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

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Coffee POS</h1>
        <p className="text-gray-600 mb-6">
          Search, filter, and tap a product to add it to the order
        </p>
        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full h-64 flex items-center justify-center">
              <div className="animate-spin text-amber-800 text-5xl">⏳</div>
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

      {/* ----- Current Order Section (Right) ----- */}
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

        {/* Cart Items */}
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

        {/* Order Summary */}
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

          {/* Order Type */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Order Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderType("Dine in")}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  orderType === "Dine in"
                    ? "bg-amber-600 text-white shadow-md"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50"
                }`}
              >
                🍽️ Dine in
              </button>
              <button
                onClick={() => setOrderType("Take out")}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  orderType === "Take out"
                    ? "bg-amber-600 text-white shadow-md"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50"
                }`}
              >
                🥡 Take out
              </button>
            </div>
          </div>

          {/* Payment Method */}
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
            {cart.length === 0 ? "Add Items to Continue" : "Proceed to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
