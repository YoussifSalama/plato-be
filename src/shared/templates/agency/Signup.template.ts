const signupTemplate = (name: string, verifyEmailUrl: string) => {
    return (`
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welcome to Plato Hiring</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f6f8fb;color:#111827;font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f6f8fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 18px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding:28px 32px 20px 32px;">
                <h2 style="margin:0 0 8px 0;font-size:22px;line-height:1.4;">Dear ${name},</h2>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                  Welcome to Plato Hiring. Your agency account has been created successfully, and we are pleased to have you join our platform.
                </p>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                  Plato Hiring helps you streamline hiring by organizing candidate pipelines, enabling AI-assisted evaluations, and keeping your team aligned throughout the recruitment process.
                </p>
                <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px 14px;margin:0 0 16px 0;">
                  <strong style="display:block;margin:0 0 8px 0;font-size:13px;color:#111827;">Next steps</strong>
                  <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#6b7280;">
                    <li>Complete your agency profile and company details.</li>
                    <li>Invite team members and assign their roles.</li>
                    <li>Start creating job requests and reviewing candidates.</li>
                  </ul>
                </div>
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#374151;">
                  Please verify your email address to activate your account.
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
                <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#374151;">
                  We look forward to supporting your hiring success.
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">
                  Sincerely,<br />
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

export default signupTemplate;