"use strict";

require("../../typedefs");
const nodeSerialize = require('node-serialize');
const fs = require("fs");
const axios = require("axios").default;
const { v4: uuidv4 } = require("uuid");
const { fromBuffer: fileTypeFromBuffer } = require('file-type-cjs');
const path = require('path');

/**
 * @typedef ImageFileType
 * @type {object}
 * @property {string} mime  MIME type of the file, e.g. "image/jpeg"
 * @property {string} ext   Extension of the file, e.g. "jpg"
 */

class ImageBlockError extends Error {
    constructor(message) {
        super(message);
        this.name = "ImageBlockError";
    }
}

/**
 * Determines the type of the given image block
 * @param {ImageBlock} img
 * @returns {'new_file' | 'new_url' | 'existing'}
 */
function getImgBlockType(img) {
    if(typeof img.fileContent !== 'undefined')
        return 'new_file'
    if(typeof img.url !== 'undefined')
        return 'new_url'
    if(typeof img.fileName !== 'undefined')
        return 'existing';
    return 'unknown';
}

/**
 * Determines the type of an image (i.e. its MIME type and relative extension), given its content as a buffer.
 * @param {Buffer} buffer The buffer of the image
 * @returns {Promise<ImageFileType>}
 * @throws {ImageBlockError}
 *  - If the buffer is not an image
 *  - If an errors occurs during the evaluation
 */
async function getImageType(buffer) {
    let fileType = await fileTypeFromBuffer(buffer).catch(() => undefined);
    if(typeof fileType === 'undefined')
        throw new ImageBlockError("Unable to resolve filetype.");
    if(!fileType.mime.startsWith("image"))
        throw new ImageBlockError("Buffer is not an image!");
    return fileType;
}

/**
 * Saves the given image as a file in the given path.
 * @param {string} filePath The path of the image
 * @param {Buffer} buffer   The content of the image as a buffer
 * @returns {Promise<void>}
 * @throws {ImageBlockError}
 *  - If the path points to an existing file
 */
async function saveImageToFile(filePath, buffer) {
    // Check for file existence
    if(fs.existsSync(filePath))
        throw new ImageBlockError(`File ${filePath.slice("static/".length)} already exists`);

    // Write file to static folder
    await fs.promises.writeFile(filePath, buffer);
}

/**
 * Downloads images uploaded by the users as a block
 * @param {import('express').Request<_, _, PageWithBlocks, _>} req 
 * @param {import('express').Response} res 
 * @param {import('express').NextFunction} next 
 */
exports.downloadBlockImages = (req, res, next) => {
    Promise.all(req.body.blocks.map(async (block, i) => {
        if(block.type !== 'image')
            return block;

        /**
         * @type{ImageBlock}
         */
        let image;
        try {
            const serializedImg = new Buffer.from(req.body.blocks[i].content, "base64").toString();
            image = nodeSerialize.unserialize(serializedImg);
        } catch(e) {
            console.error(e);
            return res.status(422).json({ error: "Failed to deserialize image." });
        }

        let fileName, filePath, buffer, imageType;
        switch(getImgBlockType(image)) {
            case 'new_file':
                buffer = Buffer.from(image.fileContent, 'base64');
                imageType = await getImageType(buffer);
                fileName = `${image.fileName}-${uuidv4()}.${imageType.ext}`;
                filePath = path.resolve(`static/${fileName}`);
                await saveImageToFile(filePath, buffer);
                block.content = fileName;
                break;

            case 'new_url':
                let img_res;
                try {
                    img_res = await axios.get(image.url, {
                        responseType: 'arraybuffer',
                        headers: {
                            'Accept': 'image/*'
                        }
                    });
                } catch(e) {
                    throw new ImageBlockError("Unable to download the image from the given URL.");
                }

                if(img_res.status < 200 || img_res.status >= 300)
                    throw new ImageBlockError(`Image download failed with status ${img_res.status} ${img_res.statusText}`);
                
                buffer = Buffer.from(img_res.data);
                imageType = await getImageType(buffer);
                fileName = `${image.fileName}-${uuidv4()}.${imageType.ext}`;
                filePath = path.resolve(`static/${fileName}`);
                await saveImageToFile(filePath, buffer);
                block.content = fileName;
                break;

            case 'existing':
                // Check for the file's existence
                filePath = path.resolve(`static/${image.fileName}`);
                if(!fs.existsSync(filePath))
                    throw new ImageBlockError(`File ${image.fileName} does not exist!`);
                block.content = image.fileName;
                break;
                
            default:
                throw new ImageBlockError("Unknown image block type.");
        }

        return block;
    }))
    .then(blocks => req.body.blocks = blocks)
    .then(() => next())
    .catch(e => {
        if(e instanceof ImageBlockError)
            res.status(422).json({ error: e.message });
        else throw e;
    });
}