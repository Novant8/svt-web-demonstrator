'use strict';
/* Data Access Object (DAO) module for accessing users */

require("../../typedefs");

const sqlite = require('sqlite3');
const crypto = require('crypto');

// open the database
const db = new sqlite.Database('cms.db', (err) => {
  if(err) throw err;
});

/**
 * Retrieves user info from the database, given their ID
 * @param {number} id - ID of the user
 * @returns {Promise<User>}
 */
exports.getUserById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE id = ?';
      db.get(sql, [id], (err, row) => {
        if (err) 
          reject(err);
        else if (row === undefined)
          resolve({error: 'User not found.'});
        else {
          // by default, the local strategy looks for "username": not to create confusion in server.js, we can create an object with that property
          const user = {id: row.id, username: row.mail, name: row.name, admin: row.admin};
          resolve(user);
        }
    });
  });
};

/**
 * Retrieves user info from the database, given their credentials
 * @param {string} email    - Email of the user
 * @param {string} password - Cleartext password of the user
 * @returns {Promise<User | false>} - Promise that resolves with the user's information. Resolves with `false` if information is incorrect
 */
exports.getUser = (email, password) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE mail = ?';
      db.get(sql, [email], (err, row) => {
        if (err) { reject(err); }
        else if (row === undefined) { resolve(false); }
        else {
          const user = {id: row.id, username: row.mail, name: row.name, admin: row.admin};
          
          const salt = row.pswSalt;
          crypto.scrypt(password, salt, 64, (err, hashedPassword) => {
            if (err) reject(err);

            const passwordHex = Buffer.from(row.pswHash, 'hex');

            if(!crypto.timingSafeEqual(passwordHex, hashedPassword))
              resolve(false);
            else resolve(user); 
          });
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
    const sql = 'SELECT * FROM users';
      db.all(sql, [], (err, rows) => {
        if (err) 
          reject(err);
        else {
          const user = rows.map(row => ({id: row.id, name: row.name, admin: row.admin}));
          resolve(user);
        }
    });
  });
}

/**
 * Checks if the given ID belongs to a registered user.
 * @param {number} id         - The ID of the user
 * @param {Promise<boolean>}  - Promise that resolves with `true` if the user is registered, `false` if otherwise.
 */
exports.isRegisteredUser = (id) => {
  return this.getUserById(id).then(result => {
    if(result.error) {
      if(result.error === 'User not found.')
        return false;
      else
        throw result.error;
    }
    return true;
  })
}