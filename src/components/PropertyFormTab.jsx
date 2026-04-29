/**
 * PropertyFormTab — PWA Intake Form (app.iresthailand.com)
 * Enhanced with new market-specific fields:
 * - quota (Thai/Company/Foreign/Mixed)
 * - availability_status
 * - listed_date
 * - drive_link
 * - view_type
 *
 * These fields map to the G-Sheet reconciliation.
 */

import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { Button, Input, Select, Textarea, Badge, Alert } from "shadcn/ui";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const QUOTA_OPTIONS = [
  { value: "Thai", label: "Thai-owned (ไทย)" },
  { value: "Company", label: "Company-owned (บริษัท)" },
  { value: "Foreign", label: "Foreign-eligible (ต่างชาติ)" },
  { value: "Mixed", label: "Mixed quota" },
];

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "pending", label: "Pending Sale" },
  { value: "reserved", label: "Reserved" },
  { value: "off-market", label: "Off Market" },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: "C", label: "Condo" },
  { value: "H", label: "House" },
  { value: "L", label: "Land" },
  { value: "P", label: "Project" },
  { value: "B", label: "Business" },
];

const DEAL_OPTIONS = [
  { value: "Sell", label: "Sale" },
  { value: "Rent", label: "Rental" },
  { value: "S&R", label: "Sale & Rental" },
];

const VIEW_SUGGESTIONS = [
  "Sea view",
  "Mountain view",
  "Golf course view",
  "City view",
  "River view",
  "Garden view",
  "Pool view",
  "Street view",
];

