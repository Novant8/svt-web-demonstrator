import React, { createContext, useEffect, useState } from "react";
import '../../../typedefs';
import { getLoggedUser } from "../lib/api";

/**
 * @typedef UserContextValues
 * @type {object}
 * @property {User} [user]                  - Currently logged in user. If `null`, user is not logged in. If `undefined`, user is not yet loaded.
 * @property {React.Dispatch<User>} setUser - React dispatch function to update user.
 * @property {boolean} loadingUser          - If `true`, user is still being fetched by the API.
 */

/**
 * @type {React.Context<UserContextValues>}
 */
export const UserContext = createContext({ });

export function UserProvider({ children }) {
    /**
     * @type {[ User | undefined, React.Dispatch<User | undefined> ]}
     */
    const [ user, _setUser ]            = useState();
    const [ userError, setUserError ]   = useState('');
    const loadingUser                   = typeof user === 'undefined';

    /**
     * Updates the current user and sets its value in the local storage accordingly.
     * The user info doesn't have to be fetched from the API the next time the website is visited so this is faster and better, right?
     * @param {User} user 
     */
    function setUser(user) {
        localStorage.setItem("userID", user.id);
        localStorage.setItem("username", user.username);
        localStorage.setItem("name", user.name);
        localStorage.setItem("admin", user.admin);
        _setUser(user);
    }

    /**
     * Retrieves the user from the local storage, if available.
     * @returns {User | null} The user if it has been found in the local storage, `null` otherwise.
     */
    function getUserFromLocalStorage() {
        try {
            const id = localStorage.getItem("userID");
            const username = localStorage.getItem("username");
            const name = localStorage.getItem("name");
            const admin = localStorage.getItem("admin");
            return id && { id, username, name, admin };
        } catch(e) {
            return null;
        }
    }

    useEffect(() => {
        const userStorage = getUserFromLocalStorage();
        if(userStorage) {
            _setUser(userStorage);
            return;
        }
        getLoggedUser()
            .then(user => setUser(user))
            .catch(err => setUserError(err));
    }, [])

    return (
        <UserContext.Provider value={{ user, loadingUser, userError, setUser }}>
            { children }
        </UserContext.Provider>
    )
}