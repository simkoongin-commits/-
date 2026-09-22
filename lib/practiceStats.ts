export type PracticeKind = "regular" | "general" | "competition";

// Keep past practices on the calendar without participant or attendance data.
export type ArchivedPractice = {
  id: number;
  title: string;
  type: PracticeKind;
  date: string;
  start: string;
};

export const calendarArchive = (practice: ArchivedPractice): ArchivedPractice => ({
  id: practice.id,
  title: practice.title,
  type: practice.type,
  date: practice.date,
  start: practice.start,
});
