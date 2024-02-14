"use strict";

const libxmljs = require("libxmljs");

/**
 * Sets `req.body` so that the page's content is in JSON format.
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {express.NextFunction} next 
 */
exports.parsePageXML = (req, res, next) => {
    let pageXml;
    try {
        pageXml = libxmljs.parseXml(req.body, { noent: false });
    } catch(e) {
        return res.status(422).json({ error: "Invalid XML structure." });
    }

    // Page element
    const pageEl = pageXml.root();
    if(pageEl === null)
        return res.status(422).json({ error: "XML document has no root." });
    if(pageEl.name() !== "page")
        return res.status(422).json({ error: "Root XML element is not a page." });

    // Build page JSON object
    const author = pageEl.getAttribute("author")?.value() || undefined;
    req.body = {
        title: pageEl.getAttribute("title")?.value() || undefined,
        publicationDate: pageEl.getAttribute("publicationDate")?.value() || undefined,
        author: author && parseInt(author),
        blocks: pageEl.find("//block").map(blockEl => ({
            type: blockEl.getAttribute("type")?.value() || undefined,
            content: blockEl.text()
        }))
    };

    next();
}