"use client";

import { useState, useEffect } from "react";
import {
  LuPencilLine,
  LuTrash2,
  LuPackage,
  LuPlus,
  LuX,
  LuCoffee,
  LuFlaskConical as LuFlask,
} from "react-icons/lu";
import { toast } from "react-toastify";

// --- INTERFACES ---

interface Ingredient {
  id: number;
  name: string;
  category: string;
  unit_of_measure: string;
  current_stock: number;
  required_stock: number;
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  needs_temp: boolean;
  image_url: string;
}

interface FormData {
  id?: number;
  name: string;
  category: string;
  unit_of_measure?: string;
  required_stock?: number;
  price?: number;
  needs_temp?: boolean;
}

// --- MODAL COMPONENT PROPS ---

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
  itemId: number;
  itemName: string;
  onClose: () => void;
  onConfirm: (id: number) => void;
  activeTab: "ingredients" | "products";
}

// --- MODAL COMPONENTS ---

function ConfirmDeleteModal({
  itemId,
  itemName,
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
          Are you sure you want to permanently delete **{itemName}**? This will
          remove the {type} permanently.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(itemId)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Yes, Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}

// 1. General Item Form Modal (Handles both Ingredient & Product)
function ItemFormModal({
  initialData,
  onClose,
  onSave,
  activeTab,
}: ItemFormModalProps) {
  const isEdit = !!initialData;
  const isIngredient =
    (isEdit && "required_stock" in initialData) || // Check if editing an ingredient
    (!isEdit && activeTab === "ingredients"); // Check if ADDING a new ingredient

  // --- STATES ---
  const [name, setName] = useState<string>(initialData?.name || "");
  const [category, setCategory] = useState<string>(initialData?.category || "");

  // --- CORRECTED LOGIC FOR USESTATE ---
  // Ingredient States
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>(
    // Only check initialData properties if isEdit is true
    isEdit && isIngredient && "unit_of_measure" in initialData
      ? initialData.unit_of_measure || ""
      : ""
  );
  const [requiredStock, setRequiredStock] = useState<string>(
    // Only check initialData properties if isEdit is true
    isEdit && isIngredient && "required_stock" in initialData
      ? String(initialData.required_stock || 0)
      : "0"
  );

  // Product States
  const [price, setPrice] = useState<string>(
    // Only check initialData properties if isEdit is true
    isEdit && !isIngredient && "price" in initialData
      ? String(initialData.price)
      : "0"
  );
  const [needsTemp, setNeedsTemp] = useState<boolean>(
    // Only check initialData properties if isEdit is true
    isEdit && !isIngredient && "needs_temp" in initialData
      ? initialData.needs_temp
      : false
  );
  // --- END OF FIX ---

  const categories = isIngredient
    ? [
        "Sauce",
        "Syrups",
        "Powder",
        "Tea",
        "None-Food",
        "Jams",
        "Liquor",
        "Condiments",
      ]
    : [
        "Coffee",
        "Non-Coffee",
        "Frappe / Smoothie",
        "Cheesecake Series",
        "Fruitea",
        "Milk Tea",
      ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) {
      toast.error("Name and Category are required.");
      return;
    }

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
        };

    await onSave(data);
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
            className="text-gray-500 hover:text-gray-800"
          >
            <LuX size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* NAME & CATEGORY (Universal) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border"
                required
              />
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
                  <input
                    type="text"
                    value={unitOfMeasure}
                    onChange={(e) => setUnitOfMeasure(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border"
                    placeholder="e.g., Bottle, mL"
                  />
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
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-700"
            >
              {isEdit
                ? "Save Changes"
                : `Save ${isIngredient ? "Ingredient" : "Product"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 2. Stock Movement Modal (Already defined and working)
function StockMovementModal({
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
    if (isNaN(numQuantity) || numQuantity <= 0) {
      toast.error("Quantity must be a positive number.");
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
            {/* Movement Type Selector */}
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

            {/* Quantity Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantity ({ingredient.unit_of_measure})
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

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes (Supplier, Waste Reason, etc.)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border"
              />
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
export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"ingredients" | "products">(
    "products"
  ); // Start on the Products tab
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // States for editing/selection
  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null);
  const [itemToEdit, setItemToEdit] = useState<Ingredient | Product | null>(
    null
  );
  const [itemToDelete, setItemToDelete] = useState<Ingredient | Product | null>(
    null
  );

  // --- API Handlers ---

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [ingResponse, prodResponse] = await Promise.all([
        fetch("http://localhost:5000/api/ingredients"),
        fetch("http://localhost:5000/api/products"),
      ]);

      const ingData: Ingredient[] = ingResponse.ok
        ? await ingResponse.json()
        : [];

      const prodDataRaw: Array<
        Omit<Product, "price"> & { price: string | number }
      > = prodResponse.ok ? await prodResponse.json() : [];

      const prodData: Product[] = prodDataRaw.map((p) => ({
        ...p,
        price: Number(p.price), // Fix for price being a string
      }));

      setIngredients(ingData);
      setProducts(prodData);
    } catch (error) {
      toast.error("Could not load all inventory data.");
    } finally {
      setLoading(false);
    }
  };

  // --- COMBINED SAVE/UPDATE HANDLER (for Products/Ingredients) ---
  const handleSaveOrUpdate = async (data: FormData) => {
    // Determine if it's an ingredient or product based on form data properties
    const isIngredient =
      data.unit_of_measure !== undefined || data.required_stock !== undefined;

    let endpoint = "";
    const method = data.id ? "PUT" : "POST";

    if (isIngredient) {
      endpoint = data.id ? `/api/ingredients/${data.id}` : "/api/ingredients";
    } else {
      endpoint = data.id ? `/api/products/${data.id}` : "/api/products";
    }

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save/update.");
      }

      toast.success(
        `${data.name} ${method === "POST" ? "added" : "updated"} successfully!`
      );
      fetchAllData(); // Refresh both lists
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      toast.error(`${method} Error: ${message}`);
    }
    setIsFormModalOpen(false);
    setItemToEdit(null);
  };

  // --- Stock Movement Handler (Existing Logic) ---
  const handleRecordMovement = async (data: {
    quantity: number;
    movement_type: "IN" | "OUT" | "AUDIT";
    notes: string;
  }) => {
    if (!selectedIngredient) return;
    try {
      const payload = { ...data, ingredient_id: selectedIngredient.id };
      const response = await fetch(
        "http://localhost:5000/api/ingredients/movement",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Failed to record movement.");
      toast.success(
        `${data.quantity} recorded as ${data.movement_type} for ${selectedIngredient.name}.`
      );
      fetchAllData();
    } catch (error) {
      toast.error("Error recording movement.");
    }
  };

  // --- DELETE Handler ---
  const handleDeleteItem = async (id: number) => {
    if (!itemToDelete) return;
    const name = itemToDelete.name;
    const isIngredient = "required_stock" in itemToDelete;
    const endpoint = isIngredient
      ? `/api/ingredients/${id}`
      : `/api/products/${id}`;

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete item.");
      }

      toast.success(`${name} deleted successfully!`);
      fetchAllData(); // Refresh data after delete
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
    setItemToEdit(item); // Note: This should be setItemToDelete
    setItemToDelete(item); // Corrected
    setIsDeleteModalOpen(true);
  };

  // --- Lifecycle ---
  useEffect(() => {
    fetchAllData();
  }, []);

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">Loading Inventory...</div>
    );

  // --- RENDER FUNCTIONS ---

  const renderIngredientTable = () => (
    <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ingredient
            </th>
            <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Unit
            </th>
            <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Required
            </th>
            <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Current Stock
            </th>
            <th className="w-36 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {ingredients.map((ingredient) => (
            <tr key={ingredient.id}>
              <td className="w-48 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate">
                {ingredient.name}
              </td>
              <td className="w-24 px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {ingredient.category}
              </td>
              <td className="w-20 px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {ingredient.unit_of_measure || "N/A"}
              </td>

              <td className="w-24 px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {ingredient.required_stock} {ingredient.unit_of_measure}
              </td>

              <td className="w-32 px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                <span
                  className={`px-2 py-1 inline-flex justify-center w-16 text-xs leading-5 font-semibold rounded-lg ${
                    ingredient.current_stock <= ingredient.required_stock
                      ? "bg-red-500 text-white"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {ingredient.current_stock}
                </span>
              </td>

              <td className="w-36 px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end space-x-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditForm(ingredient)}
                    className="text-amber-600 hover:text-amber-900 cursor-pointer"
                  >
                    <LuPencilLine size={18} />
                  </button>
                  <button
                    onClick={() => openDeleteConfirmation(ingredient)}
                    className="text-red-600 hover:text-red-900 cursor-pointer"
                  >
                    <LuTrash2 size={18} />
                  </button>
                </div>
                <button
                  onClick={() => openMovementModal(ingredient)}
                  className="bg-amber-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
                >
                  Stock IN/OUT
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {ingredients.length === 0 && !loading && (
        <p className="text-center py-10 text-gray-500">
          No raw ingredients found.
        </p>
      )}
    </div>
  );

  const renderProductTable = () => (
    <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Product Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price (P)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hot/Cold
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id}>
              <td className="px-6 py-4 whitespace-nowGrap text-sm font-medium text-gray-900">
                {product.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {product.category}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                P{Number(product.price).toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    product.needs_temp
                      ? "bg-orange-100 text-orange-800"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {product.needs_temp ? "Yes" : "No"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => openEditForm(product)}
                  className="text-amber-600 hover:text-amber-900 cursor-pointer mr-2"
                >
                  <LuPencilLine size={18} />
                </button>
                <button
                  onClick={() => openDeleteConfirmation(product)}
                  className="text-red-600 hover:text-red-900 cursor-pointer"
                >
                  <LuTrash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {products.length === 0 && !loading && (
        <p className="text-center py-10 text-gray-500">
          No POS products found. Add items to your Coffee menu.
        </p>
      )}
    </div>
  );

  return (
    <div className="p-8">
      {/* Modal Rendering: Delete Confirmation */}
      {isDeleteModalOpen && itemToDelete && (
        <ConfirmDeleteModal
          itemId={itemToDelete.id!}
          itemName={itemToDelete.name}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteItem}
          activeTab={activeTab}
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
          activeTab={activeTab}
        />
      )}

      {/* Modal Rendering: Stock IN/OUT Movement Form */}
      {isMovementModalOpen && selectedIngredient && (
        <StockMovementModal
          ingredient={selectedIngredient}
          onClose={() => setIsMovementModalOpen(false)}
          onRecordMovement={handleRecordMovement}
        />
      )}

      {/* Header and Tabs */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <LuPackage size={30} className="mr-3 text-gray-700" />
          Inventory Management
        </h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={openNewForm}
            className="bg-amber-800 text-white px-4 py-2 rounded-lg flex items-center hover:bg-amber-700 transition-colors"
          >
            <LuPlus size={18} className="mr-2" />
            {activeTab === "ingredients" ? "Add Ingredient" : "Add POS Product"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "products"
              ? "border-b-2 border-amber-800 text-amber-800"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <LuCoffee className="inline mr-2" size={16} /> POS Products
        </button>
        <button
          onClick={() => setActiveTab("ingredients")}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "ingredients"
              ? "border-b-2 border-amber-800 text-amber-800"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <LuFlask className="inline mr-2" size={16} /> Raw Ingredients
        </button>
      </div>

      {/* Table Content based on Tab */}
      {activeTab === "ingredients"
        ? renderIngredientTable()
        : renderProductTable()}
    </div>
  );
}
