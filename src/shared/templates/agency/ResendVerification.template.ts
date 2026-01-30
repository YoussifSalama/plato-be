const resendVerificationTemplate = (name: string, verifyEmailUrl: string) => {
    return (`
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify Your Email</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f6f8fb;color:#111827;font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f6f8fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 18px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding:28px 32px 20px 32px;">
                <h2 style="margin:0 0 8px 0;font-size:22px;line-height:1.4;">Hello ${name},</h2>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                  You requested a new verification link for your Plato Hiring account. Please confirm your email address to activate your account.
                </p>
                <div style="margin:0 0 16px 0;">
                  <a href="${verifyEmailUrl}"
                     style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:6px;">
                    Verify Email
                  </a>
                </div>
                <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  If the button doesn't work, copy and paste this link into your browser:
                  <br />
                  <a href="${verifyEmailUrl}" style="color:#2563eb;text-decoration:none;">${verifyEmailUrl}</a>
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">
                  Regards,<br />
                  The Plato Hiring Team
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`)
}

export default resendVerificationTemplate;

