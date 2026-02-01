const resetPasswordOtpTemplate = (name: string, otpCode: string) => {
  return (`
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Use this one-time code to reset your Plato Hiring password." />
    <title>Reset Your Password | Plato Hiring</title>
  </head>
  <body style="margin:0;padding:0;background-color:#eef2ff;color:#111827;font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eef2ff;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.12);">
            <tr>
              <td style="padding:20px 32px;background:linear-gradient(90deg,#4f46e5,#7c3aed);color:#ffffff;">
                <h1 style="margin:0;font-size:20px;line-height:1.4;">Plato Hiring</h1>
                <p style="margin:6px 0 0 0;font-size:13px;opacity:0.9;">Password reset</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 20px 32px;">
                <h2 style="margin:0 0 8px 0;font-size:20px;line-height:1.4;color:#111827;">Hi ${name},</h2>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                  We received a request to reset your Plato Hiring password. Use the verification code below to continue.
                </p>
                <div style="background-color:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:16px;margin:0 0 16px 0;text-align:center;">
                  <span style="display:block;font-size:12px;color:#6b7280;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Your code</span>
                  <span style="font-size:28px;font-weight:700;letter-spacing:0.3em;color:#1e1b4b;">${otpCode}</span>
                </div>
                <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">
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
`);
};

export default resetPasswordOtpTemplate;

