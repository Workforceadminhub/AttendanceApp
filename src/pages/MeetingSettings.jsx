import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Layout from "../components/Layout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Tag from "../components/ui/Tag";
import Stat from "../components/ui/Stat";
import { meetingPath } from "../utils/meetingLinks";
import { getUserRole } from "../utils/getUserRole";
import {
  getAllMeetings,
  formatMeetingDisplayDate,
  getActiveMeeting,
  MEETINGS_CHANGED_EVENT,
} from "../utils/meetingConfig";
import {
  fetchMeetings,
  createMeetingRemote,
  setActiveMeetingRemote,
  deleteMeetingRemote,
} from "../services/hub/meetings";

export default function MeetingSettings() {
  const navigate = useNavigate();
  const { isSuperAdmin, isChurchAdmin } = getUserRole();

  const [activeTab, setActiveTab] = useState("leaders"); // "leaders" | "workers"
  const [meetings, setMeetings] = useState([]);
  const [manualCopyLink, setManualCopyLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [meetingType, setMeetingType] = useState("leaders");
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [setAsActive, setSetAsActive] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin && !isChurchAdmin) {
      toast.error("You do not have permission to access Meeting Settings.");
      navigate("/login", { replace: true });
    }
  }, [isSuperAdmin, isChurchAdmin, navigate]);

  const updateMeetingsFromCache = React.useCallback(() => {
    setMeetings(getAllMeetings(activeTab));
  }, [activeTab]);

  const refreshMeetings = React.useCallback(async () => {
    // 1. Initial render from in-memory cache
    setMeetings(getAllMeetings(activeTab));

    // 2. Fetch and synchronize both categories with backend
    try {
      const otherTab = activeTab === "leaders" ? "workers" : "leaders";
      const [remoteCurrent] = await Promise.all([
        fetchMeetings(activeTab),
        fetchMeetings(otherTab),
        fetchActiveMeeting(),
        fetchActiveMeeting(activeTab),
      ]);
      if (remoteCurrent && Array.isArray(remoteCurrent)) {
        setMeetings(remoteCurrent);
      }
    } catch {
      // keep cached
    }
  }, [activeTab]);

  useEffect(() => {
    refreshMeetings();
    window.addEventListener(MEETINGS_CHANGED_EVENT, updateMeetingsFromCache);
    return () => {
      window.removeEventListener(MEETINGS_CHANGED_EVENT, updateMeetingsFromCache);
    };
  }, [refreshMeetings, updateMeetingsFromCache]);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!date) {
      toast.error("Please select a meeting date.");
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createMeetingRemote({
        meetingType,
        date,
        title,
        notes,
        setAsActive,
      });
      toast.success(
        `Created ${meetingType === "leaders" ? "Leaders" : "Workers"} Meeting for ${formatMeetingDisplayDate(created.date)}. Share its link below.`
      );
      // Reset form
      setDate("");
      setTitle("");
      setNotes("");
      setSetAsActive(true);
      setActiveTab(meetingType);
      await refreshMeetings();
    } catch (err) {
      const errMsg =
        err?.responseData?.message ||
        err?.responseData?.error ||
        err?.message ||
        "Failed to create meeting on server.";
      toast.error(errMsg);
      // If the meeting already exists on the server, refresh to pull and display it immediately
      setActiveTab(meetingType);
      await refreshMeetings();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async (meeting, destination = "confirm") => {
    const link = new URL(meetingPath(meeting.meetingType, meeting.date, destination), window.location.origin);
    try {
      await navigator.clipboard.writeText(link.href);
      setManualCopyLink("");
      toast.success(`Meeting ${destination === "present" ? "attendance" : "confirmation"} link copied!`);
    } catch {
      setManualCopyLink(link.href);
      toast.error("Could not copy automatically. Select and copy the link below.");
    }
  };

  const handleSetActive = async (id) => {
    try {
      await setActiveMeetingRemote(id);
      toast.success("Active meeting updated.");
      await refreshMeetings();
    } catch (err) {
      toast.error(err.message || "Failed to set active meeting.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this meeting configuration?")) {
      try {
        await deleteMeetingRemote(id);
        toast.info("Meeting deleted.");
        await refreshMeetings();
      } catch (err) {
        toast.error(err.message || "Failed to delete meeting.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header title="Meeting Settings" />
      <Layout>
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Meeting Management & Settings</h1>
            <p className="text-xs text-ink-500 mt-0.5">
              Configure and manage Leaders and Workers meetings across the church. Use Copy Link to share with Leaders or Workers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 border border-ink-200 bg-white rounded-md px-3 py-1.5"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Active Meeting Overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
          <Stat
            eyebrow="Active Leaders Meeting Date"
            value={getAllMeetings("leaders").length > 0 ? (formatMeetingDisplayDate(getActiveMeeting("leaders")?.date) || "Not Set") : "Not Set"}
          />
          <Stat
            eyebrow="Active Workers Meeting Date"
            value={getAllMeetings("workers").length > 0 ? (formatMeetingDisplayDate(getActiveMeeting("workers")?.date) || "Not Set") : "Not Set"}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Create Meeting Card (5 cols) */}
          <div className="lg:col-span-5">
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-semibold text-ink-900 mb-1">
                Create New Meeting
              </h2>
              <p className="text-xs text-ink-500 mb-4">
                Set up a new Leaders or Workers meeting date for confirmation and attendance.
              </p>

              <form onSubmit={handleCreateMeeting} className="space-y-4">
                {/* Meeting Type Selection */}
                <div>
                  <label className="block text-2xs font-semibold text-ink-600 uppercase tracking-wider mb-2">
                    Meeting Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMeetingType("leaders")}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        meetingType === "leaders"
                          ? "border-ink bg-ink text-cream"
                          : "border-ink-200 bg-white text-ink-700 hover:bg-cream-100"
                      }`}
                    >
                      Leaders Meeting
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingType("workers")}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        meetingType === "workers"
                          ? "border-ink bg-ink text-cream"
                          : "border-ink-200 bg-white text-ink-700 hover:bg-cream-100"
                      }`}
                    >
                      Workers Meeting
                    </button>
                  </div>
                </div>

                {/* Date Picker */}
                <div>
                  <label htmlFor="meeting-date" className="block text-xs font-medium text-ink-700 mb-1">
                    Meeting Date <span className="text-sienna">*</span>
                  </label>
                  <input
                    id="meeting-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
                  />
                  {date && (
                    <p className="text-2xs text-ink-500 mt-1 font-mono">
                      {formatMeetingDisplayDate(date)}
                    </p>
                  )}
                </div>

                {/* Title / Description */}
                <div>
                  <label htmlFor="meeting-title" className="block text-xs font-medium text-ink-700 mb-1">
                    Meeting Title / Label (Optional)
                  </label>
                  <input
                    id="meeting-title"
                    type="text"
                    placeholder={`e.g. ${meetingType === "leaders" ? "September Leaders Meeting" : "September Workers Meeting"}`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-ink"
                  />
                </div>

                {/* Notes / Agenda */}
                <div>
                  <label htmlFor="meeting-notes" className="block text-xs font-medium text-ink-700 mb-1">
                    Notes / Agenda (Optional)
                  </label>
                  <textarea
                    id="meeting-notes"
                    rows={2}
                    placeholder="e.g. Monthly leaders meeting"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-ink"
                  />
                </div>

                {/* Set as Active Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="setAsActive"
                    checked={setAsActive}
                    onChange={(e) => setSetAsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-ink focus:ring-ink"
                  />
                  <label htmlFor="setAsActive" className="text-xs text-ink-700 cursor-pointer">
                    Set as active meeting
                  </label>
                </div>

                <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full justify-center">
                  {isSubmitting ? "Creating Meeting..." : "Create Meeting"}
                </Button>
              </form>
            </Card>
          </div>

          {/* Manage Meetings List (7 cols) */}
          <div className="lg:col-span-7">
            <Card className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-ink-900">
                    Existing Meetings
                  </h2>
                  <p className="text-xs text-ink-500">
                    Counts include active and inactive meetings. Only one meeting per category is active.
                  </p>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex rounded-lg border border-ink-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("leaders")}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      activeTab === "leaders"
                        ? "bg-ink text-cream"
                        : "text-ink-600 hover:text-ink-900"
                    }`}
                  >
                    Leaders ({getAllMeetings("leaders").length} total)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("workers")}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      activeTab === "workers"
                        ? "bg-ink text-cream"
                        : "text-ink-600 hover:text-ink-900"
                    }`}
                  >
                    Workers ({getAllMeetings("workers").length} total)
                  </button>
                </div>
              </div>

              {manualCopyLink && (
                <div className="mb-4">
                  <label htmlFor="meeting-copy-link" className="block text-xs font-medium text-ink-700 mb-1">
                    Select and copy this meeting link
                  </label>
                  <input id="meeting-copy-link" readOnly value={manualCopyLink}
                    onFocus={(event) => event.target.select()}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
                </div>
              )}
              {meetings.length === 0 ? (
                <div className="text-center py-10 text-xs text-ink-400">
                  No {activeTab === "leaders" ? "Leaders" : "Workers"} meetings found. Create one using the form on the left.
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col gap-3 p-4 rounded-xl border transition ${
                        m.isActive
                          ? "border-forest/40 bg-forest/[0.04]"
                          : "border-ink-200 bg-white hover:bg-cream-100"
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-ink-900">
                            {m.title}
                          </span>
                          {m.isActive ? (
                            <Tag tone="success">Active Meeting</Tag>
                          ) : (
                            <Tag tone="neutral">Inactive</Tag>
                          )}
                        </div>
                        <p className="text-xs font-mono text-ink-600 mt-1">
                          📅 {formatMeetingDisplayDate(m.date)} ({m.date})
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleCopyLink(m)}
                          aria-label={`Copy link for ${m.title}`}>
                          Copy Confirmation Link
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleCopyLink(m, "present")}
                          aria-label={`Copy attendance link for ${m.title}`}>
                          Copy Attendance Link
                        </Button>
                        <Link to={meetingPath(m.meetingType, m.date, "confirmationReport")}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-700 underline underline-offset-4 hover:text-ink-900">
                          Confirmation Report
                        </Link>
                        <Link to={meetingPath(m.meetingType, m.date, "attendanceReport")}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-700 underline underline-offset-4 hover:text-ink-900">
                          Attendance Report
                        </Link>
                        {!m.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetActive(m.id)}
                          >
                            Set Active
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(m.id)}
                          className="text-sienna hover:bg-sienna/10"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </Layout>
    </div>
  );
}
