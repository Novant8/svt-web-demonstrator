/**
 * Retrieved logged user info from the local storage, if present.
 * @returns {User | null} The user read from the storage, or `null` if the storage has no user info stored.
 */
export function getUserStorage() {
    const user = {
        id: parseInt(localStorage.getItem("userID")),
        username: localStorage.getItem("username"),
        name: localStorage.getItem("name"),
        admin: parseInt(localStorage.getItem("admin"))
    }
    const valid = !isNaN(user.id) && user.username !== null && user.name !== null && !isNaN(user.admin);
    return valid ? user : null;
}

/**
 * Updates the local storage with the given user information.
 * @param {User} user - The user's information
 */
export function setUserStorage(user) {
    if(!user)    
        return clearUserStorage();
    localStorage.setItem("userID", user.id);
    localStorage.setItem("username", user.username);
    localStorage.setItem("name", user.name);
    localStorage.setItem("admin", user.admin ? 1 : 0);
    dispatchEvent(new Event("storage"));
}

/**
 * Clears the local storage of the user's information.
 */
export function clearUserStorage() {
    [ "userID", "username", "name", "admin" ]
        .forEach(item => localStorage.removeItem(item));
    dispatchEvent(new Event("storage"));
}
