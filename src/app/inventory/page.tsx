"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LuTriangleAlert } from "react-icons/lu";
import {
  LuPencilLine,
  LuTrash2,
  LuPackage,
  LuPlus,
  LuX,
  LuArrowUpDown,
  LuDownload,
} from "react-icons/lu";
import { toast } from "react-toastify";
import ProtectedRoute from "@/components/ProtectedRoute";
import Spinner from "@/components/Spinner";
import PageLoader from "@/components/PageLoader";
import { getAuthHeaders } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";

// Normalize unit variants to canonical singular display values
function normalizeUnitSingular(unit?: string | null): string {
  if (!unit) return "";
  const u = unit.trim().toLowerCase();
  if (["piece", "pieces", "pc", "pcs"].includes(u)) return "Piece";
  if (["bottle", "bottles"].includes(u)) return "Bottle";
  return unit;
}

// Types

interface Ingredient {
  id: number;
  name: string;
  category: string;
  unit_of_measure: string;
  current_stock: number;
  required_stock: number;
  archived?: boolean;
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  needs_temp: boolean;
  image_url: string | null;
}

interface FormData {
  id?: number;
  name: string;
  category: string;
  unit_of_measure?: string;
  required_stock?: number;
  price?: number;
  needs_temp?: boolean;
  image_url?: string | null; // Added for product image
}

// Modal prop types

interface ItemFormModalProps {
  initialData: Ingredient | Product | null;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
  activeTab: "ingredients" | "products";
}

interface StockMovementModalProps {
  ingredient: Ingredient;
  onClose: () => void;
  onRecordMovement: (data: {
    quantity: number;
    movement_type: "IN" | "OUT" | "AUDIT";
    notes: string;
  }) => Promise<void>;
}

interface ConfirmDeleteModalProps {
  item: Ingredient | Product;
  onClose: () => void;
  onConfirm: (item: Ingredient | Product) => void;
  activeTab: "ingredients" | "products";
}

