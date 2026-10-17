/**
 * Account emails, sent through Cloudflare Email Service (the EMAIL binding,
 * `send_email` in wrangler.jsonc). The sender must be on a domain onboarded
 * in Email Service; set MAIL_FROM to change it.
 */

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function sender(env) {
  return { email: (env && env.MAIL_FROM) || 'members@onlyatthekiosk.com', name: 'KIOSK' };
}

/** Plain, table-free layout that reads in every mail client, light or dark. */
function layout(title, bodyHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light dark"><title>${esc(title)}</title></head>
<body style="margin:0;padding:32px 16px;background:#f4f2ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111214">
<div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px 28px">
<p style="margin:0 0 24px;font:600 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.2em">KIOSK</p>
${bodyHtml}
<p style="margin:32px 0 0;font-size:12px;line-height:1.5;color:#77757a">Only at the KIOSK · <a href="https://onlyatthekiosk.com" style="color:#77757a">onlyatthekiosk.com</a></p>
</div></body></html>`;
}

export async function sendLoginCode(env, { to, code }) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return env.EMAIL.send({
    from: sender(env),
    to,
    subject: `${spaced} is your KIOSK sign-in code`,
    text: `Your KIOSK sign-in code is ${spaced}.\n\nIt works for 10 minutes. If you didn't ask for it, you can ignore this email.`,
    html: layout('Your sign-in code', `
<h1 style="margin:0 0 12px;font-size:24px;font-weight:500;letter-spacing:-.02em">Your sign-in code</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#4a484d">Enter this code on the site to sign in. It works for 10 minutes.</p>
<p style="margin:0 0 20px;padding:18px 0;border-radius:14px;background:#f4f2ee;text-align:center;font:600 32px/1 ui-monospace,Menlo,monospace;letter-spacing:.3em">${esc(spaced)}</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#77757a">Didn't ask for this? You can ignore this email; nobody can sign in without the code.</p>`),
  });
}

export async function sendWelcome(env, { to, firstName, memberNo }) {
  const hi = firstName ? `Welcome aboard, ${esc(firstName)}.` : 'Welcome aboard.';
  return env.EMAIL.send({
    from: sender(env),
    to,
    subject: `Welcome to the KIOSK, member ${memberNo}`,
    text: `${hi.replace(/&[^;]+;/g, '')}\n\nYou're KIOSK member ${memberNo}. Your saves, check-in and bag now follow you on every device.\n\nhttps://onlyatthekiosk.com/account.html`,
    html: layout('Welcome to the KIOSK', `
<h1 style="margin:0 0 12px;font-size:24px;font-weight:500;letter-spacing:-.02em">${hi}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#4a484d">You're KIOSK member <b style="color:#111214">${esc(memberNo)}</b>. Your saves, check-in and bag now follow you on every device.</p>
<p style="margin:0"><a href="https://onlyatthekiosk.com/account.html" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#111214;color:#ffffff;text-decoration:none;font-size:14px">Open your account</a></p>`),
  });
}
