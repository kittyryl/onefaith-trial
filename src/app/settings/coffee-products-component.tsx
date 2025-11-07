// Coffee Products Management Component
// This code should be added to settings/page.tsx

import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { getAuthHeaders } from "@/lib/auth";
import Spinner from "@/components/Spinner";
import PageLoader from "@/components/PageLoader";
import { LuPlus, LuPencil, LuTrash2 } from "react-icons/lu";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  needs_temp: boolean;
  image_url: string | null;
}

export function CoffeeProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/products`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      const data: Product[] = await res.json();
      setProducts(data.map((p) => ({ ...p, price: Number(p.price) })));
    } catch (err) {
      console.error(err);
      toast.error("Could not load coffee products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`Delete product "${name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Failed to delete product");

      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error("Could not delete product");
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    "All",
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Coffee Products Catalog</h2>
          <p className="text-sm text-gray-600">
            Manage menu items for the Coffee POS
          </p>
        </div>
        <button
          onClick={handleAddProduct}
          className="flex items-center gap-2 bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
        >
          <LuPlus size={18} />
          Add Product
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? "bg-amber-800 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex gap-4">
              <Image
                src={product.image_url || "/images/placeholder.svg"}
                alt={product.name}
                width={80}
                height={80}
                className="w-20 h-20 rounded-lg object-cover border"
              />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-600">{product.category}</p>
                <p className="text-lg font-bold text-amber-700 mt-1">
                  ₱{product.price.toLocaleString()}
                </p>
                {product.needs_temp && (
                  <span className="inline-block mt-1 text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                    Hot/Cold
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleEditProduct(product)}
                  className="p-2 rounded hover:bg-gray-100 text-blue-600"
                  title="Edit product"
                >
                  <LuPencil size={18} />
                </button>
                <button
                  onClick={() => handleDeleteProduct(product.id, product.name)}
                  className="p-2 rounded hover:bg-gray-100 text-red-600"
                  title="Delete product"
                >
                  <LuTrash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchQuery || selectedCategory !== "All"
            ? "No products match your filters"
            : "No products yet. Add your first coffee product!"}
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSave={fetchProducts}
        />
      )}
    </div>
  );
}

// Product Modal Component
interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}

function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  const [name, setName] = useState(product?.name || "");
  const [category, setCategory] = useState(product?.category || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [needsTemp, setNeedsTemp] = useState(product?.needs_temp || false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = [
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

    if (!name.trim() || !category || !price) {
      toast.error("Name, category, and price are required");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Invalid price");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = product?.image_url || null;

      // Upload image if new file selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("image", selectedFile);

        const uploadRes = await fetch(`${API_BASE}/api/upload`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Image upload failed");
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.image_url;
      }

      // Save product
      const url = product
        ? `${API_BASE}/api/products/${product.id}`
        : `${API_BASE}/api/products`;

      const res = await fetch(url, {
        method: product ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          price: priceNum,
          needs_temp: needsTemp,
          image_url: imageUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to save product");

      toast.success(`Product ${product ? "updated" : "created"} successfully`);
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Could not save product"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {product ? "Edit Product" : "Add Product"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Cappuccino"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2 bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (₱) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Image
            </label>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
            />
            {selectedFile && (
              <p className="text-sm text-green-600 mt-1">
                Selected: {selectedFile.name}
              </p>
            )}
            {!selectedFile && product?.image_url && (
              <p className="text-sm text-gray-500 mt-1">
                Current: {product.image_url.substring(0, 40)}...
              </p>
            )}
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={needsTemp}
              onChange={(e) => setNeedsTemp(e.target.checked)}
              id="needs-temp-product"
              className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            />
            <label
              htmlFor="needs-temp-product"
              className="ml-2 block text-sm text-gray-900"
            >
              Requires Hot/Cold Option?
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-800 text-white hover:bg-amber-700 flex items-center"
              disabled={saving}
            >
              {saving ? (
                <Spinner size="sm" thickness={2} />
              ) : product ? (
                "Save"
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
