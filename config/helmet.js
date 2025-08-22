const helmet = require('helmet');

const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net"
      ],
      styleSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com",
        "'unsafe-inline'"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://fonts.gstatic.com",
        "*"
      ],
      fontSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://fonts.gstatic.com",
        ""
      ]
    },
  },
});

module.exports = helmetConfig;