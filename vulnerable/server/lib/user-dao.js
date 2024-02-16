"use strict";
/* Data Access Object (DAO) module for accessing users */

require("../../typedefs");

const sqlite = require("sqlite3");
const crypto = require("crypto");

// open the database
const db = new sqlite.Database("cms.db", (err) => {
  if (err) throw err;
});

/**
 * Retrieves user info from the database, given their ID
 * @param {number} id - ID of the user
 * @returns {Promise<User>}
 */
exports.registerUser = (credentials) => {
  const hashedPassword = crypto
    .createHash("md5")
    .update(credentials.password)
    .digest("hex");

  return new Promise((resolve, reject) => {
    const sql = "INSERT INTO users (name, mail, pswHash, admin) VALUES (?,?,?,?)";
    db.run(
      sql,
      [
        credentials.name,
        credentials.username.trim().toLowerCase(),
        hashedPassword,
        credentials.admin,
      ],
      function (err) {
        if (err) {
          reject(err);
        } else {
          console.log("LASTID", this.lastID);
          resolve(this.lastID);
        }
      }
    );
  });
};


/**
 * Retrieves user info from the database, given their ID
 * @param {number} id - ID of the user
 * @returns {Promise<User>}
 */
exports.getUserById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM users WHERE id = ?";
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else if (row === undefined) resolve({ error: "User not found." });
      else {
        // by default, the local strategy looks for "username": not to create confusion in server.js, we can create an object with that property
        const user = {
          id: row.id,
          username: row.mail,
          name: row.name,
          admin: row.admin,
        };
        resolve(user);
      }
    });
  });
};

/**
 * checks if the user is in the database based on their email
 * @param {string} email - email of the user
 * @returns {Promise<User>}
 */
exports.getUserByEmail = (email) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM users WHERE mail = ?";
    db.get(sql, [email], (err, row) => {
      if (err) reject(err);
      else if (row === undefined) resolve(false);
      else {
        resolve(true);
      }
    });
  });
};



/**
 * Lists all the users
 * @returns {Promise<User>} - Promise that resolves with a list of all the users and their info
 */
exports.listUsers = () => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM users";
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else {
        const user = rows.map((row) => ({
          id: row.id,
          name: row.name,
          admin: row.admin,
        }));
        resolve(user);
      }
    });
  });
};

/**
 * Checks if the given ID belongs to a registered user.
 * @param {number} id         - The ID of the user
 * @param {Promise<boolean>}  - Promise that resolves with `true` if the user is registered, `false` if otherwise.
 */
exports.isRegisteredUser = (id) => {
  return this.getUserById(id).then((result) => {
    if (result.error) {
      if (result.error === "User not found.") return false;
      else throw result.error;
    }
    return true;
  });
};
