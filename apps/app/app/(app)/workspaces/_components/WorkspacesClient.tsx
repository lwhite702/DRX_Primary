"use client";

import React from "react";
import { useBusiness } from "@/lib/hooks/use-business";
import {
  WorkspaceCard,
  PrivacyStatus,
  DeviceType,
} from "../_components/WorkspaceCard";
import {
  AlertTriangle,
  Database,
  ShieldCheck,
  History,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default function WorkspacesClient() {
  const { availableBusinesses, business, switchBusiness, loading } =
    useBusiness();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4ADE80]" />
      </div>
    );
  }

  // Helper to generate consistent mock data for UI demo purposes
  const getMockData = (index: number) => {
    const devices: DeviceType[] = [
      "iPhone 15 Pro",
      "Web Desktop",
      "iPad Pro",
      "Android Phone",
    ];
    const locations = [
      "San Francisco, CA",
      "Oakland, CA",
      "San Jose, CA",
      "Los Angeles, CA",
    ];
    const privacy: PrivacyStatus[][] = [
      ["BALANCED"],
      ["MAX SECURE"],
      ["ACTIVE"],
      ["PRIVATE"],
    ];
    const colors = [
      "bg-purple-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-orange-500",
    ];

    return {
      device: devices[index % devices.length],
      location: locations[index % locations.length],
      privacy: privacy[index % privacy.length],
      color: colors[index % colors.length],
      lastAccess: `${Math.floor(Math.random() * 24) + 1} hours ago`,
    };
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans selection:bg-[#4ADE80] selection:text-black">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Tenant Isolation Warning */}
        <div className="bg-[#1A1500]/50 border border-[#423D00] rounded-xl p-6 flex items-start gap-5 relative overflow-hidden">
          <div className="text-[#FFD600] mt-1">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-2 relative z-10">
            <h3 className="text-[#FFD600] font-bold text-sm tracking-wider uppercase">
              Tenant Isolation Active
            </h3>
            <p className="text-sm text-[#CCAB00] leading-relaxed max-w-3xl">
              All data, settings, inventory, customers, and transactions are
              strictly scoped to each business tenant. Switching businesses is
              an intentional action that changes your entire operational
              context.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 mt-4 text-xs text-[#998000]">
              <li className="flex items-center gap-2">
                No data sharing between tenants
              </li>
              <li className="flex items-center gap-2">
                Your role and permissions may differ per business
              </li>
              <li className="flex items-center gap-2">
                Privacy settings are business-specific
              </li>
              <li className="flex items-center gap-2">
                All switches are logged and audited
              </li>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#FFD600]/0 via-[#FFD600]/5 to-[#FFD600]/0 pointer-events-none" />
        </div>

        {/* Header */}
        <PageHeader
          title="Choose Your Workspace"
          description="You have access to multiple business tenants. Select the business you want to operate within. Only tenants you have explicit membership to are shown."
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#4ADE80] animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-[#4ADE80] uppercase">
              Select Business Tenant
            </span>
          </div>
        </PageHeader>

        {/* Business List */}
        <div className="space-y-4">
          {availableBusinesses.map((b, i) => {
            const mockor = getMockData(i);
            const isActive = b.id === business?.id;

            return (
              <WorkspaceCard
                key={b.id}
                id={b.id}
                name={b.business_name}
                tenantId={`TENANT ${i + 20} - ${b.id.substring(0, 8).toUpperCase()}`}
                initials={b.business_name.substring(0, 2).toUpperCase()}
                isActive={isActive}
                onSelect={() => switchBusiness(b.id)}
                // Mocks
                lastAccess={isActive ? "Active Now" : mockor.lastAccess}
                location={mockor.location}
                device={mockor.device}
                privacyStatus={mockor.privacy}
                color={mockor.color}
              />
            );
          })}
        </div>

        {/* Info Section */}
        <div className="border border-white/5 rounded-2xl p-8 bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-[#4ADE80]/20 p-2 rounded-lg text-[#4ADE80]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">
              Understanding Tenant Isolation
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/40 border border-white/5 p-5 rounded-xl flex gap-4">
              <Database className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-white mb-1">
                  Separate Data Silos
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Products, inventory, customers, sales, and reports are unique
                  to each tenant. No cross-tenant visibility.
                </p>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 p-5 rounded-xl flex gap-4">
              <History className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-white mb-1">
                  Audit Trail
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All tenant switches are logged with timestamp, device, and
                  location for security and compliance purposes.
                </p>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 p-5 rounded-xl flex gap-4">
              <Search className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-white mb-1">
                  No Cross-Tenant Search
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Search, filters, and reports are scoped exclusively to the
                  active tenant. You cannot search across tenants.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Definitions */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
            Role Definitions
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-[#111] border border-white/5 rounded-lg p-4 flex items-start gap-4 hover:bg-[#151515] transition-colors">
              <div className="bg-[#4ADE80]/10 text-[#4ADE80] px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-[#4ADE80]/20 shrink-0 mt-0.5">
                OWNER
              </div>
              <div>
                <h4 className="font-bold text-sm text-white mb-1">
                  Full Administrative Control
                </h4>
                <p className="text-xs text-muted-foreground">
                  Access to all features including settings, privacy controls,
                  failsafes, role management, compliance exports, and billing.
                  Can manage all users and data.
                </p>
              </div>
            </div>
            <div className="bg-[#111] border border-white/5 rounded-lg p-4 flex items-start gap-4 hover:bg-[#151515] transition-colors">
              <div className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-blue-500/20 shrink-0 mt-0.5">
                MANAGER
              </div>
              <div>
                <h4 className="font-bold text-sm text-white mb-1">
                  Operational Management
                </h4>
                <p className="text-xs text-muted-foreground">
                  Access to inventory management, reporting, advanced workflows,
                  and customer credit. Limited settings access. Cannot modify
                  privacy or failsafe configurations.
                </p>
              </div>
            </div>
            <div className="bg-[#111] border border-white/5 rounded-lg p-4 flex items-start gap-4 hover:bg-[#151515] transition-colors">
              <div className="bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-purple-500/20 shrink-0 mt-0.5">
                STAFF
              </div>
              <div>
                <h4 className="font-bold text-sm text-white mb-1">
                  Point-of-Sale Operations
                </h4>
                <p className="text-xs text-muted-foreground">
                  Primary focus on fast sales transactions. Limited inventory
                  intake access if enabled by owner. Minimal data exposure and
                  no export capabilities.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Preset Overview */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
            Privacy Preset Overview
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
              <div className="w-24 shrink-0 text-right">
                <span className="bg-[#4ADE80]/10 text-[#4ADE80] px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-[#4ADE80]/20">
                  OPEN
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  Full Transparency Mode
                </h4>
                <p className="text-xs text-muted-foreground">
                  All customer details visible to authorized roles. Broader
                  export permissions.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
              <div className="w-24 shrink-0 text-right">
                <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-blue-500/20">
                  BALANCED
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  Standard Protection
                </h4>
                <p className="text-xs text-muted-foreground">
                  Normal operations with guardrails. Role-limited exports.
                  Recommended for most businesses.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
              <div className="w-24 shrink-0 text-right">
                <span className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-yellow-500/20">
                  PRIVATE
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  Enhanced Privacy
                </h4>
                <p className="text-xs text-muted-foreground">
                  Reduced PII in standard views. Stricter export controls.
                  Optional inactivity deletion timer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
              <div className="w-24 shrink-0 text-right">
                <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-500/20">
                  MAX SECURE
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  Maximum Security Mode
                </h4>
                <p className="text-xs text-muted-foreground">
                  Alias-only workflows. Minimal PII capture. Strict export
                  lockdown. Failsafes and doomsday mode available.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground/40 font-mono">
          DRX • Tenant Isolation Active • v2.4.1
        </div>
      </div>
    </div>
  );
}
