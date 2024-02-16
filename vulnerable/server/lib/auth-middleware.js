"use strict";

const jwt = require("jsonwebtoken");
const userDao = require("./user-dao"); // module for accessing the user info in the DB

//JSON WEB TOKEN SECRET
const jwtSecret = "mydfs68jlk5620jds7akl8m127a8sdh168hj";

exports.registration = async (credentials) => {
  const username = credentials.username;
  try {
    const response = await userDao.getUserByEmail(username);
    if (response) {
      return null;
    } else {
      const id = await userDao.registerUser(credentials);
      if (typeof id === "number") {
        return id;
      } else {
        throw null;
      }
    }
  } catch (error) {
   throw error;
  }
};


/**
 * Middleware that checks if a given request is coming from an authenticated user
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
 */
exports.isLoggedIn = (req, res, next) => {
  const token = req.cookies.access_token;
  const decode = jwt.decode(token, jwtSecret);
  console.log("HERE",decode)
  if (token) {
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
