import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import { getUserRole } from "../utils/getUserRole";
import {
  getStoredTeamStrengths,
  saveStoredTeamStrengths,
  resetTeamStrengthsToDefault,
} from "../utils/teamStrengthConfig";
import {
  ArrowPathIcon,
  CheckIcon,
  UserGroupIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Grouping background tint matching the user screenshot aesthetics
const TEAM_ROW_ACCENTS = {
  "Programs": "bg-amber-50/60 hover:bg-amber-100/40",
  "Mission": "bg-amber-50/60 hover:bg-amber-100/40",
  "NLP": "bg-sky-50/60 hover:bg-sky-100/40",
  "Membership": "bg-purple-50/60 hover:bg-purple-100/40",
  "Ministry": "bg-purple-50/60 hover:bg-purple-100/40",
  "Maturity": "bg-purple-50/60 hover:bg-purple-100/40",
  "Kidzone": "bg-amber-50/60 hover:bg-amber-100/40",
  "Stir House": "bg-amber-50/60 hover:bg-amber-100/40",
  "Admin & Facility": "bg-slate-100/60 hover:bg-slate-200/40",
  "Communication (DMU)": "bg-slate-100/60 hover:bg-slate-200/40",
  "Finance": "bg-slate-100/60 hover:bg-slate-200/40",
  "District (Pastor Biola)": "bg-pink-50/60 hover:bg-pink-100/40",
  "District (Pastor Isaac)": "bg-pink-50/60 hover:bg-pink-100/40",
  "Men of Harvest": "bg-rose-50/60 hover:bg-rose-100/40",
  "Singles Ministry": "bg-rose-50/60 hover:bg-rose-100/40",
  "Women of Wisdom": "bg-rose-50/60 hover:bg-rose-100/40",
  "Directional Leaders": "bg-emerald-50/60 hover:bg-emerald-100/40",
  "Pastoral Leaders": "bg-emerald-50/60 hover:bg-emerald-100/40",
};

export default function ManageLeadersStrength() {
  const navigate = useNavigate();
  const [strengths, setStrengths] = useState(() => getStoredTeamStrengths());
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Super Admin security guard
  useEffect(() => {
    const { isSuperAdmin, user } = getUserRole();
    if (!user || !isSuperAdmin) {
      toast.error("Access denied. Super Admin access required.");
      navigate("/login");
    }
  }, [navigate]);

  const totalStrength = useMemo(() => {
    return Object.values(strengths).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [strengths]);

  const handleValueChange = (teamName, value) => {
    const parsed = parseInt(value, 10);
    const numVal = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setStrengths((prev) => ({
      ...prev,
      [teamName]: numVal,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setIsSaving(true);
    saveStoredTeamStrengths(strengths);
    setTimeout(() => {
      setIsSaving(false);
      setHasChanges(false);
      toast.success("Leaders strength configuration saved successfully!");
    }, 250);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all team strengths to default values?")) {
      const resetVals = resetTeamStrengthsToDefault();
      setStrengths(resetVals);
      setHasChanges(false);
      toast.info("Team strengths reset to defaults.");
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        <div className="max-w-4xl mx-auto py-6 space-y-6">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-ink-100 shadow-sm">
            <div>
              <div className="qc-eyebrow text-brick">Super Admin · Meeting Settings</div>
              <h1 className="text-2xl font-bold text-ink-900 mt-1 flex items-center gap-2">
                <UserGroupIcon className="h-7 w-7 text-ink-700" />
                Manage Leaders Strength
              </h1>
              <p className="text-sm text-ink-500 mt-1">
                Configure baseline strength headcount for all ministry teams used in Leaders & Workers meeting reports.
              </p>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={handleReset}
                type="button"
                className="px-3.5 py-2 border border-ink-300 rounded-lg text-xs font-semibold text-ink-700 bg-white hover:bg-cream transition-colors flex items-center gap-1.5"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Reset Defaults
              </button>
              <button
                onClick={handleSave}
                type="button"
                disabled={isSaving}
                className={`px-5 py-2 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-sm ${
                  hasChanges
                    ? "bg-brick hover:bg-brick/90"
                    : "bg-ink-900 hover:bg-ink-800"
                }`}
              >
                <CheckIcon className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-ink-100 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Total Strength
              </div>
              <div className="text-3xl font-extrabold text-ink-900 mt-2 qc-num">
                {totalStrength.toLocaleString()}
              </div>
              <div className="text-2xs text-ink-400 mt-1">Sum of all 18 team headcounts</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-ink-100 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Teams Tracked
              </div>
              <div className="text-3xl font-extrabold text-ink-900 mt-2 qc-num">
                {Object.keys(strengths).length}
              </div>
              <div className="text-2xs text-ink-400 mt-1">Attraction, Service, Districts, Leadership</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-ink-100 shadow-sm flex flex-col justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Status
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <ShieldCheckIcon className="h-6 w-6 text-emerald-600" />
                <span className="text-sm font-semibold text-ink-900">
                  {hasChanges ? "Unsaved Changes" : "Up to Date"}
                </span>
              </div>
              <div className="text-2xs text-ink-400 mt-1">
                {hasChanges ? "Click 'Save Changes' to update reports" : "Synced with meeting reports"}
              </div>
            </div>
          </div>

          {/* Main Strength Table */}
          <div className="bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-ink-50 border-b border-ink-200">
                    <th className="py-3.5 px-6 text-xs font-bold text-ink-700 uppercase tracking-wider">
                      TEAM
                    </th>
                    <th className="py-3.5 px-6 text-xs font-bold text-ink-700 uppercase tracking-wider text-right w-48">
                      TOTAL STRENGTH
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100/60 font-medium">
                  {Object.entries(strengths).map(([teamName, value]) => {
                    const bgClass = TEAM_ROW_ACCENTS[teamName] || "bg-white hover:bg-cream-100";
                    return (
                      <tr key={teamName} className={`transition-colors ${bgClass}`}>
                        <td className="py-3 px-6 text-sm font-semibold text-ink-900">
                          {teamName}
                        </td>
                        <td className="py-2.5 px-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <input
                              type="number"
                              min="0"
                              value={value}
                              onChange={(e) => handleValueChange(teamName, e.target.value)}
                              className="w-28 px-3 py-1.5 border border-ink-300 rounded-md text-right font-bold text-sm text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-ink-900/20 focus:border-ink-900 transition-all shadow-2xs qc-num"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-ink-100/70 border-t-2 border-ink-300 font-bold">
                    <td className="py-4 px-6 text-base text-ink-900 uppercase tracking-wider">
                      TOTAL
                    </td>
                    <td className="py-4 px-6 text-right text-lg text-ink-900 qc-num font-black">
                      {totalStrength.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom Floating Save Action Bar */}
            {hasChanges && (
              <div className="p-4 bg-amber-50 border-t border-amber-200 flex items-center justify-between">
                <span className="text-xs font-medium text-amber-900">
                  You have unsaved changes to team strengths.
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setStrengths(getStoredTeamStrengths());
                      setHasChanges(false);
                    }}
                    className="text-xs text-amber-800 hover:underline font-medium"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-1.5 bg-brick hover:bg-brick/90 text-white rounded-md text-xs font-semibold shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </div>
  );
}
