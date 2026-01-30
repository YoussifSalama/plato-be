const invalidTokenTemplate = (token: string) => {
    return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Token Not Valid</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f6f8fb;color:#111827;font-family:Arial, Helvetica, sans-serif;">
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;">
      <div style="background:#ffffff;border-radius:12px;box-shadow:0 8px 20px rgba(15,23,42,0.08);padding:24px 28px;max-width:420px;width:100%;text-align:center;">
        <h2 style="margin:0 0 12px 0;font-size:20px;">Token not valid</h2>
        <p style="margin:0 0 16px 0;color:#6b7280;font-size:14px;line-height:1.6;">
          Your verification link is invalid or expired. You can request a new one below.
        </p>
        <button id="resendBtn" style="background:#2563eb;color:#ffffff;border:none;border-radius:6px;padding:10px 16px;font-weight:600;cursor:pointer;">
          Resend verification email
        </button>
        <div id="statusBar" style="display:none;margin-top:16px;background:#16a34a;color:#ffffff;padding:10px 12px;border-radius:6px;font-size:13px;">
          A new verification link has been sent. Please check your email.
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

