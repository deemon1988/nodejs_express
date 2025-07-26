 function forEach(items, callback) {
  for (const item of items) {
    callback(item);
  }
}



// forEach([1,2,3], (x) => console.log(42 + x))

module.exports = { forEach };

const allIds = [1,2,3,4,5,1,23,2]

const targetIds = new Set([1,46,98,5])

const allSetFiltered= allIds.filter(id => !targetIds.has(id))

console.log(allSetFiltered)