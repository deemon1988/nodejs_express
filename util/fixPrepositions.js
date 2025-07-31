
const he = require('he')
const prepositions = [
    'в', 'на', 'с', 'у', 'за', 'по', 'из', 'от', 'до', 'при',
    'к', 'перед', 'через', 'между', 'над', 'под', 'около', 'возле',
    'вдоль', 'после', 'вместо', 'вопреки', 'благодаря', 'согласно',
    'ввиду', 'вследствие', 'внутри', 'вне', 'вокруг', 'для'
];



// Теперь ищем: предлог + пробел
const prepositionsPattern = new RegExp(
    `(?<=\\s|^)(${prepositions.join('|')})\\s`, 'gi'
);

function fixPrepositions(html) {
    if (typeof html !== 'string') return html;

    // Декодируем HTML-сущности, если они были экранированы
    const decoded = he.decode(html);
    const result = decoded.replace(prepositionsPattern, (match, p1) => {
        return `${p1}&nbsp;`; // заменяем "в " на "в&nbsp;"
    });

    return result;
}

module.exports = { fixPrepositions };