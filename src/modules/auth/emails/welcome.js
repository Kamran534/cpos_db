function welcomeHtml({ firstName }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
    <h2>Welcome${firstName ? ', ' + firstName : ''}!</h2>
    <p>Your account has been verified. You can now sign in and start using the system.</p>
  </div>`;
}

function welcomeText({ firstName }) {
  return `Welcome${firstName ? ', ' + firstName : ''}! Your account has been verified.`;
}

module.exports = { welcomeHtml, welcomeText };


