const sanitizeHtml = require("sanitize-html");

function cleanInput(input) {
  return sanitizeHtml(input, {
    allowedTags: [
      "p",
      "br",
      "hr",
      "h1",
      "h2",
      "h3",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "img",
      "a",
      "blockquote",
      "code",
      "pre",
    ],
    allowedAttributes: {
      img: ["src", "alt", "title", "width", "height", "loading"],
      a: ["href", "target", "rel", "title"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
      a: ["http", "https", "mailto"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        "a",
        { rel: "nofollow", target: "_blank" },
        true
      ),
    },
    disallowedTagsMode: "discard",
  });
}

module.exports = { cleanInput };
