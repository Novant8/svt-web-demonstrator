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
    const [ user, setUser ]             = useState();
    const [ userError, setUserError ]   = useState('');
    const loadingUser                   = typeof user === 'undefined';

    useEffect(() => {
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