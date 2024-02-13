import React, { createContext, useEffect, useState } from "react";
import '../../../typedefs';
import { getLoggedUser } from "../lib/api";
import { getUserStorage, setUserStorage } from "../lib/user-storage";

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
     * The user info doesn't have to be fetched from the API the next visit so this is faster and better, right?
     * @param {User} user 
     */
    function setUser(user) {
        _setUser(user);
        setUserStorage(user);
    }

    useEffect(() => {
        const updateUserFromStorage = () => _setUser(getUserStorage());
        addEventListener("storage", updateUserFromStorage);
        return () => removeEventListener("storage", updateUserFromStorage);
    }, []);

    useEffect(() => {
        const userStorage = getUserStorage();
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