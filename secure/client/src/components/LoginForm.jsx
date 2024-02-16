import React, { useContext, useState } from 'react';
import validator from "validator";

import { login } from "../lib/api";

import { UserContext } from "../context/UserContext";

import { Form, Button, Alert, Container, Row, Col, Spinner } from 'react-bootstrap';
import { Link, Navigate, useLocation } from 'react-router-dom';

/**
 * 
 * @param {object} props
 * @param {(user: User) => (void | Promise<void>)} props.onLogin
 */
export default function LoginForm({ onLogin }) {
    /* Username state */
    const [ username, _setUsername ]            = useState('mario@example.org');
    const [ usernameError, setUsernameError ]   = useState('');
    const setUsername = (username) => {
        _setUsername(username);
        setUsernameError('');
    }

    /* Passsword state */
    const [ password, _setPassword ]            = useState('password!');
    const [ passwordError, setPasswordError ]   = useState('');
    const setPassword = (password) => {
        _setPassword(password);
        setPasswordError('');
    }
    
    /* Submit states */
    const [ loading, setLoading ]               = useState(false);
    const [ error, setError ]                   = useState('');

    const { user, setUser } = useContext(UserContext);

    const { state } = useLocation();
    const prevLocation = state?.prevLocation;

    const doLogIn = (credentials) => {
        setLoading(true);
        login(credentials)
            .then(user => onLogin(user)?.then(() => user) ?? user)
            .then(user => {
                
                setError('');
                setUser(user);
            })
            .catch(err => setError(err))
            .finally(() => setLoading(false))
    }

    /**
     * @returns {boolean}
     */
    const validate = () => {
        let valid = true;

        if(!username) {
            setUsernameError("Please insert a username.");
            valid = false;
        } else if(!validator.isEmail(username)) {
            setUsernameError("Username is not a valid e-mail.");
            valid = false;
        }

        if(password.length === 0) {
            setPasswordError("Please insert a password.");
            valid = false;
        }

        return valid;
    }
    
    const handleSubmit = (event) => {
        event.preventDefault();
        setError('');
        const credentials = { username, password };
        
        if(validate())
            doLogIn(credentials);
    };

    if(user) {
        /**
         * Redirect user to /back if the previous page is /front or if the access was direct (no previous page).
         * Otherwise, redirect to the previous page.
         */
        return <Navigate replace to={prevLocation && prevLocation.pathname !== '/front' ? prevLocation : '/back'} />
    }

    return (
        <Container>
            <Row className="justify-content-center">
                <Col xs={6}>
                    <h2>Login</h2>
                    <Form onSubmit={handleSubmit} className="mb-3">
                        <Form.Group controlId='username' className="my-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type='email'
                                value={username}
                                isInvalid={!!usernameError}
                                onChange={ev => setUsername(ev.target.value)}
                                disabled={loading}
                                autoFocus
                            />
                            <Form.Control.Feedback type="invalid">{usernameError}</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group controlId='password' className="my-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type='password'
                                value={password}
                                isInvalid={!!passwordError}
                                onChange={ev => setPassword(ev.target.value)}
                                disabled={loading}
                            />
                            <Form.Control.Feedback type="invalid">{passwordError}</Form.Control.Feedback>
                        </Form.Group>
                        <Button type='submit' disabled={loading}>Login</Button>
                        <Button className={[ 'mx-2', loading ? 'disabled' : '' ].join(' ')} variant='danger' as={Link} to={prevLocation || "/front"} disabled={loading}>Cancel</Button>
                    </Form>
                    {
                        loading ? <div className="text-center"><Spinner className="text-center" variant="primary" /></div> :
                        error && <Alert variant='danger' className="text-center"><strong>Error:</strong> {error}</Alert>
                    }
                </Col>
            </Row>
        </Container>
    )
}