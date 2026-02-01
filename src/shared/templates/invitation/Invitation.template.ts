export type InvitationTemplateOptions = {
    recipientName?: string;
    agencyName?: string | null;
    invitationUrl: string;
    expiresAt: Date;
    isAuto?: boolean;
    logoUrl?: string;
};

export default function invitationTemplate(options: InvitationTemplateOptions) {
    const platformName = "Plato Hiring";
    const logoUrl = options.logoUrl;
    const nameLine = options.recipientName ? `Hi ${options.recipientName},` : "Hello,";
    const agencyLine = options.agencyName
        ? `${options.agencyName} has invited you to continue your hiring process on ${platformName}.`
        : `You have been invited to continue your hiring process on ${platformName}.`;
    const autoLine = options.isAuto
        ? "This invitation was sent automatically based on your profile."
        : undefined;
    const expiryLine = `This link expires on ${options.expiresAt.toUTCString()}.`;
    const subject = options.agencyName
        ? `Invitation to ${platformName} from ${options.agencyName}`
        : `You're invited to ${platformName}`;
    const textParts = [
        `${platformName} Invitation`,
        nameLine,
        agencyLine,
        "This invitation is valid only one time.",
        autoLine,
        `Open invitation: ${options.invitationUrl}`,
        expiryLine,
    ].filter(Boolean);
    const htmlParts = [
        `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#374151;">${nameLine}</p>`,
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">${agencyLine}</p>`,
        `<div style="margin:0 0 16px 0;padding:12px 14px;border:1px solid #ffe58f;border-left:4px solid #facc15;background-color:#fff7cc;border-radius:6px;color:#92400e;font-size:13px;line-height:1.6;">
            <strong style="display:block;margin:0 0 6px 0;">Important</strong>
            This invitation is valid for one-time use. Once it is used, it will expire.
          </div>`,
        autoLine
            ? `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#6b7280;">${autoLine}</p>`
            : "",
        `<div style="margin:0 0 16px 0;">
            <a href="${options.invitationUrl}"
               style="display:inline-block;background-color:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:8px;">
              Open invitation
            </a>
          </div>`,
        `<h3 style="margin:8px 0 8px 0;font-size:16px;line-height:1.5;color:#111827;">Invitation details</h3>`,
        `<p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#6b7280;">${expiryLine}</p>`,
        `<p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
            If the button doesn't work, copy and paste this link into your browser:
            <br />
            <a href="${options.invitationUrl}" style="color:#2563eb;text-decoration:none;">${options.invitationUrl}</a>
          </p>`,
    ].filter(Boolean);
    return {
        subject,
        text: textParts.join("\n"),
        html: (`
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#eef2ff;color:#111827;font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eef2ff;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.12);">
            <tr>
              <td style="padding:24px 32px;background:linear-gradient(90deg,#4f46e5,#7c3aed);color:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        ${logoUrl ? `<img src="${logoUrl}" alt="${platformName} logo" width="40" height="40" style="display:block;border-radius:8px;background-color:#ffffff;padding:4px;" />` : ""}
                        <span style="font-size:18px;font-weight:700;letter-spacing:0.2px;">${platformName}</span>
                      </div>
                    </td>
                    <td style="text-align:right;font-size:12px;opacity:0.9;">
                      Invitation
                    </td>
                  </tr>
                </table>
                <h1 style="margin:14px 0 0 0;font-size:22px;line-height:1.4;">${subject}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 20px 32px;">
                <h2 style="margin:0 0 12px 0;font-size:18px;line-height:1.5;color:#111827;">Your next step with ${platformName}</h2>
                ${htmlParts.join("")}
                <h3 style="margin:20px 0 8px 0;font-size:16px;line-height:1.5;color:#111827;">Recruitment snapshot</h3>
                <div style="margin:0 0 16px 0;padding:12px 14px;border:1px solid #e0e7ff;border-radius:8px;background-color:#f8faff;">
                  <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">Progress bands</div>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="height:8px;background-color:#4f46e5;border-radius:6px 0 0 6px;"></td>
                      <td style="height:8px;background-color:#a78bfa;"></td>
                      <td style="height:8px;background-color:#e5e7eb;border-radius:0 6px 6px 0;"></td>
                    </tr>
                  </table>
                  <div style="font-size:12px;color:#6b7280;margin-top:8px;">Invitation sent → Review → Decision</div>
                </div>
                <div style="margin:0;padding-top:12px;border-top:1px solid #eef2ff;font-size:12px;color:#6b7280;">
                  You received this email because a company invited you to continue the hiring process on ${platformName}.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`),
    };
}

