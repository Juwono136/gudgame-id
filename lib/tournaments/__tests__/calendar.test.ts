import { describe, expect, it } from "vitest";
import {
  buildGoogleCalendarUrl,
  buildTournamentIcs,
  toIcsUtc,
} from "@/lib/tournaments/calendar";

describe("tournament calendar helpers", () => {
  it("formats ICS UTC timestamps", () => {
    expect(toIcsUtc(new Date("2026-07-21T02:00:00.000Z"))).toBe("20260721T020000Z");
  });

  it("builds a downloadable ICS event", () => {
    const ics = buildTournamentIcs({
      title: "Dev Double Stage 32",
      description: "Group stage then knockout",
      location: "Mr. Padel",
      startsAt: "2026-07-21T02:00:00.000Z",
      endsAt: "2026-08-01T16:50:00.000Z",
      url: "https://example.com/t",
      uid: "match-1@gud-game",
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Dev Double Stage 32");
    expect(ics).toContain("LOCATION:Mr. Padel");
    expect(ics).toContain("DTSTART:20260721T020000Z");
    expect(ics).toContain("UID:match-1@gud-game");
  });

  it("builds a Google Calendar template URL", () => {
    const url = buildGoogleCalendarUrl({
      title: "Dev Double Stage 32",
      location: "Mr. Padel",
      startsAt: "2026-07-21T02:00:00.000Z",
      endsAt: "2026-08-01T16:50:00.000Z",
    });
    expect(url).toContain("https://calendar.google.com/calendar/render?");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("text=Dev+Double+Stage+32");
    expect(url).toContain("20260721T020000Z%2F20260801T165000Z");
  });
});
