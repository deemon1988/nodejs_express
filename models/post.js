const fs = require("fs");
const path = require("path");
const rootPath = require("../util/path");

const p = path.join(path.dirname(rootPath), "data", "posts.json");

const getPostsFromFile = (cb) => {
  fs.readFile(p, (err, data) => {
    if (err) {
      cb([]);
    } else {
      cb(JSON.parse(data));
    }
  });
};

module.exports = class Post {
  constructor(id, title, content, category, image) {
    (this.id = id),
      (this.title = title),
      (this.content = content),
      (this.category = category),
      (this.image = image);
  }

  save() {
    getPostsFromFile((posts) => {
      if (this.id) {
        const existingPostIndex = posts.findIndex((p) => p.id === this.id);
        const updatedPosts = [...posts];
        updatedPosts[existingPostIndex] = this;
        fs.writeFile(p, JSON.stringify(updatedPosts), (err) => {
          console.log(err);
        });
      } else {
        this.id = Math.random().toString();
        posts.push(this);
        fs.writeFile(p, JSON.stringify(posts), (err) => {
          console.log(err);
        });
      }
    });
  }

  static delete(id) {
    getPostsFromFile((posts) => {
      const updatedPosts = posts.filter((prod) => prod.id !== id);
      // const updatedPosts = [...posts];
      // updatedPosts.splice(deleteablePostIndex, 1);
      fs.writeFile(p, JSON.stringify(updatedPosts), (err) => {
        console.error(err);
      });
    });
  }

  static fetchAll(cb) {
    getPostsFromFile(cb);
  }

  static findByID(id, cb) {
    getPostsFromFile((posts) => {
      const post = posts.find((p) => p.id === id);
      cb(post);
    });
  }

  static postLikeUpdate(id, cb) {
    getPostsFromFile((posts) => {
      const post = posts.find((p) => p.id === id);
      post.likes += 1;
      cb(post);
    });
  }
};
