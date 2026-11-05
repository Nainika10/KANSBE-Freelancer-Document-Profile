const generateKansbeEmail = (body, buttons = []) => {

  // =========================
  // GENERATE BUTTONS
  // =========================

  const buttonsHtml = buttons.length > 0
    ? `
      <div style="text-align:center; margin:25px 0;">

        ${buttons.map(button => `
          <a
            href="${button.url}"
            target="_blank"
            style="
              display:inline-block;
              background-color:#ef2f2c;
              color:#ffffff !important;
              padding:12px 24px;
              margin:6px 5px;
              border-radius:6px;
              text-decoration:none;
              font-weight:600;
              font-size:14px;
            "
          >
            ${button.text}
          </a>
        `).join('')}

      </div>
    `
    : '';


  // =========================
  // COMPLETE EMAIL
  // =========================

  return `
<!DOCTYPE html>

<html lang="en">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>KANSBE</title>


  <style>

    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background-color: #f4f6f8;
      margin: 0;
      padding: 0;
      color: #333;
    }


    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;

      border-radius: 10px;

      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.05);

      overflow: hidden;
    }


    .header {
      background: #ef2f2c;

      padding: 20px;

      text-align: center;

      color: #ffffff;

      font-size: 24px;

      font-weight: bold;

      letter-spacing: 1px;
    }


    .content {
      padding: 30px;

      text-align: left;

      line-height: 1.6;
    }


    .content p {
      margin: 12px 0;
    }


    .footer {
      text-align: center;

      font-size: 13px;

      color: #666;

      padding: 20px;

      background: #f9f9f9;

      border-top: 1px solid #eee;

      line-height: 1.5;
    }


    .footer a {
      color: #ef2f2c;

      text-decoration: none;
    }

  </style>

</head>


<body>

  <div class="container">


    <!-- HEADER -->

    <div class="header">
      KANSBE
    </div>


    <!-- CONTENT -->

    <div class="content">

      <p>
        Hi there,
      </p>


      ${body}


      <!-- BUTTONS -->

      ${buttonsHtml}


      <p>

        With warmth,<br>

        <strong>
          Team Kansbe
        </strong>

        <br>

        Freedom. Meaning. Possibility.

      </p>

    </div>


    <!-- FOOTER -->

    <div class="footer">

      <p>

        For any assistance, reach us at

        <a href="mailto:kiranc@kansbe.com">
          kiranc@kansbe.com
        </a>

      </p>


      <p>

        © ${new Date().getFullYear()}
        KANSBE. All rights reserved.

      </p>

    </div>


  </div>

</body>

</html>
`;
};


module.exports = {
  generateKansbeEmail
};
