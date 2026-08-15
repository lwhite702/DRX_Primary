"use client";

import { useState, useEffect, type FormEvent } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, User, Settings } from "lucide-react";
import { useUser } from "@/lib/adapters/auth/ui";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    setLoading(!isLoaded);
  }, [isLoaded]);

  const handleSecurityNotice = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setUpdating(true);
    try {
      toast.info("Password changes and security settings are managed in Clerk.");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error(error?.message || "Unable to open security settings right now.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              value={user?.primaryEmailAddress?.emailAddress || ""}
              disabled
              readOnly
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Your email address is managed by your administrator.
            </p>
          </div>
          <div className="space-y-2">
            <Label>User ID</Label>
            <Input
              value={user?.id || ""}
              disabled
              readOnly
              className="bg-muted font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Security settings are managed by Clerk</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSecurityNotice} className="space-y-4">
            <div className="rounded-md border border-dashed border-muted px-4 py-3 text-sm text-muted-foreground">
              Open your Clerk profile/security settings to update your password or manage active sessions.
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button type="submit" disabled={updating} variant="outline">
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <Settings className="mr-2 h-4 w-4" />
                    Open Security Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
