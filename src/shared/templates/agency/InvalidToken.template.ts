const invalidTokenTemplate = (token: string) => {
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Your verification link is invalid or expired. Request a new verification email for your Plato Hiring account." />
    <title>Verification Link Invalid | Plato Hiring</title>
  </head>
  <body style="margin:0;padding:0;background-color:#eef2ff;color:#111827;font-family:Arial, Helvetica, sans-serif;">
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;">
      <div style="background:#ffffff;border-radius:14px;box-shadow:0 12px 30px rgba(15,23,42,0.12);max-width:480px;width:100%;overflow:hidden;">
        <div style="padding:20px 24px;background:linear-gradient(90deg,#4f46e5,#7c3aed);color:#ffffff;">
          <h1 style="margin:0;font-size:20px;line-height:1.4;">Plato Hiring</h1>
          <p style="margin:6px 0 0 0;font-size:13px;opacity:0.9;">Verification</p>
        </div>
        <div style="padding:24px 28px;text-align:center;">
          <h2 style="margin:0 0 10px 0;font-size:20px;">Verification link invalid</h2>
          <p style="margin:0 0 16px 0;color:#6b7280;font-size:14px;line-height:1.6;">
            Your verification link is invalid or expired. Request a new link to continue.
          </p>
          <div style="margin:0 0 16px 0;padding:12px 14px;border:1px solid #ffe58f;border-left:4px solid #facc15;background-color:#fff7cc;border-radius:6px;color:#92400e;font-size:13px;line-height:1.6;">
            This verification link can only be used once.
          </div>
          <button id="resendBtn" style="background:#4f46e5;color:#ffffff;border:none;border-radius:8px;padding:10px 18px;font-weight:600;cursor:pointer;">
            Resend verification email
          </button>
          <div id="statusBar" style="display:none;margin-top:16px;background:#16a34a;color:#ffffff;padding:10px 12px;border-radius:8px;font-size:13px;">
            A new verification link has been sent. Please check your email.
          </div>
        </div>
      </div>
    </div>
    <script>
      const btn = document.getElementById('resendBtn');
      const bar = document.getElementById('statusBar');
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Sending...';
        try {
          const res = await fetch('/agency/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: '${token}' })
          });
          if (res.ok) {
            bar.style.display = 'block';
            btn.textContent = 'Email sent';
          } else {
            btn.disabled = false;
            btn.textContent = 'Resend verification email';
          }
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Resend verification email';
        }
      });
    </script>
  </body>
</html>
    `;
};

export default invalidTokenTemplate;

