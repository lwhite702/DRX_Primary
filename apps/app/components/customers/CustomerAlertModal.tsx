"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, AlertTriangle, CheckCircle, FileText, Plus, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";

export interface CustomerNoteRecord {
  _id: string;
  classification: "alert" | "note";
  message: string;
  severity?: "info" | "warning" | "critical";
  authorName?: string;
  createdFrom?: "sale_screen" | "customer_screen";
  isActive: boolean;
  createdAt: number;
}

interface CustomerAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  customerName: string;
  totalCreditUsed?: number;
  createdFrom?: "sale_screen" | "customer_screen";
  onNoteAdded?: () => void;
}

export function CustomerAlertModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  totalCreditUsed = 0,
  createdFrom = "sale_screen",
  onNoteAdded,
}: CustomerAlertModalProps) {
  const [alerts, setAlerts] = useState<CustomerNoteRecord[]>([]);
  const [notes, setNotes] = useState<CustomerNoteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [classification, setClassification] = useState<"alert" | "note">("alert");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("warning");
  const [message, setMessage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadNotes = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setNotes(data.notes || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      void loadNotes();
    }
  }, [isOpen, customerId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !message.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classification,
          severity: classification === "alert" ? severity : undefined,
          message: message.trim(),
          authorName: authorName.trim() || undefined,
          createdFrom,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add note");
      }

      toast.success(classification === "alert" ? "Alert created" : "Note saved");
      setMessage("");
      setShowAddForm(false);
      await loadNotes();
      onNoteAdded?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismissAlert = async (noteId: string) => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      if (res.ok) {
        toast.success("Alert dismissed");
        setAlerts((prev) => prev.filter((a) => a._id !== noteId));
      }
    } catch {
      toast.error("Failed to dismiss alert");
    }
  };

  const hasOutstandingBalance = totalCreditUsed > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-[#0F0F12] border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <DialogTitle className="text-lg font-bold tracking-wide">
              Customer Account Notice
            </DialogTitle>
          </div>
          <DialogDescription className="text-white/60">
            Account alerts and notices for{" "}
            <span className="font-semibold text-white">{customerName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Outstanding Balance Banner */}
          {hasOutstandingBalance && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-3.5 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-red-300">
                    Outstanding Credit Balance
                  </h4>
                  <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/30">
                    Past Due / On Account
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-white/80">
                  This customer currently has an unpaid store credit balance of{" "}
                  <strong className="text-red-300 font-bold text-sm">
                    ${totalCreditUsed.toFixed(2)}
                  </strong>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Active Alerts List */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Active Alerts ({alerts.length})
              </h4>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${
                      alert.severity === "critical"
                        ? "border-red-500/30 bg-red-500/10"
                        : alert.severity === "warning"
                          ? "border-amber-500/30 bg-amber-500/10"
                          : "border-blue-500/30 bg-blue-500/10"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase ${
                            alert.severity === "critical"
                              ? "border-red-400 text-red-300"
                              : alert.severity === "warning"
                                ? "border-amber-400 text-amber-300"
                                : "border-blue-400 text-blue-300"
                          }`}
                        >
                          {alert.severity || "warning"} alert
                        </Badge>
                        {alert.authorName && (
                          <span className="text-[11px] text-white/50">
                            By {alert.authorName}
                          </span>
                        )}
                        <span className="text-[11px] text-white/40">
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white">{alert.message}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismissAlert(alert._id)}
                      className="text-white/50 hover:text-white hover:bg-white/10 h-7 px-2 text-xs"
                      title="Dismiss alert"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Notes List */}
          {notes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Account Notes ({notes.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {notes.map((note) => (
                  <div
                    key={note._id}
                    className="rounded-lg border border-white/5 bg-white/5 p-2.5 text-xs text-white/90 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-white/50">
                      <span>{note.authorName || "Operator"}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-white/80">{note.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Note / Alert Form */}
          {showAddForm ? (
            <form onSubmit={handleAddNote} className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  Add New Customer Notice
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                  className="h-6 w-6 p-0 text-white/50 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-white/70">Classification</Label>
                  <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as "alert" | "note")}
                    className="w-full h-8 rounded-md bg-secondary/30 border border-white/10 px-2 text-xs text-white"
                  >
                    <option value="alert">Alert (Pops up automatically)</option>
                    <option value="note">Note (Account memo)</option>
                  </select>
                </div>

                {classification === "alert" ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-white/70">Severity</Label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full h-8 rounded-md bg-secondary/30 border border-white/10 px-2 text-xs text-white"
                    >
                      <option value="warning">Warning (Amber)</option>
                      <option value="critical">Critical (Red)</option>
                      <option value="info">Info (Blue)</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs text-white/70">Author Name (Optional)</Label>
                    <Input
                      placeholder="e.g. Alex"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="h-8 text-xs bg-secondary/30 border-white/10"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-white/70">Message</Label>
                <Textarea
                  placeholder={
                    classification === "alert"
                      ? "e.g. Require ID check, or customer has store credit terms..."
                      : "e.g. Preferred strain, loyalty preferences, birthday promo..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="text-xs bg-secondary/30 border-white/10 text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !message.trim()}
                  className="h-8 text-xs bg-accent text-black hover:bg-accent/90 font-bold"
                >
                  {submitting ? "Saving..." : `Save ${classification === "alert" ? "Alert" : "Note"}`}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="w-full border-dashed border-white/20 text-xs text-white/70 hover:text-white hover:bg-white/5 py-2"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Customer Alert or Note
            </Button>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-white/10">
          <Button
            type="button"
            onClick={onClose}
            className="w-full bg-accent text-black hover:bg-accent/90 font-bold tracking-wider"
          >
            Acknowledge & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
