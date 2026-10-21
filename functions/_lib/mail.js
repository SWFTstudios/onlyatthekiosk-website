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

/* ------------------------------------------------- email form follow-ups
 * /api/subscribe sends one of these to whoever signed up, and tells the team
 * about stockist and partner requests. Team mail goes to MAIL_TEAM (default
 * hello@onlyatthekiosk.com); that address must receive mail (Email Routing). */

export const teamAddress = (env) => (env && env.MAIL_TEAM) || 'hello@onlyatthekiosk.com';

const SUBSCRIBE_COPY = {
  dispatch: {
    subject: 'You’re on the Dispatch',
    title: 'You’re on the Dispatch.',
    body: 'New films, new playlists, Supply drops and Lost &amp; Found coordinates. One email per release, nothing in between.',
    cta: ['Open the kiosk', 'https://onlyatthekiosk.com/'],
  },
  stockist: {
    subject: 'Selling at the KIOSK: we got your note',
    title: 'Thanks for reaching out.',
    body: 'We’ll send the stockist pack to this address: how listing works, what the kiosk takes from each sale, and how you keep selling through your own store. A real person reads every request.',
    cta: ['See the stores at the kiosk', 'https://onlyatthekiosk.com/store.html'],
  },
  partner: {
    subject: 'Partnering with the KIOSK: we got your note',
    title: 'Thanks for reaching out.',
    body: 'The desk will set up your Partner Hub account and write back to this address with next steps for your page, your pieces or backing a film.',
    cta: ['Visit the kiosk', 'https://onlyatthekiosk.com/'],
  },
};

export async function sendSubscribeConfirm(env, { to, interest, title, size = '', colour = '' }) {
  const choice = [size, colour].filter(Boolean).join(' · ');
  const copy = SUBSCRIBE_COPY[interest] || {
    subject: `We’ll tell you when ${title || 'it'} drops${choice ? ` in ${choice}` : ''}`,
    title: `${esc(title || 'This drop')} isn’t out yet.`,
    body: choice
      ? `You’ll get one email the moment it’s in stock in ${esc(choice)}. Nothing else.`
      : 'You’ll get one email the moment it lands, in any size or colour. Nothing else.',
    cta: ['Browse the Supply terminal', 'https://onlyatthekiosk.com/vault.html'],
  };
  const plain = (s) => String(s).replace(/&amp;/g, '&').replace(/<[^>]+>/g, '');
  return env.EMAIL.send({
    from: sender(env),
    to,
    replyTo: teamAddress(env),
    subject: plain(copy.subject),
    text: `${plain(copy.title)}\n\n${plain(copy.body)}\n\n${copy.cta[1]}\n\nYou got this because ${to} was entered on onlyatthekiosk.com. Not you? Reply and we’ll take it off the list.`,
    html: layout(plain(copy.subject), `
<h1 style="margin:0 0 12px;font-size:24px;font-weight:500;letter-spacing:-.02em">${copy.title}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#4a484d">${copy.body}</p>
<p style="margin:0 0 20px"><a href="${copy.cta[1]}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#111214;color:#ffffff;text-decoration:none;font-size:14px">${copy.cta[0]}</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#77757a">You got this because ${esc(to)} was entered on onlyatthekiosk.com. Not you? Reply and we’ll take it off the list.</p>`),
  });
}

export async function sendTeamNotice(env, { interest, email, title, source }) {
  const what = interest === 'stockist' ? 'Stockist request' : interest === 'partner' ? 'Partner request' : `Interest: ${title || interest}`;
  return env.EMAIL.send({
    from: sender(env),
    to: teamAddress(env),
    replyTo: email,
    subject: `${what} · ${email}`,
    text: `${what}\n\nEmail: ${email}\nForm: ${title || interest}\nPage: ${source || '—'}\n\nReply to this email to answer them directly.`,
    html: layout(what, `
<h1 style="margin:0 0 12px;font-size:22px;font-weight:500;letter-spacing:-.02em">${esc(what)}</h1>
<p style="margin:0 0 6px;font-size:15px"><b>Email:</b> <a href="mailto:${esc(email)}" style="color:#111214">${esc(email)}</a></p>
<p style="margin:0 0 6px;font-size:15px"><b>Form:</b> ${esc(title || interest)}</p>
<p style="margin:0 0 20px;font-size:15px"><b>Page:</b> ${esc(source || '—')}</p>
<p style="margin:0;font-size:13px;color:#77757a">Reply to this email to answer them directly.</p>`),
  });
}
