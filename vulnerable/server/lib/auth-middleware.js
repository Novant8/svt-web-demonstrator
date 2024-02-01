"use strict";

const jwt = require("jsonwebtoken");
const userDao = require('./user-dao'); // module for accessing the user info in the DB


//JSON WEB TOKEN SECRET
const jwtSecret = "mydfs68jlk5620jds7akl8m127a8sdh168hj";

/*** Set up Passport ***/
/* // set up the "username and password" login strategy
// by setting a function to verify username and password
passport.use(new LocalStrategy(
function(username, password, done) {
    userDao.getUser(username, password).then((user) => {
    if (!user)
        return done(null, false, { error: 'Incorrect username and/or password.' });
        
    return done(null, user);
    })
}
));

// serialize and de-serialize the user (user object <-> session)
// we serialize the user id and we store it in the session: the session is very small in this way
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// starting from the data in the session, we extract the current (logged-in) user
passport.deserializeUser((id, done) => {
    userDao.getUserById(id)
        .then(user => {
            done(null, user); // this will be available in req.user
        }).catch(err => {
            done(err, null);
        });
}); */

exports.login = async (credentials)=>{
   
    const password = credentials.password;
    const username = credentials.username ;

    return await userDao.getUser(username,password).then(user => {return user;}).catch(err =>console.log(err) )
    
}

/**
 * Middleware that checks if a given request is coming from an authenticated user
 * @param {Express.Request} req 
 * @param {Express.Response} res 
 * @param {Express.NextFunction} next
 */
exports.isLoggedIn = (req, res, next) => {
    
    if(req.cookies.access_token){
        return next();
    }
    

    return res.status(401).json({ error: 'Not authenticated'});
}

/**
 * Middleware that checks if a given request is coming from a user with admin privileges
 * @param {Express.Request} req 
 * @param {Express.Response} res 
 * @param {Express.NextFunction} next
 */
exports.isAdmin = (req, res, next) => {
    const token = req.cookies.access_token;
    if(token){
        let decoded = jwt.decode(token,jwtSecret)
        if (decoded.id)
            return next();
        
        return res.status(401).json({ error: 'You are not the admin !'});
    }

        

    return res.status(401).json({ error: 'Not authenticated'});
}

