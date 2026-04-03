"use client";

import { useState, useEffect } from "react";
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
import { createAppClient } from "@/lib/data/client/supabase-client";
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
  const supabase = createAppClient();

  const fetchAliases = async () => {
    if (!business?.id || !supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_unit_aliases")
        .select("*")
        .eq("business_id", business.id)
        .order("alias_name", { ascending: true });

      if (error) throw error;
      setAliases(data || []);
    } catch (error: any) {
      console.error("Error fetching aliases:", error);
      toast.error("Failed to load aliases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAliases();
  }, [business?.id]);

  const handleToggle = async (id: string, isEnabled: boolean) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("product_unit_aliases")
        .update({ is_enabled: isEnabled })
        .eq("id", id);

      if (error) throw error;
      setAliases(
        aliases.map((a) => (a.id === id ? { ...a, is_enabled: isEnabled } : a)),
      );
      toast.success(isEnabled ? "Alias enabled" : "Alias disabled");
    } catch (error: any) {
      console.error("Error toggling alias:", error);
      toast.error("Failed to update alias");
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("product_unit_aliases")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setAliases(aliases.filter((a) => a.id !== id));
      toast.success("Alias deleted");
    } catch (error: any) {
      console.error("Error deleting alias:", error);
      toast.error("Failed to delete alias");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !supabase) return;
    if (!newAlias.alias_name || !newAlias.quantity) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("product_unit_aliases")
        .insert({
          business_id: business.id,
          alias_name: newAlias.alias_name,
          standard_unit: newAlias.standard_unit,
          quantity: parseFloat(newAlias.quantity),
          is_system_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      setAliases(
        [...aliases, data].sort((a, b) =>
          a.alias_name.localeCompare(b.alias_name),
        ),
      );
      setNewAlias({ alias_name: "", standard_unit: "g", quantity: "" });
      toast.success("Alias added successfully");
    } catch (error: any) {
      console.error("Error adding alias:", error);
      toast.error(
        error.code === "23505"
          ? "Alias name already exists"
          : "Failed to add alias",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (!business?.id || !supabase) return;
    if (
      !confirm(
        "Are you sure you want to restore all system default aliases? This will not delete your custom ones.",
      )
    )
      return;

    setSaving(true);
    try {
      const { error } = await supabase.rpc("seed_business_unit_aliases", {
        target_business_id: business.id,
      });
      if (error) throw error;
      await fetchAliases();
      toast.success("Default aliases restored");
    } catch (error: any) {
      console.error("Error restoring defaults:", error);
      toast.error("Failed to restore defaults");
    } finally {
      setSaving(false);
    }
  };

  if (businessLoading || loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

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
              {aliases.map((alias) => (
                <TableRow key={alias.id}>
                  <TableCell className="font-semibold">
                    {alias.alias_name}
                  </TableCell>
                  <TableCell>
                    {alias.standard_unit === "g" ? "Grams (g)" : "Ounces (oz)"}
                  </TableCell>
                  <TableCell>{alias.quantity}</TableCell>
                  <TableCell>
                    <Switch
                      checked={alias.is_enabled}
                      onCheckedChange={(val) => handleToggle(alias.id, val)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
