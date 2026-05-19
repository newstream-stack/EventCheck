import nodemailer from 'nodemailer';

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordEmail(to, name, password) {
  await getTransporter().sendMail({
    from: `"活動報到系統" <${process.env.SMTP_FROM}>`,
    to,
    subject: '您的系統帳號已建立',
    html: `
      <h2>歡迎，${name}！</h2>
      <p>您的帳號已建立，以下是您的登入資訊：</p>
      <p><strong>Email：</strong>${to}</p>
      <p><strong>密碼：</strong><code>${password}</code></p>
      <p>請登入後盡快修改密碼。</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login">點此登入系統</a></p>
    `,
  });
}

const DEFAULT_SUBJECT = '【{{event_name}}】報到 QR Code';
const DEFAULT_BODY = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;">
  <div style="background:#4f46e5;padding:28px 32px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px;color:#fff;">{{event_name}}</h1>
    <p style="margin:6px 0 0;font-size:14px;color:#c7d2fe;">報到通知</p>
  </div>
  <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 16px;">您好，<strong>{{name}}</strong>，</p>
    <p style="margin:0 0 16px;">感謝您報名參加本次活動，以下是您的報名資訊：</p>
    <table style="border-collapse:collapse;width:100%;margin-bottom:24px;">
      <tr>
        <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;width:30%;font-size:13px;color:#6b7280;">報名編號</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">{{reg_id}}</td>
      </tr>
    </table>
    <p style="margin:0 0 12px;font-weight:600;">請於活動當天出示以下 QR Code 進行報到：</p>
    <div style="text-align:center;padding:20px 0;">
      {{qr_code}}
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;border-top:1px solid #f3f4f6;padding-top:16px;">
      如有任何問題，請聯絡主辦單位。<br>請勿回覆此封自動發送的郵件。
    </p>
  </div>
</div>`;

function applyTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export async function sendQRCodeEmail(to, name, regId, eventName, qrCodeDataUrl, template = null) {
  const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
  const qrImgTag = '<img src="cid:qrcode" alt="QR Code" style="width:250px;height:250px;" />';

  const vars = { name, reg_id: regId.split('-').pop(), event_name: eventName, qr_code: qrImgTag };
  const subject = applyTemplate(template?.subject || DEFAULT_SUBJECT, vars);
  const html = applyTemplate(template?.body_html || DEFAULT_BODY, vars);

  await getTransporter().sendMail({
    from: `"活動報到系統" <${process.env.SMTP_FROM}>`,
    to,
    subject,
    html,
    attachments: [{
      filename: 'qrcode.png',
      content: base64Data,
      encoding: 'base64',
      cid: 'qrcode',
    }],
  });
}

export { DEFAULT_SUBJECT, DEFAULT_BODY };