export default function PropertyFormTab() {
  const [formData, setFormData] = useState({
    // Basic info
    category: "C",
    property_name: "",
    area: "",
    deal: "Sell",

    // Specs
    beds: "",
    baths: "",
    sq_m: "",
    sq_w: "",

    // Pricing
    price: "",
    rent: "",

    // Market metadata (NEW)
    quota: "",
    availability_status: "available",
    listed_date: new Date().toISOString().split("T")[0],
    drive_link: "",
    view_type: "",

    // Contact & notes
    agent_notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  // ─── Handle input change ────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  // ─── Validate form ──────────────────────────────────────────────────
  function validateForm() {
    const newErrors = {};

    if (!formData.property_name.trim())
      newErrors.property_name = "Property name required";
    if (!formData.area.trim()) newErrors.area = "Area required";
    if (!formData.category) newErrors.category = "Property type required";
    if (!formData.deal) newErrors.deal = "Deal type required";

    // Price or rent required
    if (!formData.price && !formData.rent) {
      newErrors.price = "Price or rent required";
    }

    // Quota is now recommended (for Ming's workflow)
    if (!formData.quota) {
      newErrors.quota = "Ownership quota required for buyer matching";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Submit form ────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
      setMessage({
        type: "error",
        text: "Please fix the errors below",
      });
      return;
    }

    setLoading(true);
    try {
      // Parse numeric fields
      const submitData = {
        ...formData,
        beds: formData.beds ? parseInt(formData.beds) : null,
        baths: formData.baths ? parseInt(formData.baths) : null,
        sq_m: formData.sq_m ? parseFloat(formData.sq_m) : null,
        sq_w: formData.sq_w ? parseFloat(formData.sq_w) : null,
        price: formData.price ? parseFloat(formData.price) : null,
        rent: formData.rent ? parseFloat(formData.rent) : null,
        status: "draft",
        pipeline_status: "processing",
        created_st: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("properties").insert([submitData]);

      if (error) throw error;

      setMessage({
        type: "success",
        text: `Property created! ID: ${data[0]?.property_id || "pending"}`,
      });

      // Reset form
      setFormData({
        category: "C",
        property_name: "",
        area: "",
        deal: "Sell",
        beds: "",
        baths: "",
        sq_m: "",
        sq_w: "",
        price: "",
        rent: "",
        quota: "",
        availability_status: "available",
        listed_date: new Date().toISOString().split("T")[0],
        drive_link: "",
        view_type: "",
        agent_notes: "",
      });

      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error("Error creating property:", err);
      setMessage({
        type: "error",
        text: `Error: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">+ Add Property</h2>
        <p className="text-gray-600">
          Fill in property details. Thai market metadata (quota, view type) helps
          with lead matching and commission calculations.
        </p>
      </div>

      {/* Messages */}
      {message && (
        <Alert className={message.type === "error" ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}>
          {message.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
          )}
          <span className={message.type === "error" ? "text-red-800" : "text-green-800"}>
            {message.text}
          </span>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border">
        {/* SECTION 1: BASIC INFO */}
        <fieldset className="border-b pb-6">
          <legend className="text-lg font-semibold mb-4">Basic Information</legend>

          <div className="space-y-4">
            {/* Property Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Property Name *
              </label>
              <Input
                type="text"
                name="property_name"
                value={formData.property_name}
                onChange={handleChange}
                placeholder="e.g., View Talay Residence, Rimhad Jomtien"
                className={errors.property_name ? "border-red-500" : ""}
              />
              {errors.property_name && (
                <p className="text-red-600 text-sm mt-1">{errors.property_name}</p>
              )}
            </div>

            {/* Area */}
            <div>
              <label className="block text-sm font-medium mb-1">Area *</label>
              <Input
                type="text"
                name="area"
                value={formData.area}
                onChange={handleChange}
                placeholder="e.g., Jomtien, Pratumnak, Huay Yai"
                className={errors.area ? "border-red-500" : ""}
              />
              {errors.area && (
                <p className="text-red-600 text-sm mt-1">{errors.area}</p>
              )}
            </div>

            {/* Property Type & Deal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {PROPERTY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Deal *</label>
                <select
                  name="deal"
                  value={formData.deal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {DEAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </fieldset>

        {/* SECTION 2: SPECS */}
        <fieldset className="border-b pb-6">
          <legend className="text-lg font-semibold mb-4">Specifications</legend>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bedrooms</label>
              <Input
                type="number"
                name="beds"
                value={formData.beds}
                onChange={handleChange}
                placeholder="1, 2, 3..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Bathrooms</label>
              <Input
                type="number"
                name="baths"
                value={formData.baths}
                onChange={handleChange}
                placeholder="1, 2, 3..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Area (sq.m)
              </label>
              <Input
                type="number"
                name="sq_m"
                value={formData.sq_m}
                onChange={handleChange}
                placeholder="30, 100, 250..."
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Area (Thai wah) *
              </label>
              <Input
                type="number"
                name="sq_w"
                value={formData.sq_w}
                onChange={handleChange}
                placeholder="Land measurement (Thai wah)"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">
                1 wah = 4 sq.m. For land parcels.
              </p>
            </div>
          </div>
        </fieldset>

        {/* SECTION 3: PRICING */}
        <fieldset className="border-b pb-6">
          <legend className="text-lg font-semibold mb-4">Pricing</legend>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Sale Price (THB) *
              </label>
              <Input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="1000000 (1M), 2000000 (2M)..."
              />
              {errors.price && (
                <p className="text-red-600 text-sm mt-1">{errors.price}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Rent (THB/month)
              </label>
              <Input
                type="number"
                name="rent"
                value={formData.rent}
                onChange={handleChange}
                placeholder="30000, 50000..."
              />
            </div>
          </div>
        </fieldset>

        {/* SECTION 4: THAI MARKET METADATA (NEW) */}
        <fieldset className="border-b pb-6 bg-slate-50 p-4 rounded">
          <legend className="text-lg font-semibold mb-4 text-de0372">
            Thai Market Metadata
          </legend>
          <p className="text-sm text-gray-600 mb-4">
            Critical for lead matching and commission calculations.
          </p>

          <div className="space-y-4">
            {/* Quota */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Ownership Quota * (Critical)
              </label>
              <select
                name="quota"
                value={formData.quota}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.quota ? "border-red-500" : ""
                }`}
              >
                <option value="">Select quota...</option>
                {QUOTA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.quota && (
                <p className="text-red-600 text-sm mt-1">{errors.quota}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Foreign buyers face restrictions and higher transfer fees (3.3% +
                VAT). Thai ownership = 2% transfer fee only.
              </p>
            </div>

            {/* Availability Status */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Market Status
              </label>
              <select
                name="availability_status"
                value={formData.availability_status}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Listed Date */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Date Listed
              </label>
              <Input
                type="date"
                name="listed_date"
                value={formData.listed_date}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500 mt-1">
                When property went public (for days-on-market calculations).
              </p>
            </div>

            {/* View Type */}
            <div>
              <label className="block text-sm font-medium mb-1">View Type</label>
              <div className="flex gap-2 mb-2">
                {VIEW_SUGGESTIONS.slice(0, 4).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, view_type: view }))}
                    className={`px-3 py-1 text-sm rounded border ${
                      formData.view_type === view
                        ? "bg-de0372 text-white border-de0372"
                        : "bg-white border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
              <Input
                type="text"
                name="view_type"
                value={formData.view_type}
                onChange={handleChange}
                placeholder="e.g., sea view, mountain view, golf view"
              />
              <p className="text-xs text-gray-500 mt-1">
                Marketing angle for property differentiation.
              </p>
            </div>

            {/* Drive Link */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Media Folder (Drive/Dropbox)
              </label>
              <Input
                type="url"
                name="drive_link"
                value={formData.drive_link}
                onChange={handleChange}
                placeholder="https://drive.google.com/... or https://dropbox.com/..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Link to floor plans, photos, 360 tours, promotional videos.
              </p>
            </div>
          </div>
        </fieldset>

        {/* SECTION 5: NOTES */}
        <fieldset className="border-b pb-6">
          <legend className="text-lg font-semibold mb-4">Notes</legend>

          <Textarea
            name="agent_notes"
            value={formData.agent_notes}
            onChange={handleChange}
            placeholder="Owner contact, special features, any additional info..."
            rows={4}
          />
        </fieldset>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="bg-de0372 hover:bg-de0372/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "+ Create Property"
            )}
          </Button>

          <Button
            type="reset"
            variant="outline"
            onClick={() => {
              setFormData({
                category: "C",
                property_name: "",
                area: "",
                deal: "Sell",
                beds: "",
                baths: "",
                sq_m: "",
                sq_w: "",
                price: "",
                rent: "",
                quota: "",
                availability_status: "available",
                listed_date: new Date().toISOString().split("T")[0],
                drive_link: "",
                view_type: "",
                agent_notes: "",
              });
              setErrors({});
              setMessage(null);
            }}
          >
            Clear
          </Button>
        </div>
      </form>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
        <p className="font-semibold mb-2">Help: Thai Market Fields</p>
        <ul className="space-y-1 text-gray-700">
          <li>
            <strong>Quota:</strong> Foreign = restricted buying, higher fees. Thai =
            no restrictions.
          </li>
          <li>
            <strong>Status:</strong> Available = on market, Sold = transaction
            complete.
          </li>
          <li>
            <strong>View:</strong> Helps Gemini generate better marketing copy.
          </li>
          <li>
            <strong>Media Link:</strong> Content accessible to agents & buyers.
          </li>
        </ul>
      </div>
    </div>
  );
}
