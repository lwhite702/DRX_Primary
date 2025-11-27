"use client";

import { useEffect, useState } from "react";
import { offlineSyncManager } from "@/lib/utils/offline-sync";
import { toast } from "sonner";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineProvider({ children }: { children: React.ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        // Initialize sync manager
        offlineSyncManager.init().catch(console.error);

        // Set initial state
        setIsOnline(navigator.onLine);

        // Setup listeners
        const handleOnline = async () => {
            setIsOnline(true);
            toast.success("Back online. Syncing data...");
            setIsSyncing(true);

            try {
                const result = await offlineSyncManager.syncPendingTransactions();
                if (result.success > 0) {
                    toast.success(`Synced ${result.success} offline transactions`);
                }
                if (result.failed > 0) {
                    toast.error(`Failed to sync ${result.failed} transactions`);
                }
                setPendingCount(0);
            } catch (error) {
                console.error("Sync failed:", error);
            } finally {
                setIsSyncing(false);
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast.warning("You are offline. Changes will be saved locally.");
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Check pending count periodically
        const interval = setInterval(async () => {
            const count = await offlineSyncManager.getPendingCount();
            setPendingCount(count);
        }, 5000);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            clearInterval(interval);
        };
    }, []);

    return (
        <>
            {children}

            {/* Network Status Indicator */}
            <div className={cn(
                "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium shadow-lg transition-all duration-300",
                isOnline ? "bg-background border opacity-0 hover:opacity-100" : "bg-destructive text-destructive-foreground opacity-100",
                (isSyncing || pendingCount > 0) && "opacity-100 bg-primary text-primary-foreground"
            )}>
                {!isOnline ? (
                    <>
                        <WifiOff className="h-4 w-4" />
                        <span>Offline</span>
                    </>
                ) : isSyncing ? (
                    <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Syncing...</span>
                    </>
                ) : pendingCount > 0 ? (
                    <>
                        <RefreshCw className="h-4 w-4" />
                        <span>{pendingCount} Pending</span>
                    </>
                ) : (
                    <>
                        <Wifi className="h-4 w-4" />
                        <span>Online</span>
                    </>
                )}
            </div>
        </>
    );
}
