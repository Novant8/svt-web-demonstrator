"use strict";

const jwt = require("jsonwebtoken");
const userDao = require("./user-dao"); // module for accessing the user info in the DB

//JSON WEB TOKEN SECRET
const jwtSecret = "mydfs68jlk5620jds7akl8m127a8sdh168hj";

exports.registration = async (credentials) => {
  const username = credentials.username;

  return await userDao
    .getUserByEmail(username)
    .then((response) => {
        if (!response){
            userDao.registerUser(credentials).then(id=>{return id;}).catch (err=>console.log(err))
        } 
        
        return null; 
     
    })
    .catch((err) => console.log(err));
};

exports.login = async (credentials) => {
  const password = credentials.password;
  const username = credentials.username;

  return await userDao
    .getUser(username, password)
    .then((user) => {
      return user;
    })
    .catch((err) => console.log(err));
};

/**
 * Middleware that checks if a given request is coming from an authenticated user
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
 */
exports.isLoggedIn = (req, res, next) => {
  if (req.cookies.access_token) {
    return next();
  }

  return res.status(401).json({ error: "Not authenticated" });
};

/**
 * Middleware that checks if a given request is coming from a user with admin privileges
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
 */
exports.isAdmin = (req, res, next) => {
  const token = req.cookies.access_token;
  if (token) {
    let decoded = jwt.decode(token, jwtSecret);
    if (decoded.id) return next();

    return res.status(401).json({ error: "You are not the admin !" });
  }

  return res.status(401).json({ error: "Not authenticated" });
};
