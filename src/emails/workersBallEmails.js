import { BRAND, escapeHtml } from "./template";

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO_STACK =
  "ui-monospace,'SF Mono',Consolas,Monaco,monospace";

/**
 * Build the HTML email for Workers Ball 2026 One-Time Passcode (OTP) verification.
 *
 * @param {Object} params
 * @param {string} [params.firstName]
 * @param {string} [params.otpCode]
 * @param {number|string} [params.expiryMinutes]
 * @param {string} [params.year]
 * @returns {string} Email-safe inline-styled HTML document
 */
export function buildWorkersBallOtpEmail({
  firstName = "Worker",
  otpCode = "202688",
  expiryMinutes = 10,
  year = "2026",
} = {}) {
  const safeFirst = escapeHtml(firstName);
  const safeOtp = escapeHtml(otpCode);
  const safeExpiry = escapeHtml(String(expiryMinutes));
  const safeYear = escapeHtml(String(year));

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Your Workers Ball 2026 Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};font-family:${FONT_STACK};">
  <!-- preheader: shows in inbox preview, hidden in body -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Workers Ball 2026 verification code is ${safeOtp}. Valid for ${safeExpiry} minutes.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">

          <!-- brand bar -->
          <tr>
            <td style="height:4px;background-color:${BRAND.sienna};border-radius:8px 8px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- header -->
          <tr>
            <td style="background-color:${BRAND.white};padding:28px 40px 0;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.sienna};">Harvesters International Christian Centre &middot; Gbagada</span>
                  </td>
                  <td align="right">
                    <span style="font-family:${MONO_STACK};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.inkMuted};background-color:#F4F4EE;padding:4px 8px;border-radius:4px;border:1px solid ${BRAND.border};">WB &rsquo;26</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- body card -->
          <tr>
            <td style="background-color:${BRAND.white};padding:24px 40px 40px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">

              <p style="margin:0 0 6px;font-family:${MONO_STACK};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.inkMuted};">Identity Verification</p>
              <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;font-weight:700;color:${BRAND.ink};">Verify your email for Workers Ball 2026</h1>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.inkBody};">Dear ${safeFirst},</p>

              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${BRAND.inkBody};">Use the one-time verification code below to unlock your worker profile and complete your registration for <strong>Workers Ball 2026 &mdash; Harvesters Gbagada</strong>.</p>

              <!-- OTP callout box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:8px;">
                <tr>
                  <td align="center" style="padding:28px 24px;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.inkMuted};">One-Time Verification Code</p>
                    <p style="margin:0 0 10px;font-family:${MONO_STACK};font-size:36px;font-weight:700;letter-spacing:0.28em;line-height:1.2;color:${BRAND.ink};">${safeOtp}</p>
                    <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.sienna};font-weight:600;">Expires in ${safeExpiry} minutes</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4A4F5E;">Return to the Workers Ball registration window in your browser and enter this 6-digit code to review your department, team, and role details.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F0F0EB;padding-top:16px;margin-top:20px;">
                <tr>
                  <td>
                    <p style="margin:0;font-size:13px;line-height:1.5;color:${BRAND.inkMuted};"><strong>Security notice:</strong> Never share this code with anyone. Harvesters Gbagada Workforce Admin will never ask you for your verification code over phone or WhatsApp.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="background-color:${BRAND.white};padding:24px 40px 32px;border-top:1px solid ${BRAND.border};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};border-radius:0 0 8px 8px;">
              <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:${BRAND.inkMuted};">If you did not initiate a Workers Ball 2026 registration, you can safely disregard this email.</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.inkMuted};">&copy; ${safeYear} Harvesters International Christian Centre, Gbagada. All rights reserved.</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build the HTML email for Workers Ball 2026 Registration Confirmation.
 *
 * @param {Object} params
 * @param {string} [params.firstName]
 * @param {string} [params.fullName]
 * @param {string} [params.accessCode]
 * @param {string} [params.role]
 * @param {string} [params.department]
 * @param {string} [params.team]
 * @param {string} [params.phone]
 * @param {string} [params.email]
 * @param {string} [params.passUrl]
 * @param {string} [params.year]
 * @returns {string} Email-safe inline-styled HTML document
 */
