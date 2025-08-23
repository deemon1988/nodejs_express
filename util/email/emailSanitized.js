const sanitizeHtml = require("sanitize-html");
const escapeHtml = require("escape-html");

function sanitizeEmailData(parsed) {
  // Заголовки (From, To, Subject и т.д.) — экранируем
  const firstname = parsed.from?.value[0]?.name?.split(" ")[0] || "";
  const lastname = parsed.from?.value[0]?.name?.split(" ")[1] || "";
  const email = parsed.from?.value[0]?.address || "";

  const safeFirstname = escapeHtml(firstname);
  const safeLastname = escapeHtml(lastname);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(parsed.subject || "");

  // Контент письма
  const rawContent = parsed.html || parsed.text || "";
  const safeContent = sanitizeHtml(rawContent, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      a: ["href", "name", "target"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });

  return {
    firstname: safeFirstname,
    lastname: safeLastname,
    email: safeEmail,
    subject: safeSubject,
    contentSanitized: safeContent, // очищенный
  };
}

module.exports = { sanitizeEmailData };
