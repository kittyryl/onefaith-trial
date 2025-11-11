"use client";

/*
  Carwash POS Page
  ----------------
  This page implements the Point-of-Sale (POS) system for carwash services. It allows staff to:
    - Select carwash services and vehicle types
    - Add/remove services to a cart
    - Process payments (Cash/Gcash)
    - Print receipts (with Bluetooth/ESC/POS support)
    - View and manage current orders
  ProtectedRoute ensures only authenticated users can access this page.
  The page uses various utility and UI components for printing, receipt preview, and async data handling.
*/

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// Import icons for UI elements
import {
  LuCar,
  LuX,
  LuTrash2,
  LuPrinter,
  LuEye,
  LuTriangleAlert,
} from "react-icons/lu";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import ProtectedRoute from "@/components/ProtectedRoute"; // Restricts access to authenticated users
import { getAuthHeaders } from "@/lib/auth"; // Helper for API auth headers
import PageLoader from "@/components/PageLoader"; // Loading spinner for async data
import { printElementById } from "@/utils/print"; // Utility for printing DOM elements
import { generateCarwashReceipt } from "@/utils/escpos"; // ESC/POS receipt generator
import { printWithRawBT, canUseRawBT } from "@/utils/rawbt"; // Bluetooth printing utilities
import ESCPOSPreview from "@/components/ESCPOSPreview"; // Receipt preview component

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

// --------------------
// Type Definitions
// --------------------

// Price for a carwash service by vehicle type
interface ServicePrice {
  vehicle_type: string;
  price: number;
}

// Carwash service definition
interface CarwashService {
  id: number;
  name: string;
  category: string;
  description: string;
  prices: ServicePrice[];
}

// Cart item for carwash order
interface CarwashCartItem {
  cartId: string;
  serviceId: string;
  serviceName: string;
  vehicle: string;
  price: number;
  quantity: number;
}

// Order details for carwash transaction
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
  // Customer info (for receipt display)
  customerName?: string | null;
  customerPhone?: string | null;
  plateNumber?: string | null;
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

// (Bike variant modal removed; catalog should list Bike and Big Bike separately)

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
  isSubmitting?: boolean;
  vehicleType?: string | null; // used to toggle plate requirement for bikes
}