export function buildWorkersBallConfirmationEmail({
  firstName = "Worker",
  fullName = "Harvesters Worker",
  accessCode = "WB26-GBG-0000",
  role = "Worker",
  department = "Department",
  team = "Team",
  phone = "",
  passUrl = "https://workers.hiccgbagada.com/wb26",
  year = "2026",
} = {}) {
  const safeFirst = escapeHtml(firstName);
  const safeFull = escapeHtml(fullName);
  const safeCode = escapeHtml(accessCode);
  const safeRole = escapeHtml(role);
  const safeDept = escapeHtml(department);
  const safeTeam = escapeHtml(team);
  const safePhone = escapeHtml(phone || "On record");
  const safeUrl = escapeHtml(passUrl);
  const safeYear = escapeHtml(String(year));

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Workers Ball 2026 Registration Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};font-family:${FONT_STACK};">
  <!-- preheader: shows in inbox preview, hidden in body -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your registration for Workers Ball 2026 is confirmed! Your access code is ${safeCode}.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">

          <!-- brand bar -->
          <tr>
            <td style="height:4px;background-color:${BRAND.sienna};border-radius:8px 8px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- header -->
          <tr>
            <td style="background-color:${BRAND.white};padding:28px 40px 0;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.sienna};">Harvesters International Christian Centre &middot; Gbagada</span>
                  </td>
                  <td align="right">
                    <span style="font-family:${MONO_STACK};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#4A6B3F;background-color:#EFF3ED;padding:4px 10px;border-radius:4px;">CONFIRMED</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- body card -->
          <tr>
            <td style="background-color:${BRAND.white};padding:24px 40px 40px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">

              <p style="margin:0 0 6px;font-family:${MONO_STACK};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.inkMuted};">Workers Ball 2026 &middot; Official Pass</p>
              <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;font-weight:700;color:${BRAND.ink};">You&rsquo;re registered for Workers Ball 2026</h1>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.inkBody};">Dear ${safeFirst},</p>

              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${BRAND.inkBody};">Your workforce profile has been updated and your seat at <strong>Workers Ball 2026 &mdash; Harvesters Gbagada</strong> is officially reserved. Please keep your unique access code below for check-in at the venue.</p>

              <!-- Ceremonial Gala Pass Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.ink};border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:24px 28px;border-bottom:1px dashed #2C3142;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0 0 4px;font-family:${MONO_STACK};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9A9A95;">Harvesters Gbagada &middot; Gala Admit One</p>
                          <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND.cream};">Workers Ball 2026</p>
                        </td>
                        <td align="right" valign="top">
                          <span style="display:inline-block;padding:4px 10px;background-color:${BRAND.sienna};color:#FFFFFF;font-family:${MONO_STACK};font-size:11px;font-weight:700;letter-spacing:0.08em;border-radius:4px;text-transform:uppercase;">VIP WORKER</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px;background-color:#1A1F2E;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9A9A95;">Your Unique Access Code</p>
                    <p style="margin:0;font-family:${MONO_STACK};font-size:30px;font-weight:700;letter-spacing:0.16em;color:${BRAND.cream};">${safeCode}</p>
                  </td>
                </tr>
              </table>

              <!-- Registered Worker Summary -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:6px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px;font-family:${MONO_STACK};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.inkMuted};">Confirmed Profile Details</p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" valign="top" style="padding:0 12px 14px 0;">
                          <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.inkMuted};">Full Name</p>
                          <p style="margin:0;font-size:15px;font-weight:600;line-height:1.4;color:${BRAND.ink};">${safeFull}</p>
                        </td>
                        <td width="50%" valign="top" style="padding:0 0 14px 12px;">
                          <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.inkMuted};">Phone Number</p>
                          <p style="margin:0;font-family:${MONO_STACK};font-size:14px;line-height:1.4;color:${BRAND.inkBody};">${safePhone}</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" valign="top" style="padding:0 12px 14px 0;">
                          <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.inkMuted};">Role</p>
                          <p style="margin:0;font-size:15px;line-height:1.4;color:${BRAND.inkBody};">${safeRole}</p>
                        </td>
                        <td width="50%" valign="top" style="padding:0 0 14px 12px;">
                          <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.inkMuted};">Team</p>
                          <p style="margin:0;font-size:15px;line-height:1.4;color:${BRAND.inkBody};">${safeTeam}</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" valign="top" style="padding:0;">
                          <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.inkMuted};">Department</p>
                          <p style="margin:0;font-size:15px;line-height:1.4;color:${BRAND.inkBody};">${safeDept}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                <tr>
                  <td style="border-radius:6px;background-color:${BRAND.ink};">
                    <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:${BRAND.cream};text-decoration:none;border-radius:6px;">View &amp; Download Your Pass</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;line-height:1.5;color:${BRAND.inkMuted};">Present your access code <strong>${safeCode}</strong> or your downloaded pass at the accreditation desk upon arrival.</p>

            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="background-color:${BRAND.white};padding:24px 40px 32px;border-top:1px solid ${BRAND.border};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};border-radius:0 0 8px 8px;">
              <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:${BRAND.inkMuted};">We look forward to celebrating your service and dedication at Workers Ball 2026.</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.inkMuted};">&copy; ${safeYear} Harvesters International Christian Centre, Gbagada. All rights reserved.</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
