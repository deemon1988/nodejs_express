const Sequelize = require("sequelize");

const sequelize = require("../util/database");

const Post = sequelize.define("post", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  content: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  category: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  image: {
    type: Sequelize.STRING,
    allowNull: false,
  },

  likes: {
    type: Sequelize.INTEGER,
    allowNull: true,
  }
});

module.exports = Post;

// const db = require("../util/database");

// module.exports = class Post {
//   constructor(id, title, content, category, image) {
//     (this.id = id),
//       (this.title = title),
//       (this.content = content),
//       (this.category = category),
//       (this.image = image);
//   }

//   save() {
//     return db.query(
//       "INSERT INTO posts(title, content, category, imageurl) VALUES ($1, $2, $3, $4)",
//       [this.title, this.content, this.category, this.image]
//     );
//   }

//   static delete(id) {
//     getPostsFromFile((posts) => {
//       const updatedPosts = posts.filter((prod) => prod.id !== id);
//       // const updatedPosts = [...posts];
//       // updatedPosts.splice(deleteablePostIndex, 1);
//       fs.writeFile(p, JSON.stringify(updatedPosts), (err) => {
//         console.error(err);
//       });
//     });
//   }

//   static fetchAll() {
//     return db.query("SELECT * FROM posts");
//   }

//   static findByID(id) {
//     return db.query("SELECT * FROM posts WHERE id = $1", [id])
//   }

//   static postLikeUpdate(id, cb) {
//     getPostsFromFile((posts) => {
//       const post = posts.find((p) => p.id === id);
//       post.likes += 1;
//       cb(post);
//     });
//   }
// };
