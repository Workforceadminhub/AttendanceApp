import React, { useState, useEffect, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import GenericModal from "../components/GenericModal";
import { toast } from "react-toastify";
import { getUserRole } from "../utils/getUserRole";
import { getPostLoginPath } from "../utils/routeObject";
import {
  getStoredTeamStrengths,
  saveStoredTeamStrengths,
  resetTeamStrengthsToDefault,
  TEAM_STRENGTH_STORAGE_KEY,
  TEAM_STRENGTH_UPDATED_EVENT,
} from "../utils/teamStrengthConfig";
import {
  ArrowPathIcon,
  CheckIcon,
  UserGroupIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export default function ManageLeadersStrength() {
  const navigate = useNavigate();
  const [strengths, setStrengths] = useState(() => getStoredTeamStrengths());
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const { isSuperAdmin, user } = getUserRole();

  // Super Admin security guard
  useEffect(() => {
    if (!user || !isSuperAdmin) {
      toast.error("Access denied. Super Admin access required.");
      navigate(getPostLoginPath(user), { replace: true });
    }
  }, [isSuperAdmin, navigate, user]);

  // Keep state synced across tabs and storage updates
  useEffect(() => {
    const handleStorageSync = (e) => {
      if (!e || e.type === TEAM_STRENGTH_UPDATED_EVENT || e.key === TEAM_STRENGTH_STORAGE_KEY) {
        setStrengths(getStoredTeamStrengths());
        setHasChanges(false);
      }
    };
    window.addEventListener("storage", handleStorageSync);
    window.addEventListener(TEAM_STRENGTH_UPDATED_EVENT, handleStorageSync);
    return () => {
      window.removeEventListener("storage", handleStorageSync);
      window.removeEventListener(TEAM_STRENGTH_UPDATED_EVENT, handleStorageSync);
    };
  }, []);

  const totalStrength = useMemo(() => {
    return Object.values(strengths).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [strengths]);

  if (!user || !isSuperAdmin) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

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
    setIsResetConfirmOpen(true);
  };

  const confirmReset = () => {
    setIsResetConfirmOpen(false);
    const resetVals = resetTeamStrengthsToDefault();
    setStrengths(resetVals);
    setHasChanges(false);
    toast.info("Team strengths reset to defaults.");
  };

  return (
    <div className="min-h-screen bg-cream">
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
                <ShieldCheckIcon className="h-6 w-6 text-forest" />
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
                    return (
                      <tr key={teamName} className="transition-colors bg-white hover:bg-cream">
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
                  <tr className="bg-cream border-t-2 border-ink-300 font-bold">
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
              <div className="p-4 bg-mustard/10 border-t border-mustard/30 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-900">
                  You have unsaved changes to team strengths.
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setStrengths(getStoredTeamStrengths());
                      setHasChanges(false);
                    }}
                    className="text-xs text-ink-700 hover:underline font-medium"
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

        <GenericModal
          isOpen={isResetConfirmOpen}
          onClose={() => setIsResetConfirmOpen(false)}
          title="Reset Team Strengths"
          size="small"
        >
          <p className="text-sm text-ink-700">
            Are you sure you want to reset all team strengths to their factory default values?
          </p>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(false)}
              className="px-4 py-2 text-sm font-medium text-ink-700 bg-white border border-ink-300 rounded-lg hover:bg-cream"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmReset}
              className="px-4 py-2 text-sm font-medium text-white bg-brick rounded-lg hover:bg-brick/90"
            >
              Reset Defaults
            </button>
          </div>
        </GenericModal>
      </Layout>
    </div>
  );
}
