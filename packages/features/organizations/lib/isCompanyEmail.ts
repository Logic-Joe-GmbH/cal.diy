// A list of popular personal @domains that must not be used as an organization's
// auto-accept email domain — otherwise every user of that provider (e.g. all of
// gmail.com) would be auto-joined to the organization.
const PERSONAL_EMAIL_PROVIDERS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "sbcglobal.net",
  "att.net",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "outlook.co",
  "hotmail.co.uk",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "mail.com",
  "email.com",
  "post.com",
  "consultant.com",
  "myself.com",
  "dr.com",
  "europe.com",
  "engineer.com",
  "asia.com",
  "usa.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "protonmail.ch",
  "zoho.com",
  "yandex.com",
  "gmx.com",
  "gmx.de",
  "fastmail.com",
  "inbox.com",
  "hushmail.com",
  "rediffmail.com",
  "tutanota.com",
  "mail.ru",
  "qq.com",
  "163.com",
  "naver.com",
  "web.de",
  "excite.com",
  "lycos.com",
];

/**
 * We can only say for sure that an email is NOT a company email (its domain is a known
 * personal provider). We can't say for sure that it IS a company email.
 */
export function isNotACompanyEmail(email: string): boolean {
  const emailParts = email.split("@");
  if (emailParts.length < 2) return true;
  return PERSONAL_EMAIL_PROVIDERS.includes(emailParts[1].toLowerCase());
}
