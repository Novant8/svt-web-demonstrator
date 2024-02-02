'use strict';

require('../typedefs');

const express = require('express');

const { isLoggedIn, isAdmin, passport } = require("./lib/auth-middleware.js"); // auth middleware
const session = require('express-session'); // enable sessions
const cors = require('cors');
const morgan = require('morgan');
const { listPages, getPageWithBlocks, createPage, deletePage, changeWebsiteName, getWebsiteName, editPage, listImages, pageHasBlock, getPage } = require('./lib/dao.js');
const { check, validationResult } = require('express-validator');
const { listUsers, isRegisteredUser } = require('./lib/user-dao.js');
const { parsePageXML } = require("./lib/xml.js");
const { downloadBlockImages } = require("./lib/image-upload.js");

/**
 * init express
 * @type {express.Application}
 */
const app = new express();
const port = 3001;

// build app main middleware
app
  .use(morgan("dev"))
  .use(express.text({ type: "text/xml", limit: "25mb" }))
  .use(express.json())
  .use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }))
  .use(session({
    // by default, Passport uses a MemoryStore to keep track of the sessions
    secret: "secret",
    resave: false,
    saveUninitialized: false 
  }))
  .use(passport.initialize())
  .use(passport.session())
  .use(express.static('static'));

/*** Users APIs ***/

// POST /sessions 
// login
app.post('/api/sessions', function(req, res, next) {
  passport.authenticate('local', (err, user, info) => {
    if (err)
      return next(err);
      if (!user) {
        // display wrong login message like { error: "..." }
        return res.status(401).json(info);
      }
      // success, perform the login
      req.login(user, (err) => {
        if (err)
          return next(err);
        
        // this is coming from userDao.getUser()
        return res.json(req.user);
      });
  })(req, res, next);
});

// DELETE /sessions/current 
// logout
app.delete('/api/sessions/current', (req, res) => {
  req.logout( ()=> { res.status(204).end(); } );
});

// GET /sessions/current
// check whether the user is logged in or not
app.get('/api/sessions/current', isLoggedIn, (req, res) => {
  res.status(200).json(req.user);
});

/*** Page fetching ***/

// GET /pages
// list all pages
app.get('/api/pages', (req, res) => {
  listPages(req.user)
    .then(pages => res.json(pages))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Unable to fetch pages from the database." })
    });
});

// GET /pages/:id
// retrieve information (including blocks) of single page
app.get('/api/pages/:id', (req, res) => {
  const page_id = parseInt(req.params.id);
  getPageWithBlocks(page_id, req.user)
    .then(page => {
      if(typeof page === 'undefined')
        res.status(404).json({ error: "Page not found!" })
      else
        res.json(page);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Unable to fetch page from the database." })
    });
});

/*** Page creation/modification/deletion ***/

/**
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {express.NextFunction} next 
 */
function validateBody(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({errors: errors.array()});
  next();
}

const addValidationChain = [
  check("title").isString().notEmpty(),
  check("publicationDate").isDate({ format: 'YYYY-MM-DD' }).optional(),
  check("author")
    .isInt()
    .custom((author, { req }) => author === req.user.id || req.user.admin)
    .withMessage("Only admins can set authors as a different user.")
    .custom(async (author) => {
      if(!await isRegisteredUser(author))
        throw new Error("The author must be a registed user.");
    })
    .optional(),
  check("blocks").isArray(),
  check("blocks.*.type")
    .isIn([ 'header', 'paragraph', 'image' ])
    .withMessage("Block type must be 'header', 'paragraph' or 'image'"),
  check("blocks.*.content").isString().notEmpty(),
  check("blocks")
    .custom(blocks => blocks.some(b => b.type === 'header') && blocks.some(b => b.type !== 'header'))
    .withMessage("The page must contain at least one header and another type of block.")
];

// POST /pages
// create a new page
app.post("/api/pages", isLoggedIn, parsePageXML, addValidationChain, validateBody, downloadBlockImages, (req, res) => {
  let page      = req.body;
  const author  = page.author || req.user.id;
  createPage(page, author)
    .then(({ pageId: id, blockIDs: blocks }) => {
      res.status(201).json({ id, blocks });
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Unable to add page to the database." });
    });
});

/**
 * Middleware that checks that the page ID contained in `req.params` is relative to a valid page.
 * Otherwise, it responds with a 404 error.
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {express.NextFunction} next 
 */
async function validPageID(req, res, next) {
  const pageId = parseInt(req.params.id);
  if(typeof await getPage(pageId, req.user) === 'undefined')
    res.status(404).json({ error: "Page not found!" })
  else
    next();
}

const editValidationChain = [
  validPageID,
  ...addValidationChain,
  check("blocks.*.id")
    .isInt()
    .custom(async (blockId, { req: { params: { id: pageId } } }) => {
      if(!await pageHasBlock(parseInt(pageId), blockId))
        throw new Error("This block is not part of the page.");
    })
    .optional()
  /**
   * Here is not checked that the logged user is the page's author or an admin.
   * This will be done inside the `editPage` function with an additional WHERE clause (see bottom)
   */
]

// PUT /pages
// edit existing page
app.put("/api/pages/:id", isLoggedIn, parsePageXML, editValidationChain, validateBody, (req, res) => {
  let id        = parseInt(req.params.id);
  let page      = { ...req.body, id };
  const author  = page.author || req.user.id;
  editPage(page, author, req.user)
    .then(({ changes, blocks }) => {
      if(changes)
        res.json({ blocks }).end();
      else
        res.status(401).json({ error: "You cannot edit this page!" }) /* `editPage` contains an additional WHERE clause which checks that the logged user has permission to edit the page, so if there are no changes it means that either the page doesn't exist or the user has no permission.
                                                                         However, we know that the page exists from the validation chain (`validPageID`), so the only reason there are no changes is because the user doesn't have permission to edit the page. */
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Unable to edit the page." });
    });
});

// DELETE /pages/:id
// delete an existing page
app.delete("/api/pages/:id", isLoggedIn, validPageID, (req, res) => {
  const page_id = parseInt(req.params.id)
  deletePage(page_id, req.user)
    .then(deleted_rows => {
      if(deleted_rows > 0)
        res.status(204).end();
      else
        res.status(401).json({ error: "You cannot delete this page!" }); /* This has the same reasoning as the comment above ^ */
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Unable to delete page from the database." });
    });
});

/*** Website Name APIs ***/

// GET /website/name
// get the website's name
app.get("/api/website/name", (req, res) => {
  getWebsiteName()
    .then(name => res.json({ name }))
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch the website's name from the database." });
    });
})

// PUT /website/name
// edit the website's name
app.put("/api/website/name", isAdmin, [
  check("name").isString().notEmpty()
], validateBody, (req, res) => {
  changeWebsiteName(req.body.name)
    .then(() => res.status(204).end())
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Unable to edit the website's name." });
    });
});

// GET /users
// list all users
app.get("/api/users", isAdmin, (req, res) => {
  listUsers()
    .then(users => res.json(users))
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch users the from database." });
    });
});

// GET /images
// list all images
app.get("/api/images", isLoggedIn, (req, res) => {
  listImages()
    .then(images => res.json(images))
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Unable to fetch images the from database." });
    });
});

// activate the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
