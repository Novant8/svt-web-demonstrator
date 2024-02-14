"use strict";

import "../../../typedefs";
import axios from "axios";

const HOST = "https://localhost:8081";

/**
 * Determines error message to display depending on a response that has a non-OK response
 * @param {Response} res        - The response
 * @returns {Promise<string>}   - Error message to display
 * @throws {Error}              - If the response is an OK status code, or if any error occurrs during the parsing.
 */
async function getErrorMessageFromResponse(res) {
  if (res.statusText === "OK") throw new Error("Response is OK!");

  try {
    let { error, errors } = await res.json();
    if (typeof errors !== "undefined" && res.status === 422)
      error = "The request had an invalid body.";
    return error;
  } catch (err) {
    /* SyntaxError is thrown when the response body is not JSON. In that case, ignore. */
    if (!err instanceof SyntaxError) throw err;
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
  } catch (err) {
    throw "Cannot connect to server.";
  }
}

/* async function myAxios(url, config) {
    try {
        const response = await Axios(url, config);
        return response.data;
    } catch (error) {
        throw "Cannot connect to server.";
    }
}
 */
/**
 * Get the website's name from the server side.
 * @returns {Promise<string>}   - Promise that resolves with the website's name
 * @throws {string}             - Message describing any error that occurred.
 */
export async function getWebsiteName() {
  try {
    const response = await axios.get(`${HOST}/api/website/name`);
    if (response.statusText !== "OK")
      throw await getErrorMessageFromResponse(response);
    return response.data.name;
  } catch (error) {
    throw "Cannot connect to server.";
  }
}
/**
 * Login to the API
 * @param {Credentials} credentials - Username and password of user
 * @returns {Promise<User>}         - Promise that resolves with the user info
 * @throws {string}                 - Message describing any error that occurred.
 */
