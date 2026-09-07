import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatMeetingDisplayDate, getMeetingDate, MEETINGS_CHANGED_EVENT } from "../../utils/meetingConfig";

/**
 * Active meeting date for a meeting type, resolved inside the component rather than
 * at module load. Re-reads the stored meeting config whenever the tab regains focus
 * or becomes visible, or the config changes in another tab, so a page left open across
 * a meeting rollover submits to the current meeting.
 *
 * @param {"leaders"|"workers"} meetingType
 * @returns {{ meetingDate: string, displayDate: string }}
 */
export default function useMeetingDate(meetingType) {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get("meeting_date");
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam || "")
    ? new Date(`${dateParam}T00:00:00Z`) : null;
  const linkedDate = parsedDate && !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === dateParam ? dateParam : null;
  const [meetingDate, setMeetingDate] = useState(() => getMeetingDate(meetingType));

  useEffect(() => {
    const refresh = () => setMeetingDate(getMeetingDate(meetingType));
    refresh();
    window.addEventListener(MEETINGS_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener(MEETINGS_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [meetingType]);

  const resolvedDate = linkedDate || meetingDate;
  return { meetingDate: resolvedDate, displayDate: formatMeetingDisplayDate(resolvedDate) };
}
