/**
 * PropertiesTab — Desk Dashboard (desk.iresthailand.com)
 * Displays IRES properties with filters by quota, availability_status, listed_date
 *
 * Features:
 * - Filter by quota (Thai/Company/Foreign/Mixed)
 * - Filter by market status (Available/Pending/Sold/Reserved)
 * - Sort by listed_date (newest first)
 * - Editable status dropdown
 * - View type & drive_link display
 */

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Badge, Button, Card, Table, Select } from "shadcn/ui";
import { CalendarIcon, LinkIcon, EyeIcon } from "lucide-react";

const QUOTA_OPTIONS = ["Thai", "Company", "Foreign", "Mixed"];
const STATUS_OPTIONS = ["available", "pending", "sold", "reserved", "off-market"];

export default function PropertiesTabDesktop() {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [filters, setFilters] = useState({
    quota: "",
    availability_status: "",
    search: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Load properties on mount ────────────────────────────────────────
  useEffect(() => {
    fetchProperties();
  }, []);

  // ─── Fetch from Supabase ─────────────────────────────────────────────
  async function fetchProperties() {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("properties")
        .select(
          `id, property_id, property_name, category, deal, area, price, rent,
           beds, baths, sq_m, sq_w, status, pipeline_status,
           quota, availability_status, listed_date, drive_link, view_type,
           created_st`
        )
        .order("listed_date", { ascending: false, nullsLast: true });

      if (err) throw err;
      setProperties(data || []);
      applyFilters(data || [], filters);
    } catch (e) {
      console.error("Error fetching properties:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ─── Apply filters ──────────────────────────────────────────────────
  function applyFilters(props, filterObj) {
    let filtered = props;

    // Filter by quota
    if (filterObj.quota) {
      filtered = filtered.filter((p) => p.quota === filterObj.quota);
    }

    // Filter by availability_status
    if (filterObj.availability_status) {
      filtered = filtered.filter(
        (p) => p.availability_status === filterObj.availability_status
      );
    }

    // Filter by search (property_id, name, area)
    if (filterObj.search) {
      const q = filterObj.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.property_id?.toLowerCase().includes(q) ||
          p.property_name?.toLowerCase().includes(q) ||
          p.area?.toLowerCase().includes(q)
      );
    }

    setFilteredProperties(filtered);
  }

  // ─── Handle filter change ───────────────────────────────────────────
  function handleFilterChange(key, value) {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(properties, newFilters);
  }

  // ─── Update availability status ──────────────────────────────────────
  async function updateStatus(propertyId, newStatus) {
    try {
      const { error: err } = await supabase
        .from("properties")
        .update({ availability_status: newStatus })
        .eq("property_id", propertyId);

      if (err) throw err;

      // Update local state
      setProperties((prev) =>
        prev.map((p) =>
          p.property_id === propertyId
            ? { ...p, availability_status: newStatus }
            : p
        )
      );
      applyFilters(properties, filters);
    } catch (e) {
      console.error("Error updating status:", e);
      alert("Failed to update status: " + e.message);
    }
  }

  // ─── Quota badge color ──────────────────────────────────────────────
  function getQuotaBadgeColor(quota) {
    const colors = {
      Thai: "bg-blue-100 text-blue-900",
      Company: "bg-purple-100 text-purple-900",
      Foreign: "bg-red-100 text-red-900",
      Mixed: "bg-yellow-100 text-yellow-900",
    };
    return colors[quota] || "bg-gray-100 text-gray-900";
  }

  // ─── Status badge color ──────────────────────────────────────────────
  function getStatusBadgeColor(status) {
    const colors = {
      available: "bg-green-100 text-green-900",
      pending: "bg-yellow-100 text-yellow-900",
      sold: "bg-red-100 text-red-900",
      reserved: "bg-blue-100 text-blue-900",
      "off-market": "bg-gray-100 text-gray-900",
    };
    return colors[status] || "bg-gray-100 text-gray-900";
  }

  // ─── Format date ────────────────────────────────────────────────────
  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // ─── Render ─────────────────────────────────────────────────────────
  if (loading) return <div className="p-4">Loading properties...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Properties ({filteredProperties.length})</h2>
        <Button onClick={fetchProperties} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Quota Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Ownership Quota
            </label>
            <select
              value={filters.quota}
              onChange={(e) => handleFilterChange("quota", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">All quotas</option>
              {QUOTA_OPTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Market Status
            </label>
            <select
              value={filters.availability_status}
              onChange={(e) => handleFilterChange("availability_status", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">All status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              placeholder="ID, name, area..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <Button
              onClick={() => {
                setFilters({ quota: "", availability_status: "", search: "" });
                applyFilters(properties, {
                  quota: "",
                  availability_status: "",
                  search: "",
                });
              }}
              variant="ghost"
              className="w-full"
            >
              Clear All
            </Button>
          </div>
        </div>
      </Card>

      {/* Properties Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg shadow">
          <thead>
            <tr className="bg-slate-100 border-b">
              <th className="px-4 py-2 text-left font-semibold">ID</th>
              <th className="px-4 py-2 text-left font-semibold">Name</th>
              <th className="px-4 py-2 text-left font-semibold">Type</th>
              <th className="px-4 py-2 text-left font-semibold">Quota</th>
              <th className="px-4 py-2 text-left font-semibold">Status</th>
              <th className="px-4 py-2 text-left font-semibold">Listed</th>
              <th className="px-4 py-2 text-left font-semibold">View</th>
              <th className="px-4 py-2 text-left font-semibold">Media</th>
              <th className="px-4 py-2 text-left font-semibold">Price</th>
            </tr>
          </thead>
          <tbody>
            {filteredProperties.map((prop) => (
              <tr key={prop.id} className="border-b hover:bg-slate-50">
                {/* ID */}
                <td className="px-4 py-2 font-mono font-semibold">
                  {prop.property_id}
                </td>

                {/* Name */}
                <td className="px-4 py-2 max-w-xs truncate">
                  {prop.property_name || "—"}
                </td>

                {/* Type */}
                <td className="px-4 py-2">
                  <Badge variant="outline">
                    {prop.category === "C" && "Condo"}
                    {prop.category === "H" && "House"}
                    {prop.category === "L" && "Land"}
                    {prop.category === "P" && "Project"}
                    {prop.category === "B" && "Business"}
                  </Badge>
                </td>

                {/* Quota */}
                <td className="px-4 py-2">
                  {prop.quota ? (
                    <Badge className={getQuotaBadgeColor(prop.quota)}>
                      {prop.quota}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </td>

                {/* Status (Editable) */}
                <td className="px-4 py-2">
                  <select
                    value={prop.availability_status || "available"}
                    onChange={(e) => updateStatus(prop.property_id, e.target.value)}
                    className={`px-2 py-1 rounded text-sm font-medium cursor-pointer ${getStatusBadgeColor(
                      prop.availability_status
                    )}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Listed Date */}
                <td className="px-4 py-2 text-sm flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  {formatDate(prop.listed_date)}
                </td>

                {/* View Type */}
                <td className="px-4 py-2 text-sm">
                  {prop.view_type ? (
                    <div className="flex items-center gap-1">
                      <EyeIcon className="w-4 h-4 text-de0372" />
                      {prop.view_type}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                {/* Drive Link */}
                <td className="px-4 py-2">
                  {prop.drive_link ? (
                    <a
                      href={prop.drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-de0372 hover:underline flex items-center gap-1"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Media
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                {/* Price */}
                <td className="px-4 py-2 font-semibold text-right">
                  {prop.price ? `฿${(prop.price / 1000000).toFixed(1)}M` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProperties.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No properties match your filters.
        </div>
      )}
    </div>
  );
}
