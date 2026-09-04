import { useEffect, useState } from "react";
import { formatMeetingDisplayDate, getMeetingDate } from "../../utils/meetingConfig";

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
  const [meetingDate, setMeetingDate] = useState(() => getMeetingDate(meetingType));

  useEffect(() => {
    const refresh = () => setMeetingDate(getMeetingDate(meetingType));
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [meetingType]);

  return { meetingDate, displayDate: formatMeetingDisplayDate(meetingDate) };
}