export async function login(credentials) {
  try {
    const response = await axios.post(`${HOST}/api/sessions`, credentials, {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.statusText !== "OK")
      throw await getErrorMessageFromResponse(response);
    return response.data;
  } catch (error) {
    throw "Cannot connect to server.";
  }
}

/**
 * Register to the API
 * @param {Credentials} credentials - Username and password of user
 * @returns {Promise<User>}         - Promise that resolves with the user info
 * @throws {string}                 - Message describing any error that occurred.
 */
export async function register(credentials) {
  try {
    const response = await axios.post(`${HOST}/api/register`, credentials, {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.statusText !== "OK")
      throw await getErrorMessageFromResponse(response);
    return response.data;
  } catch (error) {
    throw "Cannot connect to server.";
  }
}

/**
 * Logs out using the API
 * @returns {Promise<void>} - Promise that resolves if the operation is successful
 * @throws {string}         - Message describing any error that occurred.
 */
export async function logout() {
  try {
    const response = await axios.delete(`${HOST}/api/sessions/current`, {
      withCredentials: true,
    });

    if (response.statusText !== "No Content")
      throw await getErrorMessageFromResponse(response);
  } catch (error) {
    throw "Cannot connect to server.";
  }
}

/**
 * Retrieves currently logged in user, if a session cookie is set.
 * @returns {Promise<User>} - Promise that resolves with the user, or `null` if the user is a guest (not logged).
 * @throws {string}         - Message describing any error that occurred.
 */
export async function getLoggedUser() {
  try {
    const response = await axios.get(`${HOST}/api/sessions/current`, {
      withCredentials: true,
    });

    if (response.statusText === "OK") {
      return response.data;
    } else {
      throw await getErrorMessageFromResponse(response);
    }
  } catch (error) {
    /* console.log("API ERROR ", error)
        throw "Cannot connect to server."; */
    return null;
  }
}

/**
 * Retrieves limited information about all pages from the server.
 * These pages are either public or visible only by the user.
 * @param {string} search       - The search query. Only pages with the title containing this query will be returned.
 * @returns {Promise<Page[]>}   - Promise that resolves with an array of pages visible by the user, with their blocks.
 * @throws {string}                     - Message describing any error that occurred.
 */

export async function getPages(search = "") {
  try {
    const response = await axios.get(
      `${HOST}/api/pages?search=${encodeURIComponent(search)}`,
      { withCredentials: true }
    );
    if (response.statusText !== "OK")
      throw await getErrorMessageFromResponse(response);
    return response.data;
  } catch (error) {
    throw "Cannot connect to server.";
  }
}
/**
 * Retrieves a single page's full information from the database (page + blocks)
 * @param {number} id                   - ID of the page
 * @returns {Promise<PageWithBlocks>}   - Promise that resolves with the page's data, including its blocks.
 *                                        If the page is not found (or the user does not have permissions), `null` is returned
 * @throws {string}                     - Message describing any error that occurred.
 */
export async function getPageDetails(id) {
  try {
    const response = await axios.get(`${HOST}/api/pages/${id}`, {
      withCredentials: true,
    });
    if (response.statusText !== "OK")
      throw await getErrorMessageFromResponse(response);
    return response.data;
  } catch {
    return null;
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
 * @param {string} page                 - The page, in XML format
 * @returns {Promise<AddPageResponse>}  - Promise that resolves if the page has been successfully added.
 * @throws {Error}                      - Message describing any error that occurred.
 */
export async function addPage(page) {
  const response = await axios.post(`${HOST}/api/pages`, page, {
    withCredentials: true,
    headers: {
      "Content-Type": "text/xml",
    },
  });

  if (response.status !== 201)
    throw await getErrorMessageFromResponse(response);
  return response.data;
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
 * @param {string} page                 - The page's XML, with updated information
 * @returns {Promise<EditPageResponse>} - Promise that resolves if the page has successfully been modified
 * @throws {string}                     - Message describing any error that occurred.
 */
export async function editPage(pageId, page) {
    try {
        const response = await axios.put(`${HOST}/api/pages/${pageId}`, page, {
            withCredentials: true,
            headers: {
                "Content-Type": "text/xml"
            }
        });
        if (response.statusText !== "OK")
            throw await getErrorMessageFromResponse(response);
        return response.data;
    } catch (error) {
        throw "Cannot connect to server.";
    }
}

/**
 * Deletes an existing page.
 * @param {number} pageId   - ID of the page to delete
 * @returns {Promise<void>} - Promise that resolves if the page has successfully been deleted
 * @throws {string}         - Message describing any error that occurred.
 */
export async function deletePage(pageId) {
    try {
        const response = await axios.delete(`${HOST}/api/pages/${pageId}`, { withCredentials: true });
        if (response.status !== 204)
            throw await getErrorMessageFromResponse(response);
    } catch (error) {
        throw "Cannot connect to server.";
    }
}


/**
 * Lists users' information (id, name, admin)
 * @returns {User[]}
 * @throws {string}     - Message describing any error that occurred.
 */
export async function listUsers() {
    try {
        const response = await axios.get(`${HOST}/api/users`, { withCredentials: true });
        if (response.statusText !== "OK")
            throw await getErrorMessageFromResponse(response);
        return response.data;
    } catch (error) {
        throw "Cannot connect to server.";
    }
}
/**
 * Changes the website's name
 * @param {string} newName  - The new name
 * @returns {Promise<void>} - Promise that resolves if the name has successfully been changed
 * @throws {string}         - Message describing any error that occurred.
 */
export async function changeWebsiteName(name) {
    try {
        const response = await axios.put(`${HOST}/api/website/name`, { name }, {
            withCredentials: true,
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (response.status !== 204)
            throw await getErrorMessageFromResponse(response);
    } catch (error) {
        throw "Cannot connect to server.";
    }
}

/**
 * Retrieves all images' information from the server.
 * @param {string} search       - Search query
 * @returns {Promise<string[]>} - Image filenames
 * @throws {string}             - Message describing any error that occurred.
 */
export async function searchImages(search) {
    try {
        const response = await axios.get(`${HOST}/api/images?search=${encodeURIComponent(search)}`, { withCredentials: true });
        if (response.statusText !== "OK")
            throw await getErrorMessageFromResponse(response);
        return response.data;
    } catch (error) {
        throw "Cannot connect to server.";
    }
}
