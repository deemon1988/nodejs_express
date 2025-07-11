const fs = require("fs");
const path = require("path");
const rootPath = require("../util/path");

const p = path.join(path.dirname(rootPath), "data", "posts.json");

const getProductFromFile = (cb) => {
  fs.readFile(p, (err, data) => {
    if (err) {
      return cb([]);
    }
    console.log(JSON.parse(data));
    cb(JSON.parse(data));
  });
};

module.exports = class Post {
  constructor(title, content, category, image) {
    (this.title = title),
      (this.content = content),
      (this.category = category),
      (this.image = image);
  }

  save() {
    getProductFromFile((posts) => {
      posts.push(this);
      fs.writeFile(p, JSON.stringify(posts), (err) => {
        console.log(err);
      });
    });
  }

  static fetchAll(cb) {
    getProductFromFile(cb);
  }
};
