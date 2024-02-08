"use strict";

require("../../typedefs");

const sqlite = require('sqlite3');
const dayjs = require('dayjs');
const { getUserById } = require('./user-dao');

// open the database
const db = new sqlite.Database('cms.db', (err) => {
  if(err) throw err;
});

/**
 * @returns {string} Today's date with format "YYYY-MM-DD"
 */
const TODAY = () => dayjs().format('YYYY-MM-DD');

/**
 * Gets a list of pages from the database
 * @param {User} user           - Logged in user. If undefined, front-office pages are fetched.
 * @returns {Promise<Page[]>}   - Promise that resolves with an array of the pages
 */
exports.listPages = (user = undefined) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT pages.id, title, publicationDate, creationDate, author, users.name AS authorName, users.admin AS authorAdmin ' +
                    'FROM pages, users '+
                    `WHERE pages.author = users.id ${user ? '' : 'AND publicationDate <= ?'} `+
                    'ORDER BY publicationDate, pages.id';
        
        db.all(sql, user ? [] : [TODAY()], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            const pages = rows.map((e) => {
                return {
                    id: e.id,
                    title: e.title,
                    author: {
                        id: e.author,
                        name: e.authorName,
                        admin: e.authorAdmin
                    },
                    creationDate: e.creationDate,
                    publicationDate: e.publicationDate
                }
            });
            resolve(pages);
        });
    });
  };

/**
 * Gets information related to a single page given its id
 * @param {number} id       - ID of the page
 * @param {User} [user]     - Logged in user 
 * @returns {Promise<Page>} - Promise that resolves with the page, or `undefined` if it doesn't exist/user has no permission.
 */
exports.getPage = (id, user) => {
    return new Promise((resolve, reject) => {
        let sql = 'SELECT id, title, publicationDate, creationDate, author '+
                  'FROM pages WHERE id = ? ';
        const params = [id];
        
        /* Show only published pages if the user is not logged in */
        if(!user) {
            sql += 'AND publicationDate <= ?';
            params.push(TODAY());
        }

        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (row === undefined) {
                resolve(row);
                return;
            }
            getUserById(row.author)
                .then(author => {
                    delete author.username;
                    const page = {
                        id: row.id,
                        title: row.title,
                        author: author,
                        creationDate: row.creationDate,
                        publicationDate: row.publicationDate
                    };
                    resolve(page);  
                })
                .catch(reject);
        });
    });
};

/**
 * Gets information related to a single page, including its content blocks, given its id.
 * @param {number} id                   - ID of the page to fetch
 * @param {User} [user]                 - Logged in user
 * @returns {Promise<PageWithBlocks>}   - Promise that resolves with the page, including its blocks, or undefined if it doesn't exist/user has no permission.
 */
exports.getPageWithBlocks = (id, user) => {
    return new Promise((resolve, reject) => {
        this.getPage(id, user)
            .then(page => {
                if(typeof page === 'undefined')
                    return resolve(page);
                const sql = 'SELECT id, type, content FROM blocks WHERE page = ? ORDER BY `order`';
                db.all(sql, [id], (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    const blocks = rows.map(row => ({ id: row.id, type: row.type, content: row.content }));
                    page.blocks = blocks;
                    resolve(page);
                });
            })
    })
};

/**
 * Inserts a block in the database and associates it with a page
 * @param {Block} block         - The block
 * @param {number} pageId       - ID of page to associate block with
 * @param {number} order        - Display order of the block
 * @returns {Promise<number>}   - ID of the new block
 */
const addBlockToPage = (block, pageId, order) => {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO blocks(type, content, page, `order`) VALUES(?, ?, ?, ?)';
        db.run(sql, [block.type, block.content, pageId, order], function(err) {
            if(err) {
                reject(err);
                return;
            }
            resolve(this.lastID);
        })
    })
}