function CustomerDetailsModal({
  onClose,
  onSubmit,
  initialName,
  initialPhone,
  initialPlate,
  isSubmitting = false,
  vehicleType,
}: CustomerDetailsModalProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [plate, setPlate] = useState(initialPlate);
  const [errors, setErrors] = useState({ name: "", phone: "", plate: "" });
  const plateRequired = !(
    typeof vehicleType === "string" &&
    vehicleType.trim().toLowerCase() === "bike"
  );

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow letters, spaces, periods, hyphens, and apostrophes
    if (/^[a-zA-Z\s.\-']*$/.test(value) || value === "") {
      setName(value);
      setErrors((prev) => ({ ...prev, name: "" }));
    } else {
      setErrors((prev) => ({ ...prev, name: "Name can only contain letters" }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers, +, and limit to 13 characters (+639XXXXXXXXX)
    if (/^[\d+]*$/.test(value) && value.length <= 13) {
      setPhone(value);
      setErrors((prev) => ({ ...prev, phone: "" }));
    } else {
      setErrors((prev) => ({
        ...prev,
        phone: "Phone can only contain numbers",
      }));
    }
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    // Allow alphanumeric and hyphens, max 20 characters
    if (/^[A-Z0-9\-]*$/.test(value) && value.length <= 20) {
      setPlate(value);
      setErrors((prev) => ({ ...prev, plate: "" }));
    } else {
      setErrors((prev) => ({
        ...prev,
        plate: "Plate can only contain letters and numbers",
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name length
    if (name.trim().length > 100) {
      setErrors((prev) => ({
        ...prev,
        name: "Name must be 100 characters or less",
      }));
      return;
    }

    // Validate phone format
    const phoneRegex = /^(\+639|09)\d{9}$/;
    const cleanPhone = phone.replace(/[\s\-()]/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      setErrors((prev) => ({
        ...prev,
        phone: "Phone must be in format: +639XXXXXXXXX or 09XXXXXXXXX",
      }));
      return;
    }

    // Validate plate only if required (non-bike) and empty
    if (plateRequired && (!plate || plate.trim() === "")) {
      setErrors((prev) => ({
        ...prev,
        plate: "Plate is required for this vehicle type",
      }));
      return;
    }

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
              disabled={isSubmitting}
              className="text-gray-500 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                onChange={handleNameChange}
                placeholder="e.g. Juan Dela Cruz"
                required
                maxLength={100}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                value={phone}
                onChange={handlePhoneChange}
                placeholder="e.g. 09XXXXXXXXX or +639XXXXXXXXX"
                required
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Plate Number{" "}
                {plateRequired && <span className="text-red-500">*</span>}
              </label>
              <input
                value={plate}
                onChange={handlePlateChange}
                placeholder="e.g. ABC1234"
                required={plateRequired}
                maxLength={20}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
              />
              {errors.plate && (
                <p className="text-red-500 text-sm mt-1">{errors.plate}</p>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white p-3 rounded-lg font-bold text-lg cursor-pointer transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Processing..." : "Continue to Payment"}
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
  const [showPreview, setShowPreview] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);

  const handlePrintBrowser = () => {
    // Print only the receipt content using an isolated iframe to avoid printing overlays/backdrop
    printElementById("receipt-content", {
      title: "ONEFAITH CARWASH Receipt",
      pageWidthMm: 58,
    });
  };

  const handlePrintESCPOS = async () => {
    // Build ESC/POS receipt data
    const escposData = generateCarwashReceipt({
      orderId: order.orderId,
      items: order.items.map((item) => ({
        serviceName: item.serviceName,
        vehicle: item.vehicle,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.subtotal,
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
    const escposData = generateCarwashReceipt({
      orderId: order.orderId,
      items: order.items.map((item) => ({
        serviceName: item.serviceName,
        vehicle: item.vehicle,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.subtotal,
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
          <h2 className="text-2xl font-bold mt-4">ONEFAITH CARWASH</h2>
          <p className="text-gray-600 text-xs mt-1">Service Receipt</p>
          <div className="text-xs text-gray-500 mt-2">
            <div>{currentDate}</div>
            <div className="font-semibold mt-1">Order: {order.orderId}</div>
          </div>
        </div>
        {(order.customerName || order.customerPhone || order.plateNumber) && (
          <div className="text-xs text-gray-700 mb-4 border rounded-md p-3 bg-gray-50">
            <div className="font-semibold text-gray-800 mb-1">Customer</div>
            {order.customerName && (
              <div className="flex justify-between">
                <span>Name:</span>
                <span className="font-medium">{order.customerName}</span>
              </div>
            )}
            {order.customerPhone && (
              <div className="flex justify-between">
                <span>Phone:</span>
                <span className="font-medium">{order.customerPhone}</span>
              </div>
            )}
            {order.plateNumber && (
              <div className="flex justify-between">
                <span>Plate:</span>
                <span className="font-medium">{order.plateNumber}</span>
              </div>
            )}
          </div>
        )}
        <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border-t-2 border-b-2 py-4 border-dashed border-gray-400">
          {order.items.map((item) => (
            <div key={item.cartId} className="text-sm">
              <div className="flex justify-between font-semibold">
                <span>{item.serviceName}</span>
                <span>P{(item.price * item.quantity).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-xs pl-2">
                <span>
                  ({item.vehicle}) {item.quantity} x P{item.price.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
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
            <span>Payment:</span>
            <span className="font-medium">{order.payment}</span>
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 mt-4 border-t border-gray-300 pt-3">
          <p className="font-semibold">Thank you for choosing us!</p>
          <p className="mt-1">Drive safe!</p>
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

// POS
function CarwashPOS() {
  const router = useRouter();

  const [allServices, setAllServices] = useState<CarwashService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [checkingShift, setCheckingShift] = useState(true);
  const [hasActiveShift, setHasActiveShift] = useState(false);
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
  const addItemToCart = (
    service: CarwashService,
    priceInfo: ServicePrice,
    overrideVehicle?: string
  ) => {
    if (!currentOrderId) {
      setCurrentOrderId(`ORD-${uuidv4().slice(0, 8)}`);
    }
    const existingItem = cart.find(
      (item) =>
        item.serviceId === service.id.toString() &&
        item.vehicle === (overrideVehicle || priceInfo.vehicle_type)
    );

    if (existingItem) {
      // Service already in cart - don't allow duplicates
      toast.info(
        `${service.name} for ${
          overrideVehicle || priceInfo.vehicle_type
        } is already in cart`
      );
    } else {
      const newItem: CarwashCartItem = {
        cartId: uuidv4(),
        serviceId: service.id.toString(),
        serviceName: service.name,
        vehicle: overrideVehicle || priceInfo.vehicle_type,
        price: priceInfo.price,
        quantity: 1,
      };
      setCart((prevCart) => [...prevCart, newItem]);
    }
    setSelectedService(null);
  };

  const handleSelectServiceWithVehicle = (
    service: CarwashService,
    priceInfo: ServicePrice
  ) => {
    addItemToCart(service, priceInfo);
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
  type TicketOverrides = {
    plateNumber?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    paymentMethod?: "Cash" | "Gcash" | null;
    vehicleType?: string | null;
  };

  const upsertCarwashServiceTicket = useCallback(
    async (
      status: "queue" | "in_progress" | "completed" = "queue",
      overrides?: TicketOverrides
    ) => {
      if (!currentOrderId || cart.length === 0) return;

      const serviceItems = cart.map((it) => ({
        serviceId: it.serviceId, // Include catalog service ID for linking
        service_name: it.serviceName,
        vehicle: it.vehicle,
        price: it.price,
        quantity: it.quantity,
      }));

      const inferredVehicleType =
        overrides?.vehicleType ?? cart[0]?.vehicle ?? null;

      const finalPlate = overrides?.plateNumber ?? plateNumber ?? null;
      const finalName = overrides?.customerName ?? customerName ?? null;
      const finalPhone = overrides?.customerPhone ?? customerPhone ?? null;
      const finalPayment = overrides?.paymentMethod ?? paymentMethod ?? null;

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
            plate_number: finalPlate || null,
            customer_name: finalName || null,
            customer_phone: finalPhone || null,
            payment_method: finalPayment || null,
            total,
            items: serviceItems,
          }),
        });
      } catch (e) {
        // Silent fail for now to not block POS flow
        console.error("Failed to upsert carwash service ticket:", e);
      }
    },
    [
      currentOrderId,
      cart,
      total,
      plateNumber,
      customerName,
      customerPhone,
      paymentMethod,
    ]
  );

  // Removed auto-update of queue ticket - only create after payment

  // --- API Submission ---
  const submitOrderToAPI = async (orderDetails: CarwashOrderDetails) => {
    const payload = {
      orderDetails: orderDetails,
      businessUnit: "Carwash",
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
      customerName: details.customerName,
      customerPhone: details.customerPhone,
      plateNumber: details.plateNumber,
    };

    if (paymentMethod === "Gcash") {
      setIsSubmittingPayment(true);
      try {
        const submissionResult = await submitOrderToAPI(baseOrder);
        if (submissionResult) {
          // Create carwash service ticket after successful payment
          await upsertCarwashServiceTicket("queue", {
            plateNumber: details.plateNumber || null,
            customerName: details.customerName || null,
            customerPhone: details.customerPhone || null,
            paymentMethod,
            vehicleType: cart[0]?.vehicle || null,
          });
          // Link the ticket to the DB order id (optional linkage)
          try {
            await linkTicketToOrder(
              baseOrder.orderId,
              submissionResult.orderId
            );
          } catch {}
          setCompletedOrder(baseOrder);
          setIsCustomerDetailsModalOpen(false);
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
        customerName,
        customerPhone,
        plateNumber,
      };
      const submissionResult = await submitOrderToAPI(orderDetails);
      if (submissionResult) {
        // Create carwash service ticket after successful cash payment
        await upsertCarwashServiceTicket("queue", {
          plateNumber: plateNumber || null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          paymentMethod: "Cash",
          vehicleType: cart[0]?.vehicle || null,
        });
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
              You must start a shift before using the Carwash POS system.
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
          onClose={() => {
            if (!isSubmittingPayment) {
              setIsCustomerDetailsModalOpen(false);
            }
          }}
          onSubmit={handleCustomerDetailsSubmit}
          initialName={customerName}
          initialPhone={customerPhone}
          initialPlate={plateNumber}
          isSubmitting={isSubmittingPayment}
          vehicleType={cart[0]?.vehicle || null}
        />
      )}
      {/* No variant modal; ensure catalog has separate Bike and Big Bike prices */}
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
