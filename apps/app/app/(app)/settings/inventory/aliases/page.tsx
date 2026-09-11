"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useBusiness } from "@/lib/hooks/use-business";
import { changeUnitAlias, loadUnitAliases } from "@/lib/inventory/unit-aliases-client";
import { formatQuantity } from "@/lib/number-format";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Alias {
  id: string;
  alias_name: string;
  standard_unit: "g" | "oz";
  quantity: number;
  is_enabled: boolean;
  is_system_default: boolean;
}

export default function AliasesSettingsPage() {
  const { business, loading: businessLoading } = useBusiness();
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newAlias, setNewAlias] = useState<{
    alias_name: string;
    standard_unit: "g" | "oz";
    quantity: string;
  }>({
    alias_name: "",
    standard_unit: "g",
    quantity: "",
  });
  const businessId = business?.id as string | undefined;
  const currentBusiness = useRef(businessId); currentBusiness.current = businessId;
  const generation = useRef(0);
  const [loadedBusiness, setLoadedBusiness] = useState<string>();
  const [loadError, setLoadError] = useState(false);
  const fetchAliases = async (id: string, signal?: AbortSignal) => {
    const epoch = generation.current;
    const rows = await loadUnitAliases(id, signal);
    if (currentBusiness.current === id && generation.current === epoch && !signal?.aborted) { setAliases(rows); setLoadedBusiness(id); setLoadError(false); }
  };
  useEffect(() => {
    generation.current++;
    const controller = new AbortController(); setAliases([]); setLoadedBusiness(undefined); setLoadError(false); setSaving(false);
    if (!businessId) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    fetchAliases(businessId, controller.signal).catch(() => { if (!controller.signal.aborted) setLoadError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [businessId]);
  const runChange = async (operation: (id: string) => Promise<string>) => {
    if (!businessId || saving) return;
    const id = businessId, epoch = generation.current; setSaving(true);
    try {
      const message = await operation(id);
      if (currentBusiness.current !== id || generation.current !== epoch) return;
      await fetchAliases(id);
      if (currentBusiness.current === id && generation.current === epoch) toast.success(message);
    } catch (error) { if (currentBusiness.current === id && generation.current === epoch) toast.error(error instanceof Error ? error.message : "Failed to change alias"); }
    finally { if (currentBusiness.current === id && generation.current === epoch) setSaving(false); }
  };
  const handleToggle = (id: string, enabled: boolean) => runChange(async business => { await changeUnitAlias(business, { action: "toggle", id, enabled }); return enabled ? "Alias enabled" : "Alias disabled"; });
  const handleDelete = (id: string) => runChange(async business => { await changeUnitAlias(business, { action: "remove", id }); return "Alias deleted"; });
  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const quantity = Number(newAlias.quantity);
    if (!newAlias.alias_name.trim() || !newAlias.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) { toast.error("Enter an alias and a positive quantity"); return; }
    return runChange(async business => {
      await changeUnitAlias(business, { action: "create", name: newAlias.alias_name, standardUnit: newAlias.standard_unit, quantity });
      if (currentBusiness.current === business) setNewAlias({ alias_name: "", standard_unit: "g", quantity: "" });
      return "Alias added successfully";
    });
  };
  const handleRestoreDefaults = () => {
    if (!confirm("Restore saved default aliases? Custom aliases will be preserved.")) return;
    return runChange(async business => {
      let cursor: string | null = null, found = 0; const seen = new Set<string>();
      for (;;) {
        const result = await changeUnitAlias(business, { action: "restore", cursor }); found += result.found;
        if (result.isDone) break;
        if (seen.has(result.continueCursor)) throw new Error("Alias restoration could not finish");
        seen.add(result.continueCursor); cursor = result.continueCursor;
      }
      if (!found) throw new Error("No saved defaults are available. Historical defaults need to be restored first.");
      return "Saved default aliases restored";
    });
  };

  if (businessLoading || loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!businessId) return <p className="p-8">Select a business to manage aliases.</p>;
  if (loadError) return <p role="alert" className="p-8">Aliases could not be loaded. Reload to try again.</p>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Product Aliases</h1>
          <p className="text-muted-foreground mt-2">
            Manage custom terminology and unit mappings (e.g., "Eightball" =
            3.5g)
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRestoreDefaults}
          disabled={saving}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Restore Defaults
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Alias</CardTitle>
          <CardDescription>
            Create a business-specific unit nickname
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleAdd}
            className="flex flex-col md:flex-row gap-4 items-end"
          >
            <div className="flex-1 space-y-2 w-full">
              <label className="text-sm font-medium">Alias / Nickname</label>
              <Input
                placeholder="e.g., Slim"
                value={newAlias.alias_name}
                onChange={(e) =>
                  setNewAlias({ ...newAlias, alias_name: e.target.value })
                }
              />
            </div>
            <div className="w-full md:w-32 space-y-2">
              <label className="text-sm font-medium">Base Unit</label>
              <Select
                value={newAlias.standard_unit}
                onValueChange={(val: "g" | "oz") =>
                  setNewAlias({ ...newAlias, standard_unit: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">Grams (g)</SelectItem>
                  <SelectItem value="oz">Ounces (oz)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-32 space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                step="0.0001"
                placeholder="0.0"
                value={newAlias.quantity}
                onChange={(e) =>
                  setNewAlias({ ...newAlias, quantity: e.target.value })
                }
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Alias
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alias</TableHead>
                <TableHead>Target Unit</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(loadedBusiness === businessId ? aliases : []).map((alias) => (
                <TableRow key={alias.id}>
                  <TableCell className="font-semibold">
                    {alias.alias_name}
                  </TableCell>
                  <TableCell>
                    {alias.standard_unit === "g" ? "Grams (g)" : "Ounces (oz)"}
                  </TableCell>
                  <TableCell>{formatQuantity(alias.quantity)}</TableCell>
                  <TableCell>
                    <Switch
                      disabled={saving}
                      checked={alias.is_enabled}
                      onCheckedChange={(val) => handleToggle(alias.id, val)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={saving}
                      aria-label={`Delete ${alias.alias_name}`}
                      onClick={() => handleDelete(alias.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {aliases.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No aliases found. Add your first one above!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