/**
 * Edits an existing block's information in the database.
 * This function assumes that the logged user has permission to edit all the blocks. This must be checked beforehand.
 * @param {Block} block         - Object containing the block's ID in the database and the updated information.
 * @param {number} pageId       - ID of the page which the block should be in.
 * @returns {Promise<number>}   - Promise which resolves with the number of affected lines
 */
const editPageBlock = (block, pageId) => {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE blocks SET type = ?, content = ?, `order` = ? WHERE id = ? AND page = ?';
        db.run(sql, [block.type, block.content, block.order, block.id, pageId], function(err) {
            if(err) {
                reject(err);
                return;
            }
            resolve(this.changes);
        })
    })
}

/**
 * Deletes all blocks inside a single page, preserving those given.
 * This function assumes that the logged user has permission to delete all the blocks. This must be checked beforehand.
 * @param {number[]} blockIDs   - Array containing IDs of blocks which do NOT have to be deleted.
 * @param {number} pageId       - ID of the page
 * @returns {Promise<number>}   - Promise which resolves with the number of affected lines.
 */
const preserveBlocks = (blockIDs, pageId) => {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM blocks WHERE page = ? AND id NOT IN (${blockIDs.map(() => '?').join(',')})`;
        db.run(sql, [pageId, ...blockIDs], function(err) {
            if(err) {
                reject(err);
                return;
            }
            resolve(this.changes);
        })
    })
}

/**
 * Deletes all blocks related to a page, given its ID. Also takes user permissions into account.
 * This function assumes that the logged user has permission to delete all the blocks. This must be checked beforehand.
 * @param {number} pageId       - ID of the page
 * @returns {Promise<number>}   - Promise that resolves with number of blocks deleted
 */
function deletePageBlocks(pageId) {
    return preserveBlocks([], pageId); // Delete all blocks of page <=> Preserve no blocks of page
}

/**
 * Checks if a block is contained in a page
 * @param {number} pageId       - ID of the page 
 * @param {number} blockId      - ID of the block 
 * @returns {Promise<boolean>}  - Promise that resolves with `true` if the block is contained in the page.
 */
exports.pageHasBlock = (pageId, blockId) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM blocks WHERE id = ? AND page = ?';
        db.get(sql, [blockId, pageId], function(err, row) {
            if(err) {
                reject(err);
                return;
            }
            resolve(!!row);
        })
    })
}

/**
 * @typedef CreatePageReturn
 * @property {number} pageId
 * @property {number[]} blockIDs
 */

/**
 * Add a new page, with relative blocks
 * @param {PageWithBlocks} page         - The page
 * @param {number} author               - User ID of author
 * @returns {Promise<CreatePageReturn>} - ID of the new page followed by the IDs of its blocks
 */
exports.createPage = (page, author) => {
    return new Promise((resolve, reject) => {
        /* Add page */
        const sql = 'INSERT INTO pages(title, creationDate, publicationDate, author) VALUES(?, ?, ?, ?)';
        db.run(sql, [
            page.title,
            TODAY(),
            page.publicationDate || null,
            author
        ], function (err) {
            if (err) {
                reject(err);
                return;
            }
            const pageId = this.lastID;

            /* Add blocks */
            Promise.all(page.blocks.map((b, i) => addBlockToPage(b,pageId,i)))
                .then(blockIDs => resolve({ pageId, blockIDs }))
                .catch(err => reject(err));
        });
    });
}

/**
 * @typedef EditPageResult
 * @type {object}
 * @property {number[]} [blocks]    - IDs of the newly added blocks, if the operation is successful
 * @property {string}   [error]     - Error message
 */

/**
 * Edit an existing page, with its relative blocks.
 * 
 * How it works:
 * - If a page's block (`page.blocks[i]`) has an ID, then it's to be edited
 * - If a page's block does NOT have an ID, then it's to be added
 * - If a page's block is present in the database but not in `page.blocks`, then it's to be deleted.
 *   In other words, blocks to be edited must be *preserved*.
 * 
 * @param {PageWithBlocks} page         - The page
 * @param {number} author               - User ID of author
 * @param {User} user                   - User that is currently logged in 
 * @returns {Promise<EditPageResult>}   - Promise that resolves with an object containing the new blocks' IDs, OR an error message.
 *                                        This error is assumed to be related to an invalid page body.
 */
exports.editPage = (page, author, user) => {
    const blocks                = page.blocks.map((b, order) => ({ ...b, order }));
    const blocksToAdd           = blocks.filter(b => typeof b.id === 'undefined');
    const blocksToEdit          = blocks.filter(b => typeof b.id !== 'undefined');
    const blockIDsToPreserve    = blocksToEdit.map(b => b.id);

    return new Promise((resolve, reject) => {
        let sql = 'UPDATE pages SET title = ?, publicationDate = ?, author = ? WHERE id = ? ';
        const params = [
            page.title,
            page.publicationDate || null,
            author,
            page.id
        ];

        /* If the user is not an admin, check that the logged user is the author */
        if(!user.admin) {
            sql += 'AND author = ?'
            params.push(user.id);
        }
        
        db.run(sql, params, function(err) {
            if(err) {
                reject(err);
                return;
            }

            let changes = this.changes;
            if(!changes) {
                resolve({ changes });
                return;
            }

            /* DELETE (preserve) -> ADD/EDIT blocks */
            preserveBlocks(blockIDsToPreserve, page.id)
                .then(pr_changes => {
                    changes += pr_changes;
                    return Promise.all([
                        ...blocksToAdd.map(b => addBlockToPage(b, page.id, b.order)),
                        ...blocksToEdit.map(b => editPageBlock(b, page.id))
                    ])
                })
                .then(results => {
                    /**
                     * Promise.all's results are in the same order as the promises passed as a parameter.
                     * This means that the first `blocksToAdd.length` results are the newly added blocks' IDs.
                     */
                    const newBlockIDs = results.slice(0, blocksToAdd.length);

                    changes += blocksToAdd.length + blocksToEdit.length;
                    resolve({ changes, blocks: newBlockIDs });
                })
        })
    })
}

/**
 * Deletes a page given its ID. Also takes user permissions into account.
 * @param {number} page_id      - The ID of the page to delete
 * @param {User} user           - User that is currently logged in
 * @returns {Promise<number>}   - Promise that resolves with the number of deleted rows (blocks + page)
 */
exports.deletePage = (page_id, user) => {
    return new Promise((resolve, reject) => {
        let sql = 'DELETE FROM pages WHERE id = ?';
        let params = [page_id];

        /* If the user is not an admin, check that the logged user is the author */
        if(!user.admin) {
            sql += ' AND author = ?';
            params.push(user.id);
        }

        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
                return;
            }
            
            /* Delete blocks only if page was deleted */
            const pageDeleted = this.changes;
            if(pageDeleted)
                deletePageBlocks(page_id)
                    .then(block_changes => resolve(pageDeleted + block_changes));
            else
                resolve(pageDeleted);
        });
    });
}

/**
 * Retrieves the website's name
 * @returns {Promise<string>} - Promise that resolves the current website's name
 */
exports.getWebsiteName = () => {
    return new Promise((resolve, reject) => {
        /* Add page */
        const sql = 'SELECT name FROM website';
        db.get(sql, [], function (err, row) {
            if (err) {
                reject(err);
                return;
            }
            resolve(row.name);
        });
    });
}

/**
 * Change the website's name.
 * @param {string} name     - New name for the website
 * @returns {Promise<void>} - Promise that resolves if operation is successful
 */
exports.changeWebsiteName = (name) => {
    return new Promise((resolve, reject) => {
        /* Add page */
        const sql = 'UPDATE website SET name = ?';
        db.run(sql, [name], function (err) {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}