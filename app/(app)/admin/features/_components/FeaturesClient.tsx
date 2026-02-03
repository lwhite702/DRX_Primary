"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
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
import { PlusCircle, Trash2, Flag } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

type FeatureFlag = {
  id: string;
  description: string;
  is_global_enabled: boolean;
  created_at: string;
  updated_at?: string;
};

export function FeaturesClient() {
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFeature, setNewFeature] = useState({ id: "", description: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = getSupabaseClient();

  const fetchFeatures = async () => {
    if (!supabase) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("id");

      if (error) throw error;
      setFeatures(data || []);
    } catch (error) {
      console.error("Error fetching features:", error);
      toast.error("Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, [supabase]);

  const toggleFeature = async (id: string, currentValue: boolean) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("feature_flags")
        .update({ is_global_enabled: !currentValue })
        .eq("id", id);

      if (error) throw error;

      setFeatures(
        features.map((f) =>
          f.id === id ? { ...f, is_global_enabled: !currentValue } : f,
        ),
      );
      toast.success(
        `Feature ${id} ${!currentValue ? "enabled" : "disabled"} globally`,
      );
    } catch (error) {
      toast.error("Failed to update feature");
      console.error(error);
    }
  };

  const createFeature = async () => {
    if (!supabase) return;
    try {
      if (!newFeature.id) return;

      const { error } = await supabase.from("feature_flags").insert({
        id: newFeature.id,
        description: newFeature.description,
        is_global_enabled: false,
      });

      if (error) throw error;

      toast.success("Feature created");
      setNewFeature({ id: "", description: "" });
      setIsDialogOpen(false);
      fetchFeatures();
    } catch (error) {
      toast.error("Failed to create feature");
      console.error(error);
    }
  };

  const deleteFeature = async (id: string) => {
    if (!supabase) return;
    if (
      !confirm(
        "Are you sure? This will remove the feature flag from the system.",
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("feature_flags")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Feature deleted");
      setFeatures(features.filter((f) => f.id !== id));
    } catch (error) {
      toast.error("Failed to delete feature");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">
            Manage global feature availability and rollouts.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Feature
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Feature Flag</DialogTitle>
              <DialogDescription>
                Create a new feature flag key. Default state will be disabled.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="id">Feature ID (Key)</Label>
                <Input
                  id="id"
                  placeholder="e.g. ai_insights"
                  value={newFeature.id}
                  onChange={(e) =>
                    setNewFeature({ ...newFeature, id: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Input
                  id="desc"
                  placeholder="Feature description"
                  value={newFeature.description}
                  onChange={(e) =>
                    setNewFeature({
                      ...newFeature,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createFeature}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Global Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="p-0 border-none">
                  <div className="p-4">
                    <TableSkeleton rowCount={5} columnCount={4} />
                  </div>
                </TableCell>
              </TableRow>
            ) : features.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="p-0 border-none">
                  <div className="p-4">
                    <EmptyState
                      icon={Flag}
                      title="No feature flags"
                      description="Create a feature flag to control system behavior."
                      actionLabel="Add Feature"
                      onAction={() => setIsDialogOpen(true)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              features.map((feature) => (
                <TableRow key={feature.id}>
                  <TableCell className="font-mono">{feature.id}</TableCell>
                  <TableCell>{feature.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={feature.is_global_enabled}
                        onCheckedChange={() =>
                          toggleFeature(feature.id, feature.is_global_enabled)
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {feature.is_global_enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteFeature(feature.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
