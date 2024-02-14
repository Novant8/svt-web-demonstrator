"use strict";

const jwt = require("jsonwebtoken");
const userDao = require("./user-dao"); // module for accessing the user info in the DB
require("dotenv").config()

//JSON WEB TOKEN SECRET
const jwtSecret =process.env.JWT_SECRET;

exports.registration = async (credentials) => {
  const username = credentials.username;
  try {
    const response = await userDao.getUserByEmail(username)
    if (response){
      return null
    } else{
      const id = await userDao.registerUser(credentials)
      console.log("ID",id)
      if ( typeof id === "number"){
        return id; 
      }else {
        return null; 
      }
    }
  } catch (error) {
    console.log(error)
  }
  
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
  const token = req.cookies.access_token
  if (token){
    if (jwt.verify(token,jwtSecret)) {
      return next();
    }
  
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
  if (jwt.verify(token,jwtSecret)) {
    let decoded = jwt.decode(token, jwtSecret);
    if (decoded.id) return next();

    return res.status(401).json({ error: "You are not the admin !" });
  }

  return res.status(401).json({ error: "Not authenticated" });
};
