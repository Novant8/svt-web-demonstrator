"use strict";

import '../../../typedefs';

const HOST = "http://localhost:3001";

/**
 * Determines error message to display depending on a response that has a non-OK response
 * @param {Response} res        - The response
 * @returns {Promise<string>}   - Error message to display
 * @throws {Error}              - If the response is an OK status code, or if any error occurrs during the parsing.
 */
async function getErrorMessageFromResponse(res) {
    if(res.ok)
        throw new Error("Response is OK!");

    if(res.status === 422)
        return "The request had an invalid body.";
    
    try {
        const { error } = await res.json();
        return error;
    } catch(err) {
        /* SyntaxError is thrown when the response body is not JSON. In that case, ignore. */
        if(!err instanceof SyntaxError)
            throw err;
    }

    /* Return generic error message */
    return "Server responded with error.";
}

/**
 * Wrapper around `fetch`, which includes custom error handling.
 * @param {RequestInfo | URL} input 
 * @param {RequestInit | undefined} init 
 * @returns {Promise<Response>}
 * @throws {string} Generic message on fail
 */
async function myFetch(input, init) {
    try {
        return await fetch(input, init);
    } catch(err) {
        throw "Cannot connect to server.";
    }
}

/**
 * Get the website's name from the server side.
 * @returns {Promise<string>}   - Promise that resolves with the website's name
 * @throws {string}             - Message describing any error that occurred.
 */
export async function getWebsiteName() {
    const res = await myFetch(`${HOST}/api/website/name`, { method: "GET" });

    if(!res.ok)
        throw getErrorMessageFromResponse(res);
        
    const { name } = await res.json();
    return name;
}

/**
 * Login to the API
 * @param {Credentials} credentials - Username and password of user
 * @returns {Promise<User>}         - Promise that resolves with the user info
 * @throws {string}                 - Message describing any error that occurred.
 */
export async function login(credentials) {
    const res = await myFetch(`${HOST}/api/sessions`, {
        method: "POST",
        credentials: 'include',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
    });

    if(res.ok) {
        const user = await res.json();
        return user;
    } else {
        throw await getErrorMessageFromResponse(res);
    }
}

/**
 * Logs out using the API
 * @returns {Promise<void>} - Promise that resolves if the operation is successful
 * @throws {string}         - Message describing any error that occurred.
 */
export async function logout() {
    const res = await myFetch(`${HOST}/api/sessions/current`, {
        method: "DELETE",
        credentials: 'include'
    })

    if(!res.ok)
        throw await getErrorMessageFromResponse(res);
}

/**
 * Retrieves currently logged in user, if a session cookie is set.
 * @returns {Promise<User>} - Promise that resolves with the user, or `null` if the user is a guest (not logged).
 * @throws {string}         - Message describing any error that occurred.
 */
export async function getLoggedUser() {
    const res = await myFetch(`${HOST}/api/sessions/current`, {
        method: "GET",
        credentials: "include"
    });

    if(res.ok) {
        return await res.json();
    } else if(res.status === 401) {
        return null;
    } else {
        throw await getErrorMessageFromResponse(res);
    }
}

/**
 * Retrieves limited information about all pages from the server.
 * These pages are either public or visible only by the user.
 * @returns {Promise<Page[]>} - Promise that resolves with an array of pages visible by the user, with their blocks.
 * @throws {string}                     - Message describing any error that occurred.
 */
export async function getPages() {
    const res = await myFetch(`${HOST}/api/pages`, {
        method: "GET",
        credentials: 'include'
    });

    if(res.ok)
        return await res.json();
    else
        throw await getErrorMessageFromResponse(res);
}

/**
 * Retrieves a single page's full information from the database (page + blocks)
 * @param {number} id                   - ID of the page
 * @returns {Promise<PageWithBlocks>}   - Promise that resolves with the page's data, including its blocks.
 *                                        If the page is not found (or the user does not have permissions), `null` is returned
 * @throws {string}                     - Message describing any error that occurred.
 */
export async function getPageDetails(id) {
    const res = await myFetch(`${HOST}/api/pages/${id}`, {
        method: "GET",
        credentials: 'include'
    });
    
    if(res.ok) {
        return await res.json();
    } else if(res.status === 404) {
        return null;
    } else {
        throw await getErrorMessageFromResponse(res);
    }
}

/**
 * @typedef {AddPageResponse}
 * @type {object}
 * @property {number} id         - ID of the new page
 * @property {number[]} blocks   - IDs of all the blocks of the page
 */

/**
 * Adds a page, with its relative blocks, to the database
 * @param {PageWithBlocks} page         - The page
 * @returns {Promise<AddPageResponse>}  - Promise that resolves if the page has been successfully added. 
 * @throws {Error}                      - Message describing any error that occurred.
 */
export async function addPage(page) {
    const res = await myFetch(`${HOST}/api/pages`, {
        method: "POST",
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(page)
    });

    if(!res.ok)
        throw await getErrorMessageFromResponse(res);
    
    return await res.json();
}

/**
 * @typedef {EditPageResponse}
 * @type {object}
 * @property {number} id         - ID of the new page
 * @property {number[]} blocks   - IDs of all the blocks of the page
 */

/**
 * Updates an existing page's information.
 * @param {number} pageId               - ID of the page to edit
 * @param {Page} page                   - The page, with updated information
 * @returns {Promise<EditPageResponse>} - Promise that resolves if the page has successfully been modified
 * @throws {string}                     - Message describing any error that occurred.
 */
export async function editPage(pageId, page) {
    const res = await myFetch(`${HOST}/api/pages/${pageId}`, {
        method: "PUT",
        credentials: 'include',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(page)
    });

    if(!res.ok)
        throw await getErrorMessageFromResponse(res);
    
    return await res.json();
}

/**
 * Deletes an existing page.
 * @param {number} pageId   - ID of the page to delete
 * @returns {Promise<void>} - Promise that resolves if the page has successfully been deleted
 * @throws {string}         - Message describing any error that occurred.
 */
export async function deletePage(pageId) {
    const res = await myFetch(`${HOST}/api/pages/${pageId}`, {
        method: "DELETE",
        credentials: 'include'
    });
    
    if(!res.ok)
        throw await getErrorMessageFromResponse(res);
}

/**
 * Lists users' information (id, name, admin)
 * @returns {User[]}
 * @throws {string}     - Message describing any error that occurred.
 */
export async function listUsers() {
    const res = await myFetch(`${HOST}/api/users`, {
        method: "GET",
        credentials: 'include'
    });

    if(res.ok)
        return await res.json();
    else
        throw await getErrorMessageFromResponse(res);
}

/**
 * Changes the website's name
 * @param {string} newName  - The new name
 * @returns {Promise<void>} - Promise that resolves if the name has successfully been changed
 * @throws {string}         - Message describing any error that occurred.
 */
export async function changeWebsiteName(name) {
    const res = await myFetch(`${HOST}/api/website/name`, {
        method: "PUT",
        credentials: 'include',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
    });
    
    if(!res.ok)
        throw await getErrorMessageFromResponse(res);
}

/**
 * Retrieves all images' information from the server.
 * @returns {Promise<Image[]>}  - Promise that resolves with images' information
 * @throws {string}             - Message describing any error that occurred.
 */
export async function listImages() {
    const res = await myFetch(`${HOST}/api/images`, {
        method: "GET",
        credentials: 'include'
    });

    if(res.ok)
        return await res.json();
    else
        throw await getErrorMessageFromResponse(res);
}