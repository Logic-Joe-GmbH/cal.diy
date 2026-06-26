import dayjs from "@calcom/dayjs";
import { EMAIL_FROM_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import type { TFunction } from "i18next";
import BaseEmail from "./_base-email";

// Attendee name and event title are user-controlled, so escape every dynamic value before
// embedding it into the hand-built HTML to prevent HTML/script injection into the email.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type BookingReminderEmailInput = {
  to: string;
  recipientName: string | null;
  eventTitle: string;
  startTime: string; // ISO string
  timeZone: string;
  locale: string;
  bookingUid: string;
  language: TFunction;
};

// Lightweight "your meeting is coming up" reminder. Uses inline HTML instead of the React email
// renderer so it stays self-contained and has no template-registration dependency.
export default class BookingReminderEmail extends BaseEmail {
  input: BookingReminderEmailInput;

  constructor(input: BookingReminderEmailInput) {
    super();
    this.name = "SEND_BOOKING_REMINDER";
    this.input = input;
  }

  protected getTimezone(): string {
    return this.input.timeZone;
  }

  protected getLocale(): string {
    return this.input.locale;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const { to, recipientName, eventTitle, startTime, language, bookingUid } = this.input;
    const when = dayjs(startTime)
      .tz(this.getTimezone())
      .locale(this.getLocale())
      .format("dddd, LL HH:mm (z)");
    const manageUrl = `${WEBAPP_URL}/booking/${bookingUid}`;
    const greeting = recipientName ? `${recipientName},` : "";

    const html = `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111827; line-height: 1.5;">
        <p>${escapeHtml(greeting)}</p>
        <p>${language("booking_reminder_intro")}</p>
        <p style="font-size: 18px; font-weight: 600; margin: 16px 0 4px;">${escapeHtml(eventTitle)}</p>
        <p style="margin: 0 0 16px;"><strong>${language("booking_reminder_when")}:</strong> ${escapeHtml(when)}</p>
        <p><a href="${escapeHtml(manageUrl)}" style="color: #2563eb;">${language("booking_reminder_manage")}</a></p>
      </div>
    `;

    return {
      to,
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      subject: language("booking_reminder_subject", { title: eventTitle }),
      html,
      text: `${eventTitle}\n${language("booking_reminder_when")}: ${when}\n${manageUrl}`,
    };
  }
}
