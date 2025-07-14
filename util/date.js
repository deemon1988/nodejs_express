function formatDate(date) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  const formatted = new Date(date).toLocaleDateString("ru-RU", options);

  return formatted.replace(" г.", "").replace(" в", "");
}

function formatDateOnly(date) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const formatted = new Date(date).toLocaleDateString("ru-RU", options);

  return formatted.replace(" г.", "")
}

module.exports = { formatDate, formatDateOnly };
