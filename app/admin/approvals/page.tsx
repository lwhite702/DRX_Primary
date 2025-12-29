"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface IntakeRequest {
  id: string;
  inventory_id: string;
  product_name: string; // Joined
  sku: string; // Joined
  total_cost: number;
  total_weight_grams: number;
  calculated_cost_per_gram: number;
  delivery_cost: number;
  supplier: string;
  created_at: string;
  created_by_email: string; // Joined
  status: string;
  unit_of_measure?: string;
}

export default function ApprovalsPage() {
  const [intakes, setIntakes] = useState<IntakeRequest[]>([]);
  const [history, setHistory] = useState<IntakeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntake, setSelectedIntake] = useState<IntakeRequest | null>(
    null
  );

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState({
    total_cost: 0,
    total_weight_grams: 0,
    delivery_cost: 0,
    supplier: "",
  });

  // Reject Modal State
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const supabase = getSupabaseClient();

  const fetchIntakes = async () => {
    try {
      setLoading(true);
      // Fetch Pending
      const { data: pendingData, error: pendingError } = await supabase
        .from("inventory_intakes")
        .select(
          `
          *,
          inventory:inventory_id (product_name, sku, unit_of_measure),
          submitter:created_by (email)
        `
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;

      // Fetch History (Last 20)
      const { data: historyData, error: historyError } = await supabase
        .from("inventory_intakes")
        .select(
          `
            *,
            inventory:inventory_id (product_name, sku, unit_of_measure),
            submitter:created_by (email)
          `
        )
        .in("status", ["approved", "rejected"])
        .order("updated_at", { ascending: false })
        .limit(20);

      if (historyError) throw historyError;

      // Transform joined data
      const transform = (data: any[]) =>
        data.map((item) => ({
          ...item,
          product_name: item.inventory?.product_name || "Unknown",
          sku: item.inventory?.sku || "N/A",
          unit_of_measure: item.inventory?.unit_of_measure || "g",
          created_by_email: item.submitter?.email || "Unknown",
        }));

      setIntakes(transform(pendingData || []));
      setHistory(transform(historyData || []));
    } catch (error) {
      console.error("Error fetching approvals:", error);
      toast.error("Failed to load approval queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntakes();
  }, []);

  const handleApprove = async (withEdits = false) => {
    if (!selectedIntake) return;

    try {
      const payload: any = {
        intake_id: selectedIntake.id,
        action: "approve",
      };

      if (withEdits) {
        payload.override_values = {
          total_cost: Number(editValues.total_cost),
          total_weight_grams: Number(editValues.total_weight_grams),
          delivery_cost: Number(editValues.delivery_cost),
          supplier: editValues.supplier,
        };
      }

      const res = await fetch("/api/inventory/intake/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      toast.success(result.message);
      setEditOpen(false);
      fetchIntakes();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve intake");
    }
  };

  const handleReject = async () => {
    if (!selectedIntake) return;

    try {
      const res = await fetch("/api/inventory/intake/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intake_id: selectedIntake.id,
          action: "reject",
          rejection_reason: rejectionReason,
        }),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      toast.success("Intake rejected");
      setRejectOpen(false);
      setRejectionReason("");
      fetchIntakes();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject intake");
    }
  };

  const openEditModal = (intake: IntakeRequest) => {
    setSelectedIntake(intake);
    setEditValues({
      total_cost: intake.total_cost,
      total_weight_grams: intake.total_weight_grams,
      delivery_cost: intake.delivery_cost || 0,
      supplier: intake.supplier || "",
    });
    setEditOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approval Inbox</h1>
          <p className="text-muted-foreground mt-2">
            Review and manage pending inventory actions
          </p>
        </div>
        <Button onClick={fetchIntakes} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending{" "}
            <Badge className="ml-2" variant="secondary">
              {intakes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <div className="py-10 text-center">Loading...</div>
          ) : intakes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border rounded-lg bg-muted/10">
              <CheckCircle className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">All caught up!</h3>
              <p className="text-muted-foreground">
                No pending approvals found.
              </p>
            </div>
          ) : (
            intakes.map((intake) => (
              <Card key={intake.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {intake.product_name}
                      </CardTitle>
                      <CardDescription>SKU: {intake.sku}</CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 border-yellow-200"
                    >
                      Pending Review
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-4 gap-4 text-sm pb-3">
                  <div>
                    <span className="text-muted-foreground block text-xs">
                      Total Cost
                    </span>
                    <span className="font-semibold text-lg">
                      {formatCurrency(intake.total_cost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">
                      Quantity Received
                    </span>
                    <span className="font-semibold text-lg">
                      {intake.total_weight_grams} {intake.unit_of_measure}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">
                      Cost Per Unit
                    </span>
                    <span className="font-semibold text-lg">
                      {formatCurrency(intake.calculated_cost_per_gram)}/
                      {intake.unit_of_measure}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">
                      Supplier
                    </span>
                    <span className="font-medium">
                      {intake.supplier || "N/A"}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t bg-muted/10 p-4">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Submitted by {intake.created_by_email} on{" "}
                    {new Date(intake.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedIntake(intake);
                        setRejectOpen(true);
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(intake)}
                    >
                      Edit & Approve
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedIntake(intake);
                        handleApprove(false); // Direct approve
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {history.map((intake) => (
            <Card
              key={intake.id}
              className="opacity-75 hover:opacity-100 transition-opacity"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">
                      {intake.product_name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      SKU: {intake.sku}
                    </CardDescription>
                  </div>
                  {intake.status === "approved" ? (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      Approved
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Rejected</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-sm pb-3 text-muted-foreground">
                <div className="flex justify-between">
                  <span>{formatCurrency(intake.total_cost)}</span>
                  <span>
                    {intake.total_weight_grams}
                    {intake.unit_of_measure}
                  </span>
                  <span>
                    {new Date(intake.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Edit & Approve Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit & Approve Intake</DialogTitle>
            <DialogDescription>
              Modify the intake values before finalizing approval. This will
              update the inventory record with these verified numbers.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editValues.total_cost}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      total_cost: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Total Weight ({selectedIntake?.unit_of_measure})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editValues.total_weight_grams}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      total_weight_grams: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input
                value={editValues.supplier}
                onChange={(e) =>
                  setEditValues({ ...editValues, supplier: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={editValues.delivery_cost}
                onChange={(e) =>
                  setEditValues({
                    ...editValues,
                    delivery_cost: parseFloat(e.target.value),
                  })
                }
              />
            </div>

            {/* Real-time Calculation Preview */}
            <div className="bg-muted p-3 rounded text-sm space-y-1">
              <div className="flex justify-between font-medium">
                <span>New Unit Cost:</span>
                <span>
                  {editValues.total_weight_grams > 0
                    ? formatCurrency(
                        editValues.total_cost / editValues.total_weight_grams
                      )
                    : "$0.00"}
                  / {selectedIntake?.unit_of_measure}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Original:</span>
                <span>
                  {formatCurrency(
                    selectedIntake?.calculated_cost_per_gram || 0
                  )}{" "}
                  / {selectedIntake?.unit_of_measure}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleApprove(true)}>
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Intake</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this intake. The submitter
              will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