function ConfirmDeleteModal({
  item,
  activeTab,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const type = activeTab === "ingredients" ? "ingredient" : "product";
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-red-700">
          Confirm Deletion
        </h2>
        <p className="text-gray-700 mb-6">
          Are you sure you want to permanently delete{" "}
          <strong>{item.name}</strong>? This will remove the {type} permanently.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(item)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Yes, Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}

// 1. General Item Form Modal (Handles Image Upload)
function ItemFormModal({
  initialData,
  onClose,
  onSave,
  activeTab,
}: ItemFormModalProps) {
  const isEdit = !!initialData;
  const isIngredient =
    (isEdit && "required_stock" in initialData) ||
    (!isEdit && activeTab === "ingredients");

  // --- States ---
  const [name, setName] = useState<string>(initialData?.name || "");
  const [category, setCategory] = useState<string>(initialData?.category || "");
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>(() => {
    if (
      isEdit &&
      isIngredient &&
      initialData &&
      "unit_of_measure" in initialData
    ) {
      const ing = initialData as Ingredient;
      return normalizeUnitSingular(ing.unit_of_measure || "");
    }
    return "";
  });
  const [requiredStock, setRequiredStock] = useState<string>(
    isEdit && isIngredient && "required_stock" in initialData
      ? String(initialData.required_stock || 0)
      : "0"
  );
  const [price, setPrice] = useState<string>(
    isEdit && !isIngredient && initialData && "price" in initialData
      ? String(initialData.price)
      : "0"
  );
  const [needsTemp, setNeedsTemp] = useState<boolean>(
    isEdit && !isIngredient && initialData && "needs_temp" in initialData
      ? initialData.needs_temp
      : false
  );

  // --- NEW STATES for File Upload ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  // Store the URL (either existing or newly uploaded)
  const [imageUrl] = useState<string | null>(
    isEdit && !isIngredient && initialData && "image_url" in initialData
      ? initialData.image_url
      : null
  );

  const categories = isIngredient
    ? [
        // Raw Ingredient Categories
        "Sauce",
        "Syrups",
        "Powder",
        "Tea",
        "None-Food",
        "Jams",
        "Liquor",
        "Condiments",
        "Coffee", // For beans, milk, etc.
        "Sinkers", // From your spreadsheet
      ]
    : [
        // POS Product Categories (from your menu)
        "Espresso Bar",
        "Coffee-Based",
        "Non-Coffee-Based",
        "Frappe / Smoothie",
        "Milk Tea",
        "Fruitea",
        "Cheesecake Series",
        "Yogurt Series",
        "Mocktails",
        "Refreshers",
      ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) {
      toast.error("Name and Category are required.");
      return;
    }

    // Validate name length
    if (name.trim().length > 100) {
      toast.error("Name must be 100 characters or less.");
      return;
    }

    // Validate required stock is non-negative
    if (
      isIngredient &&
      requiredStock !== undefined &&
      parseFloat(requiredStock) < 0
    ) {
      toast.error("Required stock must be a positive number.");
      return;
    }

    setUploading(true);
    let finalImageUrl = imageUrl;

    // Upload file first (if any)
    if (selectedFile) {
      const fileFormData = new FormData();
      fileFormData.append("image", selectedFile);

      try {
        const uploadResponse = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
          }/api/upload`,
          {
            method: "POST",
            headers: {
              // Important: don't set Content-Type for FormData; the browser will set the boundary.
              ...getAuthHeaders(),
            },
            body: fileFormData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error("Image upload failed.");
        }
        const uploadResult = await uploadResponse.json();
        finalImageUrl = uploadResult.image_url;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        toast.error(`Upload Error: ${message}`);
        setUploading(false);
        return; // Stop if upload fails
      }
    }

    // --- 2. Prepare the final data to save ---
    const baseData: FormData = { id: initialData?.id, name, category };
    const data: FormData = isIngredient
      ? {
          ...baseData,
          unit_of_measure: unitOfMeasure,
          required_stock: parseFloat(requiredStock) || 0,
        }
      : {
          ...baseData,
          price: parseFloat(price) || 0,
          needs_temp: needsTemp,
          image_url: finalImageUrl, // Save the new or existing URL
        };

    // --- 3. Call the parent save function ---
    await onSave(data);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {isEdit
              ? `Edit ${isIngredient ? "Ingredient" : "Product"}`
              : `Add New ${isIngredient ? "Ingredient" : "Product"}`}
          </h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            <LuX size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* ... (Name and Category inputs) ... */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum 100 characters
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border"
                required
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* INGREDIENT SPECIFIC FIELDS */}
            {isIngredient && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Unit of Measure
                  </label>
                  <select
                    value={unitOfMeasure}
                    onChange={(e) => setUnitOfMeasure(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border"
                    required
                  >
                    <option value="">Select unit</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Piece">Piece</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Allowed units: Bottle or Pieces
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Required Stock (Min.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={requiredStock}
                    onChange={(e) => setRequiredStock(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </>
            )}

            {/* PRODUCT SPECIFIC FIELDS */}
            {!isIngredient && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price (P)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border"
                    required
                    min="0"
                  />
                </div>

                {/* --- NEW FILE UPLOAD FIELD --- */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Image
                  </label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) =>
                      setSelectedFile(e.target.files ? e.target.files[0] : null)
                    }
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                  {selectedFile ? (
                    <div className="mt-2 text-sm text-green-600">
                      File selected: {selectedFile.name}
                    </div>
                  ) : imageUrl ? (
                    <div className="mt-2 text-sm text-gray-500">
                      Current image: {imageUrl.substring(0, 50)}...
                    </div>
                  ) : null}
                </div>
                {/* --- END OF NEW FIELD --- */}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={needsTemp}
                    onChange={(e) => setNeedsTemp(e.target.checked)}
                    id="needs-temp"
                    className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <label
                    htmlFor="needs-temp"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Requires Hot/Cold Option?
                  </label>
                </div>
              </>
            )}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-700 flex items-center justify-center min-w-[120px] disabled:bg-gray-400"
            >
              {uploading ? (
                <Spinner size="sm" thickness={2} />
              ) : isEdit ? (
                "Save Changes"
              ) : (
                `Save ${isIngredient ? "Ingredient" : "Product"}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 2. Stock Movement Modal
function StockMovementModal({
  // ... (This component remains unchanged)
  ingredient,
  onClose,
  onRecordMovement,
}: StockMovementModalProps) {
  const [quantity, setQuantity] = useState("");
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "AUDIT">(
    "IN"
  );
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numQuantity = parseFloat(quantity);

    // Validate quantity based on movement type
    if (movementType === "AUDIT") {
      if (isNaN(numQuantity) || numQuantity < 0) {
        toast.error("AUDIT quantity must be zero or positive.");
        return;
      }
    } else {
      // IN or OUT
      if (isNaN(numQuantity) || numQuantity <= 0) {
        toast.error("Quantity for IN/OUT must be greater than zero.");
        return;
      }
    }

    // Validate notes length
    if (notes.length > 500) {
      toast.error("Notes must be 500 characters or less.");
      return;
    }

    await onRecordMovement({
      quantity: numQuantity,
      movement_type: movementType,
      notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Record Stock Movement</h2>
        <h3 className="text-xl text-amber-800 mb-6">Item: {ingredient.name}</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Movement Type
              </label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMovementType("IN")}
                  className={`p-2 rounded-lg border font-semibold ${
                    movementType === "IN"
                      ? "bg-green-600 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  Stock IN
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType("OUT")}
                  className={`p-2 rounded-lg border font-semibold ${
                    movementType === "OUT"
                      ? "bg-red-600 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  Stock OUT
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType("AUDIT")}
                  className={`p-2 rounded-lg border font-semibold ${
                    movementType === "AUDIT"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  Audit (Set Beg.)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantity ({normalizeUnitSingular(ingredient.unit_of_measure)})
              </label>
              <input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-3 text-2xl border"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes (Supplier, Waste Reason, etc.)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border"
              />
              <p className="text-xs text-gray-500 mt-1">
                {notes.length}/500 characters
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-700"
            >
              Record Movement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---
function Inventory() {
  const router = useRouter();
  const [checkingShift, setCheckingShift] = useState(true);
  const [hasActiveShift, setHasActiveShift] = useState(false);
  // Shift check logic (block usage if no active shift)
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
        setHasActiveShift(false);
      } finally {
        setCheckingShift(false);
      }
    };
    checkShift();
  }, []);
  // --- History Filter State and Logic ---
  const [historyFilter, setHistoryFilter] = useState({
    from: "",
    to: "",
    type: "",
    ingredient: "",
  });

  const [history, setHistory] = useState<InventoryHistory[]>([]);
  const filteredHistory = history.filter((h) => {
    // Date filter
    if (
      historyFilter.from &&
      new Date(h.created_at) < new Date(historyFilter.from)
    )
      return false;
    if (
      historyFilter.to &&
      new Date(h.created_at) > new Date(historyFilter.to + "T23:59:59")
    )
      return false;
    // Type filter
    if (historyFilter.type && h.movement_type !== historyFilter.type)
      return false;
    // Ingredient filter (case-insensitive substring)
    if (
      historyFilter.ingredient &&
      !(h.ingredient_name || "")
        .toLowerCase()
        .includes(historyFilter.ingredient.toLowerCase())
    )
      return false;
    return true;
  });
  const { isManager } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ingredients" | "history">(
    "ingredients"
  );
  // New: ingredient view filter (active/archived)
  const [ingredientView, setIngredientView] = useState<"active" | "archived">(
    "active"
  );
  interface InventoryHistory {
    id: number;
    created_at: string;
    product_name?: string;
    ingredient_name?: string;
    quantity: number;
    movement_type: string;
    user_name?: string;
    note?: string;
  }
  const [loadingHistory, setLoadingHistory] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null);
  const [itemToEdit, setItemToEdit] = useState<Ingredient | Product | null>(
    null
  );
  const [itemToDelete, setItemToDelete] = useState<Ingredient | Product | null>(
    null
  );

  // --- Filter and Sort States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [selectedIngredientCategory, setSelectedIngredientCategory] =
    useState("All");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // --- CSV Export Functions ---
  const exportIngredientsToCSV = () => {
    const dataToExport = filteredAndSortedIngredients();

    if (dataToExport.length === 0) {
      toast.warning("No ingredients to export");
      return;
    }

    const headers = [
      "Ingredient Name",
      "Category",
      "Unit",
      "Required Stock",
      "Current Stock",
      "Status",
    ];
    const rows = dataToExport.map((ingredient) => [
      ingredient.name,
      ingredient.category,
      ingredient.unit_of_measure || "N/A",
      ingredient.required_stock,
      ingredient.current_stock,
      Number(ingredient.current_stock) < Number(ingredient.required_stock)
        ? "Low Stock"
        : "OK",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    downloadCSV(
      csvContent,
      `ingredients-${new Date().toISOString().split("T")[0]}.csv`
    );
    toast.success(`Exported ${dataToExport.length} ingredients to CSV`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // API handlers

  // Fetch ingredients with archived filter
  const fetchAllData = async () => {
    setLoading(true);
    try {
      let archivedParam = "";
      if (ingredientView === "active") archivedParam = "?archived=false";
      else if (ingredientView === "archived") archivedParam = "?archived=true";
      const ingResponse = await fetch(
        `${API_BASE}/api/ingredients${archivedParam}`,
        {
          headers: getAuthHeaders(),
        }
      );
      const ingData: Ingredient[] = ingResponse.ok
        ? await ingResponse.json()
        : [];
      setIngredients(ingData);
    } catch {
      toast.error("Could not load inventory data.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch inventory history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/history`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch inventory history");
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      toast.error("Could not load inventory history");
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Create/update item
  const handleSaveOrUpdate = async (data: FormData) => {
    const isIngredient = true; // Inventory handles ingredients only
    let endpoint = "";
    const method = data.id ? "PUT" : "POST";

    if (isIngredient) {
      endpoint = data.id ? `/api/ingredients/${data.id}` : "/api/ingredients";
    } else {
      endpoint = data.id ? `/api/products/${data.id}` : "/api/products";
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save/update.");
      }

      toast.success(
        `${data.name} ${method === "POST" ? "added" : "updated"} successfully!`
      );
      fetchAllData();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      toast.error(`${method} Error: ${message}`);
    }
    setIsFormModalOpen(false);
    setItemToEdit(null);
  };

  // Stock movement
  const handleRecordMovement = async (data: {
    quantity: number;
    movement_type: "IN" | "OUT" | "AUDIT";
    notes: string;
  }) => {
    if (!selectedIngredient) return;
    try {
      const payload = { ...data, ingredient_id: selectedIngredient.id };
      const response = await fetch(`${API_BASE}/api/ingredients/movement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to record movement.");
      toast.success(
        `${data.quantity} recorded as ${data.movement_type} for ${selectedIngredient.name}.`
      );
      fetchAllData();
    } catch {
      toast.error("Error recording movement.");
    }
  };

  // Archive / Unarchive helpers
  const archiveIngredient = async (id: number) => {
    const url = `${API_BASE}/api/ingredients/${id}/archive`;
    const res = await fetch(url, { method: "POST", headers: getAuthHeaders() });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {}
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      if (
        typeof body === "object" &&
        body !== null &&
        Object.prototype.hasOwnProperty.call(body, "message") &&
        typeof (body as { message?: unknown }).message === "string"
      ) {
        errMsg = (body as { message: string }).message;
      }
      throw new Error(errMsg);
    }
    return body;
  };

  const unarchiveIngredient = async (id: number) => {
    const url = `${API_BASE}/api/ingredients/${id}/unarchive`;
    const res = await fetch(url, { method: "POST", headers: getAuthHeaders() });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {}
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      if (
        typeof body === "object" &&
        body !== null &&
        Object.prototype.hasOwnProperty.call(body, "message") &&
        typeof (body as { message?: unknown }).message === "string"
      ) {
        errMsg = (body as { message: string }).message;
      }
      throw new Error(errMsg);
    }
    return body;
  };

  // Delete item
  const handleDeleteItem = async (item: Ingredient | Product) => {
    if (!item) return;
    const name = item.name;
    const isIngredient = "required_stock" in item;
    const endpoint = isIngredient
      ? `/api/ingredients/${item.id}`
      : `/api/products/${item.id}`;

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete item.");
      }

      toast.success(`${name} deleted successfully!`);
      // Remove from local state immediately for instant UI update
      setIngredients((prev) => prev.filter((ing) => ing.id !== item.id));
      // Optionally, you can still call fetchAllData() in the background if you want to sync
      // fetchAllData();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      toast.error(`Delete Error: ${message}`);
    }

    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  // --- Modal Helpers ---
  const openNewForm = () => {
    setItemToEdit(null);
    setIsFormModalOpen(true);
  };

  const openEditForm = (item: Ingredient | Product) => {
    setItemToEdit(item);
    setIsFormModalOpen(true);
  };

  const openMovementModal = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setIsMovementModalOpen(true);
  };

  const openDeleteConfirmation = (item: Ingredient | Product) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  // Lifecycle
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (activeTab === "ingredients") {
      fetchAllData();
    } else if (activeTab === "history") {
      fetchHistory();
    }
    // eslint-disable-next-line
  }, [activeTab, ingredientView]);

  // Note: Units are shown only in the Unit column; Required/Current show numbers only

  // --- Filter and Sort Logic ---
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedIngredients = () => {
    let filtered = ingredients.filter((ing) =>
      ing.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    // Apply category filter
    if (selectedIngredientCategory !== "All") {
      filtered = filtered.filter(
        (ing) => ing.category === selectedIngredientCategory
      );
    }
    if (showLowStockOnly) {
      filtered = filtered.filter(
        (ing) => Number(ing.current_stock) < Number(ing.required_stock)
      );
    }
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";
        switch (sortColumn) {
          case "name":
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case "category":
            aVal = a.category.toLowerCase();
            bVal = b.category.toLowerCase();
            break;
          case "current_stock":
            aVal = Number(a.current_stock);
            bVal = Number(b.current_stock);
            break;
          case "required_stock":
            aVal = Number(a.required_stock);
            bVal = Number(b.required_stock);
            break;
          default:
            return 0;
        }
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  };

  // Products are managed in Settings; no products list in Inventory

  if (activeTab === "ingredients" && loading)
    return <PageLoader message="Loading Inventory…" color="amber" />;
  if (activeTab === "history" && loadingHistory)
    return <PageLoader message="Loading History…" color="amber" />;

  // --- RENDER FUNCTIONS ---
  // (These are defined inside the main component to access its state and handlers)

  const renderIngredientTable = () => {
    const dataToDisplay = filteredAndSortedIngredients();

    const SortableHeader = ({
      column,
      label,
      className = "",
    }: {
      column: string;
      label: string;
      className?: string;
    }) => (
      <th
        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${className}`}
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center space-x-1">
          <span>{label}</span>
          <LuArrowUpDown
            size={14}
            className={
              sortColumn === column ? "text-amber-600" : "text-gray-400"
            }
          />
        </div>
      </th>
    );

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader
                column="name"
                label="Ingredient"
                className="w-48"
              />
              <SortableHeader
                column="category"
                label="Category"
                className="w-24"
              />
              <th className="w-28 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <SortableHeader
                column="required_stock"
                label="Required"
                className="w-24 text-right"
              />
              <SortableHeader
                column="current_stock"
                label="Current Stock"
                className="w-32 text-right"
              />
              <th className="w-36 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dataToDisplay.map((ingredient) => {
              const isLow =
                Number(ingredient.current_stock) <
                Number(ingredient.required_stock);
              return (
                <tr key={ingredient.id} className="hover:bg-gray-50/80">
                  <td className="w-48 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate">
                    {ingredient.name}
                  </td>
                  <td className="w-24 px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ingredient.category}
                  </td>
                  <td className="w-28 px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {normalizeUnitSingular(ingredient.unit_of_measure) || "N/A"}
                  </td>
                  <td className="w-24 px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                    {Number(ingredient.required_stock).toLocaleString()}
                  </td>
                  <td className="w-32 px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span
                        className={`px-2 py-1 inline-flex justify-center min-w-12 text-xs leading-5 font-semibold rounded-lg ${
                          isLow
                            ? "bg-red-500 text-white"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {Number(ingredient.current_stock).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="w-36 px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-4">
                      {isManager() && (
                        <div className="flex items-center space-x-2">
                          {/* Show edit button only when viewing active */}
                          {ingredientView === "active" && (
                            <button
                              onClick={() => openEditForm(ingredient)}
                              className="text-amber-600 hover:text-amber-900 cursor-pointer"
                            >
                              <LuPencilLine size={18} />
                            </button>
                          )}
                          {/* Delete button removed for archived view since deletion is not allowed if referenced in history */}
                        </div>
                      )}
                      {/* Hide Stock IN/OUT for archived ingredients */}
                      {ingredientView === "active" && (
                        <button
                          onClick={() => openMovementModal(ingredient)}
                          className="bg-amber-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors shadow-sm"
                        >
                          Stock IN/OUT
                        </button>
                      )}
                      {isManager() && (
                        <button
                          onClick={async () => {
                            try {
                              const isArchived = !!ingredient.archived;
                              const result = isArchived
                                ? await unarchiveIngredient(ingredient.id)
                                : await archiveIngredient(ingredient.id);
                              console.debug("Archive result", result);
                              toast.success(
                                `${ingredient.name} ${
                                  isArchived ? "unarchived" : "archived"
                                } successfully!`
                              );
                              fetchAllData();
                            } catch (err: unknown) {
                              console.error("Archive error", err);
                              const message =
                                err instanceof Error
                                  ? err.message
                                  : String(err);
                              toast.error(
                                `Failed to update archive status: ${message}`
                              );
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm bg-gray-400 text-white hover:bg-gray-500`}
                        >
                          {ingredient.archived ? "Unarchive" : "Archive"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {dataToDisplay.length === 0 && !loading && (
          <p className="text-center py-10 text-gray-500">
            {searchQuery || showLowStockOnly
              ? "No ingredients match your filters."
              : "No raw ingredients found."}
          </p>
        )}
      </div>
    );
  };

  // renderProductTable removed (POS products are now managed in Settings)

  // Tab bar
  const renderTabs = () => (
    <div className="flex gap-2 mb-6">
      <button
        className={`px-5 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
          activeTab === "ingredients"
            ? "bg-white border-amber-800 text-amber-800"
            : "bg-gray-100 border-transparent text-gray-500 hover:text-amber-800"
        }`}
        onClick={() => setActiveTab("ingredients")}
      >
        Ingredients
      </button>
      <button
        className={`px-5 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
          activeTab === "history"
            ? "bg-white border-amber-800 text-amber-800"
            : "bg-gray-100 border-transparent text-gray-500 hover:text-amber-800"
        }`}
        onClick={() => setActiveTab("history")}
      >
        History
      </button>
    </div>
  );

  // Shift gating overlay (block UI if no active shift)
  if (!checkingShift && !hasActiveShift) {
    return (
      <div className="fixed inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <LuTriangleAlert size={40} className="text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            No Active Shift
          </h2>
          <p className="text-gray-600 mb-6">
            You must start a shift before using the Inventory system.
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
              className="flex-1 px-6 py-3 bg-amber-700 text-white rounded-xl font-semibold hover:bg-amber-800 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      {/* Modal Rendering: Delete Confirmation */}
      {isDeleteModalOpen && itemToDelete && (
        <ConfirmDeleteModal
          item={itemToDelete}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
          }}
          onConfirm={handleDeleteItem}
          activeTab={"ingredients"}
        />
      )}

      {/* Modal Rendering: Add/Edit Item Form */}
      {isFormModalOpen && (
        <ItemFormModal
          initialData={itemToEdit}
          onClose={() => {
            setIsFormModalOpen(false);
            setItemToEdit(null);
          }}
          onSave={handleSaveOrUpdate}
          activeTab={"ingredients"}
        />
      )}

      {/* Modal Rendering: Stock IN/OUT Movement Form */}
      {isMovementModalOpen && selectedIngredient && (
        <StockMovementModal
          ingredient={selectedIngredient}
          onClose={() => {
            setIsMovementModalOpen(false);
            setSelectedIngredient(null);
          }}
          onRecordMovement={handleRecordMovement}
        />
      )}

      {/* Header and Tabs */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center">
            <LuPackage size={28} className="mr-2 md:mr-3 text-gray-700" />
            Inventory Management
          </h1>
        </div>
        {renderTabs()}
        {activeTab === "ingredients" && (
          <>
            <div className="flex flex-col gap-2 mb-4 md:flex-row md:items-center md:justify-between">
              {/* Toggle left, buttons right */}
              <div className="flex gap-2 mb-2 md:mb-0">
                <button
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors border-2 ${
                    ingredientView === "active"
                      ? "bg-amber-700 text-white border-amber-700"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                  onClick={() => setIngredientView("active")}
                >
                  Active
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors border-2 ${
                    ingredientView === "archived"
                      ? "bg-amber-700 text-white border-amber-700"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                  onClick={() => setIngredientView("archived")}
                >
                  Archived
                </button>
              </div>
              <div className="flex gap-2 justify-end">
                {isManager() && (
                  <button
                    className="inline-flex items-center px-4 py-2 bg-amber-700 text-white rounded-lg font-semibold shadow hover:bg-amber-800 transition-colors"
                    onClick={() => {
                      setIsFormModalOpen(true);
                      setItemToEdit(null);
                    }}
                  >
                    <LuPlus className="mr-2" /> Add Ingredient
                  </button>
                )}
                <button
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold shadow hover:bg-gray-300 transition-colors"
                  onClick={exportIngredientsToCSV}
                >
                  <LuDownload className="mr-2" /> Export CSV
                </button>
              </div>
            </div>
            <div className="max-w-7xl mx-auto">{renderIngredientTable()}</div>
          </>
        )}
        {activeTab === "history" && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <h2 className="text-xl font-bold mb-4 text-amber-800">
              Inventory History
            </h2>
            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4 mb-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  From
                </label>
                <input
                  type="date"
                  className="border rounded px-2 py-1"
                  value={historyFilter.from}
                  onChange={(e) =>
                    setHistoryFilter((f) => ({ ...f, from: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  To
                </label>
                <input
                  type="date"
                  className="border rounded px-2 py-1"
                  value={historyFilter.to}
                  onChange={(e) =>
                    setHistoryFilter((f) => ({ ...f, to: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Type
                </label>
                <select
                  className="border rounded px-2 py-1"
                  value={historyFilter.type}
                  onChange={(e) =>
                    setHistoryFilter((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  <option value="">All</option>
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                  <option value="AUDIT">AUDIT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ingredient
                </label>
                <input
                  type="text"
                  className="border rounded px-2 py-1"
                  placeholder="Name..."
                  value={historyFilter.ingredient}
                  onChange={(e) =>
                    setHistoryFilter((f) => ({
                      ...f,
                      ingredient: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      No inventory history found.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {new Date(h.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {h.ingredient_name || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {h.quantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {h.movement_type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {h.user_name || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {h.note || ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <Inventory />
    </ProtectedRoute>
  );
}
