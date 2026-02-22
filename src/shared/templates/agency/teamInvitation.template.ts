export interface TeamInvitationEmailData {
  orgId: string;
  invitationCode: string;
  agencyName: string;
  frontendBaseUrl: string;
  expiresInMinutes: number;
}

const TeamInvitationTemplate = ({ payload }: { payload: TeamInvitationEmailData }) => {
  const { orgId, invitationCode, agencyName, frontendBaseUrl, expiresInMinutes } = payload;
  console.log('Generating email with data:', payload);

  return `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Team Invitation</title>
  </head>

  <body style="margin:0;padding:0;background-color:#eef2ff;font-family:Arial, Helvetica, sans-serif;">

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#eef2ff;padding:40px 0;">
      <tr>
        <td align="center">

          <!-- Card -->
          <table width="100%" border="0" cellspacing="0" cellpadding="0" 
                 style="max-width:480px;background:#ffffff;border-radius:14px;
                        box-shadow:0 12px 30px rgba(15,23,42,0.12);overflow:hidden;">

            <!-- Header -->
            <tr>
              <td style="padding:20px 24px;background:linear-gradient(90deg,#4f46e5,#7c3aed);color:#ffffff;">
                <h1 style="margin:0;font-size:20px;">Plato Hiring</h1>
                <p style="margin:6px 0 0 0;font-size:13px;opacity:0.9;">Team Invitation</p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:28px;text-align:center;">

                <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827;">
                  Hello from ${agencyName}!
                </h2>

                <p style="margin:0 0 18px 0;color:#6b7280;font-size:14px;line-height:1.6;">
                  You've been invited to join ${agencyName}'s team on Plato Hiring.
                  Click the button below to accept the invitation and start collaborating.
                </p>

                <!-- Code Box -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0"
                       style="margin-bottom:20px;background:#eff6ff;border-radius:8px;">
                  <tr>
                    <td style="padding:14px;border-left:4px solid #3b82f6;text-align:left;">
                      <p style="margin:0 0 6px 0;font-size:13px;color:#1e3a8a;">
                        <strong>Invitation Code:</strong> ${invitationCode}
                      </p>
                      <p style="margin:0;font-size:12px;color:#374151;">
                        This code can only be used once and will expire in <strong>${expiresInMinutes} minutes</strong>.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Button -->
                <table border="0" cellspacing="0" cellpadding="0" align="center">
                  <tr>
                    <td align="center" bgcolor="#4f46e5" style="border-radius:8px;">
                      <a href="${frontendBaseUrl}/auth/join-team?org=${orgId}&code=${invitationCode}"
                         style="display:inline-block;padding:12px 24px;
                                font-size:14px;font-weight:bold;
                                color:#ffffff;text-decoration:none;
                                border-radius:8px;">
                        Join Team
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin-top:20px;font-size:12px;color:#6b7280;">
                  If you did not expect this invitation, you can safely ignore this email.
                </p>

              </td>
            </tr>

          </table>
          <!-- End Card -->

        </td>
      </tr>
    </table>

  </body>
</html>
    `;
};

export default TeamInvitationTemplate;