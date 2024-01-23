import React, { useContext, useState } from 'react'

import { logout } from '../lib/api';

import { ReactComponent as CMSIcon  } from '../assets/cms-icon.svg';
import { ReactComponent as EditIcon  } from '../assets/pencil-square.svg';
import { ReactComponent as LoginIcon  } from '../assets/person.svg';

import { Navbar as BSNavbar, Badge, Button, Container, Nav, Placeholder, PlaceholderButton, Spinner } from 'react-bootstrap';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import WebsiteNameForm from './WebsiteNameForm';

/**
 * @param {object} props
 * @param {string} websiteName
 * @param {string} nameError
 * @param {boolean} nameLoading 
 * @param {() => (void | Promise<void>)} props.onLogout
 * @param {(name: string) => (void | Promise<void>)} props.onNameChange
 */
export default function Navbar({ websiteName, nameError, nameLoading, onLogout, onNameChange }) {
    const [ logoutLoading, setLogoutLoading ] = useState(false);
    const [ logoutError, setLogoutError ]     = useState('');

    const [ showNameForm, setShowNameForm ]   = useState(false);

    const { user, loadingUser, userError, setUser } = useContext(UserContext);
    const isLogged  = !!user
    const isAdmin   = !!user?.admin;

    const location = useLocation();

    function handleLogout(e) {
        e.preventDefault();
        setLogoutError('');
        setLogoutLoading(true);
        logout()
            .then(() => onLogout())
            .then(() => {
                setUser(null);
                setShowNameForm(false);
            })
            .catch(err => {
                console.error(err);
                setLogoutError("Cannot logout!");
                setTimeout(() => setLogoutError(''), 1000);
            })
            .finally(() => setLogoutLoading(false))
    }

    return (
        <>
        <BSNavbar bg="primary" variant="dark" expand="md">
            <Container>
                <BSNavbar.Brand>
                    {
                        showNameForm ?
                            <WebsiteNameForm
                                name={websiteName}
                                onNameChange={newName => { onNameChange(newName); setShowNameForm(false); }}
                                onCancel={() => setShowNameForm(false)}
                            />
                        :
                            <>
                                <Link to="/front" className="text-light text-decoration-none">
                                    <CMSIcon className="me-2 mb-1" />
                                    {
                                        nameError ? <span className="text-danger">{ nameError }</span> :
                                        nameLoading ? <WebsiteNamePlaceholder /> :
                                        websiteName
                                    }
                                </Link>
                                {
                                    isAdmin &&
                                        <Button variant="outline-light" className="mx-2 px-2 py-1 mb-1" onClick={() => setShowNameForm(true)}>
                                            <EditIcon className="mb-1" />
                                        </Button>
                                }
                            </>
                    }
                </BSNavbar.Brand>
                <BSNavbar.Toggle aria-controls="navbar-collapse" />
                <BSNavbar.Collapse id="navbar-collapse">
                    <Nav className="me-auto">
                    {
                        isLogged &&
                            <>
                            <Nav.Link as={NavLink} to="/front">Front-office</Nav.Link>
                            <Nav.Link as={NavLink} to="/back">Back-office</Nav.Link>
                            </>
                    }
                    </Nav>
                    {
                        userError ? <span className="text-danger">Cannot fetch user!</span> :
                        loadingUser ? <UserPlaceholder /> :
                        isLogged ?
                            <>
                                <span className="d-inline-block text-light me-2">
                                    Hello, {user.name}
                                    {
                                        isAdmin &&
                                            <Badge pill bg="danger" as="small" className="mx-1">Admin</Badge>
                                    }
                                    !
                                </span>
                                {
                                    logoutError ? <span className="text-danger">{ logoutError }</span> :
                                    <Button variant="danger" onClick={handleLogout} disabled={logoutLoading} className="my-2 my-md-0">
                                        {
                                            logoutLoading ?
                                                <><Spinner variant="light" size="sm" /> Logging out...</>
                                            :
                                                <>Logout</>
                                        }
                                    </Button>
                                }
                            </>
                        :
                            <Button variant="outline-light" as={Link} to="/login" state={{ prevLocation: location }}>
                                <LoginIcon className="mb-1" /> Login
                            </Button>
                    }
                </BSNavbar.Collapse>
            </Container>
        </BSNavbar>
        </>
    )
}

function WebsiteNamePlaceholder() {
    return (
        <Placeholder animation="glow">
            <Placeholder style={{ width: 100 }} />
        </Placeholder>
    )
}

function UserPlaceholder() {
    return (
        <>
        <Placeholder animation="glow" className="text-light">
            <Placeholder style={{ width: 40 }} />
            <Placeholder style={{ width: 50 }} className="mx-2" />
            <PlaceholderButton variant="danger" style={{ width: 80 }} className="mx-2" />
        </Placeholder>
        </>
    )
}