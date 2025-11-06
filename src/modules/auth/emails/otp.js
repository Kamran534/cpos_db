function otpHtml({ code, minutes }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
    <h2>Verify your email</h2>
    <p>Your one-time code is:</p>
    <div style="font-size:28px;font-weight:bold;letter-spacing:4px;padding:12px 0">${code}</div>
    <p>This code expires in ${minutes} minutes.</p>
  </div>`;
}

function otpText({ code, minutes }) {
  return `Your verification code is ${code}. Expires in ${minutes} minutes.`;
}

module.exports = { otpHtml, otpText };


