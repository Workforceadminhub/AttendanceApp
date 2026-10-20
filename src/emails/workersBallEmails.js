import { BRAND, escapeHtml } from "./template";

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO_STACK =
  "ui-monospace,'SF Mono',Consolas,Monaco,monospace";

/**
 * Build the HTML email for Workers Ball 2026 One-Time Passcode (OTP) verification.
 */
export function buildWorkersBallOtpEmail({
  firstName = "Worker",
  otpCode = "202688",
  expiryMinutes = 10,
} = {}) {
  const safeFirst = escapeHtml(firstName);
  const safeOtp = escapeHtml(otpCode);
  const safeExpiry = escapeHtml(String(expiryMinutes));

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Verification Code &middot; Workers Ball 2026</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};font-family:${FONT_STACK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safeOtp} is your Workers Ball 2026 verification code.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:520px;">

          <tr>
            <td style="height:4px;background-color:${BRAND.sienna};border-radius:8px 8px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="background-color:${BRAND.white};padding:28px 36px 32px;border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 8px 8px;">
              <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.sienna};">Harvesters Gbagada &middot; Workers Ball 2026</p>

              <h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink};">Verification code</h1>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:${BRAND.inkBody};">Hi ${safeFirst}, use this code to verify your email:</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:6px;">
                <tr>
                  <td align="center" style="padding:22px 16px;">
                    <p style="margin:0 0 6px;font-family:${MONO_STACK};font-size:32px;font-weight:700;letter-spacing:0.25em;line-height:1.2;color:${BRAND.ink};">${safeOtp}</p>
                    <p style="margin:0;font-size:12px;color:${BRAND.inkMuted};">Expires in ${safeExpiry} minutes</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.inkMuted};">Didn&rsquo;t request this? You can safely ignore this email.</p>
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
 */
export function buildWorkersBallConfirmationEmail({
  firstName = "Worker",
  fullName = "Harvesters Worker",
  accessCode = "HGWB-000000",
  role = "Worker",
  department = "Department",
  team = "Team",
  passUrl = "https://workers.hiccgbagada.com/wb26",
} = {}) {
  const safeFirst = escapeHtml(firstName);
  const safeFull = escapeHtml(fullName);
  const safeCode = escapeHtml(accessCode);
  const safeRole = escapeHtml(role);
  const safeDept = escapeHtml(department);
  const safeTeam = escapeHtml(team);
  const safeUrl = escapeHtml(passUrl);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Registration Confirmed &middot; Workers Ball 2026</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};font-family:${FONT_STACK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Confirmed for Workers Ball 2026. Your code: ${safeCode}.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:520px;">

          <tr>
            <td style="height:4px;background-color:${BRAND.sienna};border-radius:8px 8px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="background-color:${BRAND.white};padding:28px 36px 32px;border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 8px 8px;">
              <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.sienna};">Harvesters Gbagada &middot; Workers Ball 2026</p>

              <h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink};">You&rsquo;re registered, ${safeFirst}</h1>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:${BRAND.inkBody};">Present this access code at check-in:</p>

              <!-- Pass Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:${BRAND.ink};border-radius:6px;">
                <tr>
                  <td align="center" style="padding:22px 20px;">
                    <p style="margin:0 0 6px;font-family:${MONO_STACK};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#9A9A95;">Access Code</p>
                    <p style="margin:0;font-family:${MONO_STACK};font-size:28px;font-weight:700;letter-spacing:0.14em;color:${BRAND.cream};">${safeCode}</p>
                  </td>
                </tr>
              </table>

              <!-- Compact Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background-color:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:6px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" valign="top" style="padding:0 8px 10px 0;">
                          <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${BRAND.inkMuted};">Name</p>
                          <p style="margin:0;font-size:14px;font-weight:600;color:${BRAND.ink};">${safeFull}</p>
                        </td>
                        <td width="50%" valign="top" style="padding:0 0 10px 8px;">
                          <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${BRAND.inkMuted};">Role</p>
                          <p style="margin:0;font-size:14px;color:${BRAND.inkBody};">${safeRole}</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" valign="top" style="padding:0 8px 0 0;">
                          <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${BRAND.inkMuted};">Team</p>
                          <p style="margin:0;font-size:14px;color:${BRAND.inkBody};">${safeTeam}</p>
                        </td>
                        <td width="50%" valign="top" style="padding:0 0 0 8px;">
                          <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${BRAND.inkMuted};">Department</p>
                          <p style="margin:0;font-size:14px;color:${BRAND.inkBody};">${safeDept}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:6px;background-color:${BRAND.ink};">
                    <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:${BRAND.cream};text-decoration:none;border-radius:6px;">Download Pass</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
