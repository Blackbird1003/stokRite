"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Pencil, Trash2, X, Loader2, ShoppingCart, Plus } from "lucide-react";
import { format } from "date-fns";

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category: { name: string };
}

interface Sale {
  id: string;
  quantity: number;
  priceAtSale: number;
  createdAt: string;
  product: {
    id: string;
    name: string;
    category: { name: string };
  };
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm
  const [deleteSale, setDeleteSale] = useState<Sale | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Record sale
  const [showRecord, setShowRecord] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [recordProductId, setRecordProductId] = useState("");
  const [recordQty, setRecordQty] = useState("1");
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState("");

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales?limit=200");
      const data = await res.json();
      setSales(Array.isArray(data) ? data : []);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSales(); }, []);

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  };

  const openRecord = () => {
    fetchProducts();
    setRecordProductId("");
    setRecordQty("1");
    setRecordError("");
    setShowRecord(true);
  };

  const handleRecord = async () => {
    if (!recordProductId) { setRecordError("Please select a product"); return; }
    const qty = parseInt(recordQty);
    if (!qty || qty <= 0) { setRecordError("Quantity must be at least 1"); return; }
    setRecordLoading(true);
    setRecordError("");
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: recordProductId, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) { setRecordError(data.error || "Failed to record sale"); return; }
      setShowRecord(false);
      fetchSales();
    } catch {
      setRecordError("An error occurred");
    } finally {
      setRecordLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === recordProductId);

  const openEdit = (sale: Sale) => {
    setEditSale(sale);
    setEditQty(String(sale.quantity));
    setEditPrice(String(sale.priceAtSale));
    setEditError("");
  };

  const handleEdit = async () => {
    if (!editSale) return;
    const qty = parseInt(editQty);
    const price = parseFloat(editPrice);
    if (!qty || qty <= 0) { setEditError("Quantity must be greater than 0"); return; }
    if (isNaN(price) || price < 0) { setEditError("Enter a valid price"); return; }
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/sales/${editSale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty, priceAtSale: price }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error || "Failed to update sale"); return; }
      setEditSale(null);
      fetchSales();
    } catch {
      setEditError("An error occurred");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSale) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/sales/${deleteSale.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteSale(null);
        fetchSales();
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.priceAtSale * s.quantity, 0);
  const totalUnits = sales.reduce((sum, s) => sum + s.quantity, 0);

  const formatNGN = (v: number) =>
    `₦${v.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Sales Records" description="View, edit and delete recorded sales" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

        {/* Record Sale button */}
        <div className="flex justify-end">
          <button
            onClick={openRecord}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Record Sale
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Total Sales</p>
            <p className="text-2xl font-bold text-slate-900">{sales.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Units Sold</p>
            <p className="text-2xl font-bold text-slate-900">{totalUnits.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-indigo-600">{formatNGN(totalRevenue)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No sales recorded yet</p>
              <p className="text-slate-400 text-sm mt-1">Sales will appear here once you record them from Inventory.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{sale.product.name}</td>
                      <td className="px-4 py-3 text-slate-500">{sale.product.category.name}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{sale.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatNGN(sale.priceAtSale)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatNGN(sale.priceAtSale * sale.quantity)}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {format(new Date(sale.createdAt), "dd MMM yyyy, h:mm a")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(sale)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit sale"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteSale(sale)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete sale"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Sale Modal */}
      {showRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Record Sale</h2>
              <button onClick={() => setShowRecord(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {recordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {recordError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                <select
                  value={recordProductId}
                  onChange={(e) => setRecordProductId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Select a product...</option>
                  {products.filter((p) => p.quantity > 0).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatNGN(p.price)} ({p.quantity} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Sold</label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduct?.quantity}
                  value={recordQty}
                  onChange={(e) => setRecordQty(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {selectedProduct && (
                  <p className="text-xs text-slate-400 mt-1">Max available: {selectedProduct.quantity}</p>
                )}
              </div>

              {selectedProduct && parseInt(recordQty) > 0 && (
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Price per unit:</span>
                    <span className="font-medium">{formatNGN(selectedProduct.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-600">Total amount:</span>
                    <span className="font-bold text-indigo-600">{formatNGN(selectedProduct.price * (parseInt(recordQty) || 0))}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRecord(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRecord}
                disabled={recordLoading}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {recordLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : "Record Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Edit Sale</h2>
              <button onClick={() => setEditSale(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">{editSale.product.name}</p>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price at Sale (₦)</label>
                <input
                  type="number"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditSale(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={editLoading}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Sale?</h2>
            <p className="text-sm text-slate-500 text-center mb-1">
              {deleteSale.quantity} unit(s) of <span className="font-medium text-slate-700">{deleteSale.product.name}</span>
            </p>
            <p className="text-xs text-slate-400 text-center mb-6">
              Stock will be restored. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteSale(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
