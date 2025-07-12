const fs = require("fs");
const path = require("path");
const rootPath = require("../util/path");

const p = path.join(path.dirname(rootPath), "data", "users.json");

const getUsersFromFile = (cb) => {
  fs.readFile(p, (err, data) => {
    if (err) {
      cb([]);
    } else {
      console.log(JSON.parse(data));
      cb(JSON.parse(data));
    }
  });
};

module.exports = class User {
  constructor(username, email, password, repeatPass) {
    this.username = username;
    this.email = email;
    this.password = password;
    this.repeatPass = repeatPass;
  }

  save() {
    getUsersFromFile((users) => {
      users.push(this);
      fs.writeFile(p, JSON.stringify(users), (err) => {
        console.error(err);
      });
    });
  }
};
