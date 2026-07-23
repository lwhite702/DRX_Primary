"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function ConvexSpikeDashboard() {
  const products = useQuery(api.products.listProducts, {}) || [];
  const sales = useQuery(api.checkout.getSalesHistory, {}) || [];

  const createProductMut = useMutation(api.products.createProduct);
  const recordIntakeMut = useMutation(api.intake.recordIntake);
  const processCheckoutMut = useMutation(api.checkout.processCheckout);

  const [sku, setSku] = useState("PRD-001");
  const [productName, setProductName] = useState("Premium Extract");
  const [priceCents, setPriceCents] = useState(2500); // $25.00
  const [intakeWeight, setIntakeWeight] = useState(100);
  const [intakeCost, setIntakeCost] = useState(10000); // $100.00
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const handleCreateProduct = async () => {
    try {
      const id = await createProductMut({
        sku,
        productName,
        sellingPriceCents: priceCents,
        unitCostCents: Math.round(intakeCost / Math.max(1, intakeWeight)),
      });
      alert(`Product created with ID: ${id}`);
    } catch (err: any) {
      alert(`Error creating product: ${err.message}`);
    }
  };

  const handleRecordIntake = async () => {
    if (!selectedProductId) return alert("Select a product first");
    try {
      const res = await recordIntakeMut({
        productId: selectedProductId as any,
        totalWeightGrams: intakeWeight,
        totalCostCents: intakeCost,
        supplier: "Green Harvest Supplies",
      });
      alert(`Intake recorded! New stock: ${res.newStock}g`);
    } catch (err: any) {
      alert(`Error recording intake: ${err.message}`);
    }
  };

  const handleCheckout = async () => {
    if (!selectedProductId) return alert("Select a product first");
    try {
      const res = await processCheckoutMut({
        orderNumber: `ORD-${Date.now()}`,
        items: [{ productId: selectedProductId as any, quantityGrams: 10 }],
        paymentMethod: "cash",
        amountPaidCents: 3000, // $30.00 cash
      });
      alert(`Checkout completed! Order ${res.orderNumber}, Total: $${(res.totalAmountCents / 100).toFixed(2)}`);
    } catch (err: any) {
      alert(`Error processing checkout: ${err.message}`);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-slate-950 text-slate-100 min-h-screen font-sans">
      <header className="border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-bold text-emerald-400">DRX Convex Vertical-Slice Spike</h1>
        <p className="text-slate-400 text-sm mt-1">
          Reactive backend architecture spike using integer financial accounting & FIFO batch allocations.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Creation Card */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
          <h2 className="text-xl font-semibold text-indigo-400">1. Product Management</h2>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-slate-400">SKU</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 mt-1 text-white"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-400">Product Name</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 mt-1 text-white"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-400">Selling Price (Cents)</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 mt-1 text-white"
                value={priceCents}
                onChange={(e) => setPriceCents(Number(e.target.value))}
              />
            </div>
            <button
              onClick={handleCreateProduct}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 font-medium rounded text-white transition"
            >
              Create Product
            </button>
          </div>
        </div>

        {/* Intake & Batch Card */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
          <h2 className="text-xl font-semibold text-emerald-400">2. FIFO Inventory Intake</h2>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-slate-400">Select Product</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 mt-1 text-white"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">-- Choose Product --</option>
                {products.map((p: any) => (
                  <option key={p._id} value={p._id}>
                    {p.productName} ({p.sku}) - Stock: {p.quantityOnHandGrams}g
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400">Total Grams</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 mt-1 text-white"
                  value={intakeWeight}
                  onChange={(e) => setIntakeWeight(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-slate-400">Total Cost (Cents)</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 mt-1 text-white"
                  value={intakeCost}
                  onChange={(e) => setIntakeCost(Number(e.target.value))}
                />
              </div>
            </div>
            <button
              onClick={handleRecordIntake}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-medium rounded text-white transition"
            >
              Record Batch Intake
            </button>
          </div>
        </div>
      </div>

      {/* POS Authoritative Checkout */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
        <h2 className="text-xl font-semibold text-amber-400">3. Authoritative Checkout (10g Purchase)</h2>
        <p className="text-xs text-slate-400">
          Calculates subtotal, applies tax (8.25%), allocates active FIFO inventory batches, and updates ledger.
        </p>
        <button
          onClick={handleCheckout}
          className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-semibold rounded text-white transition text-lg"
        >
          Process Authoritative Checkout (10g)
        </button>
      </div>

      {/* Reactive Real-Time Sales Feed */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
        <h2 className="text-xl font-semibold text-cyan-400">4. Live Reactive Sales History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-2">Order #</th>
                <th className="p-2">Subtotal</th>
                <th className="p-2">Tax (8.25%)</th>
                <th className="p-2">Total</th>
                <th className="p-2">Status</th>
                <th className="p-2">Created At</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">
                    No sales recorded yet. Execute a checkout to see live updates.
                  </td>
                </tr>
              ) : (
                sales.map((s: any) => (
                  <tr key={s._id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="p-2 font-mono text-amber-300">{s.orderNumber}</td>
                    <td className="p-2">${(s.subtotalCents / 100).toFixed(2)}</td>
                    <td className="p-2">${(s.taxAmountCents / 100).toFixed(2)}</td>
                    <td className="p-2 font-bold text-emerald-400">${(s.totalAmountCents / 100).toFixed(2)}</td>
                    <td className="p-2 uppercase text-xs text-slate-300">{s.orderStatus}</td>
                    <td className="p-2 text-slate-500">{new Date(s.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
