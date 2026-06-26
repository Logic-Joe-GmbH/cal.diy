import type BaseEmail from "@calcom/emails/templates/_base-email";
import BookingReminderEmail, { type BookingReminderEmailInput } from "./templates/booking-reminder-email";

const sendEmail = (prepare: () => BaseEmail) => {
  return new Promise((resolve, reject) => {
    try {
      const email = prepare();
      resolve(email.sendEmail());
    } catch (e) {
      reject(console.error("BookingReminderEmail.sendEmail failed", e));
    }
  });
};

export const sendBookingReminderEmail = async (input: BookingReminderEmailInput) => {
  await sendEmail(() => new BookingReminderEmail(input));
};
