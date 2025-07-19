exports.getRandomPosts = (arr, quantity) => {
  const copy = [...arr];
  const randomArr = [];

  for (let i = 0; i < quantity && copy.length > 0; i++) {
    const j = Math.floor(Math.random() * copy.length);
    randomArr.push(copy.splice(j, 1)[0]);
  }

  return randomArr;
};
