/**
 * @typedef User
 * @type {object}
 * @property {number} id
 * @property {string} username
 * @property {string} name
 * @property {number} admin
 */

/**
 * @typedef Page
 * @type {object}
 * @property {number} id
 * @property {string} title
 * @property {User} author Author user object
 * @property {string} creationDate YYYY-MM-DD format
 * @property {string} [publicationDate] YYYY-MM-DD format
 */

/**
 * @typedef Block
 * @type {object}
 * @property {number} id
 * @property {'header' | 'paragraph' | 'image'} type
 * @property {string} content
 */

/**
 * @typedef BlocksOfPage
 * @type {object}
 * @property {Block[]} blocks
 */

/**
 * @typedef { Page & BlocksOfPage } PageWithBlocks
 */

/**
 * @typedef Credentials
 * @type {object}
 * @property username
 * @property password
 */

/**
 * @typedef {User} Express.User
 */

/**
 * @typedef Image
 * @type {object}
 * @property {string} filename
 * @property {string} name
 */

/**
 * @typedef UrlImageBlock
 * @type {object}
 * @property {string} fileName
 * @property {string} url
 */

/**
 * @typedef FileImageBlock
 * @type {object}
 * @property {string} fileName
 * @property {string} fileContent Encoded in base64
 */

/**
 * @typedef ExistingImageBlock
 * @type {object}
 * @property {string} fileName
 */

/**
 * @typedef ImageBlock
 * @type {UrlImageBlock | FileImageBlock | ExistingImageBlock}
 */