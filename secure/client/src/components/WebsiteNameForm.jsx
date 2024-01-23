import React, { useState } from 'react'

import { changeWebsiteName } from '../lib/api'

import { ReactComponent as CheckIcon  } from '../assets/check.svg'
import { ReactComponent as CrossIcon  } from '../assets/cross.svg'
import { ReactComponent as CMSIcon  } from '../assets/cms-icon.svg'

import { Form, Button, InputGroup, Placeholder } from 'react-bootstrap'

/**
 * 
 * @param {object} props
 * @param {string} props.name
 * @param {() => void} props.onCancel
 * @param {(new_name: string) => (void | Promise<void>) } props.onNameChange
 * @returns 
 */
export default function WebsiteNameForm({ name: nameInit, onCancel, onNameChange }) {
    const [ name, setName ]                 = useState(nameInit);

    const [ submitError, setSubmitError ]   = useState('');
    const [ loading, setLoading ]           = useState(false);

    /**
     * @type {React.FormEventHandler}
     */
    const handleSubmit = (e) => {
        e.preventDefault();

        setLoading(true);
        changeWebsiteName(name)
            .then(() => onNameChange(name))
            .catch(() => {
                setSubmitError('Cannot change name!')
                setTimeout(() => setSubmitError(''), 1000);
            })
            .finally(() => setLoading(false));
    }

    if(submitError)
        return <span className="text-danger">{ submitError }</span>
    
    if(loading)
        return (
            <>
            <CMSIcon className="me-2 mb-1" />
            <Placeholder animation="glow">
                <Placeholder style={{ width: 100 }} />
            </Placeholder>
            </>
        )

    const validName = name.length > 0 && name !== nameInit;

    return (
        <Form onSubmit={handleSubmit}>
            <InputGroup>
                <Form.Control
                    type='text'
                    value={name}
                    onChange={ev => setName(ev.target.value)}
                    className="d-inline-block"
                    autoFocus
                />
                <Button type="submit" variant="success" disabled={!validName}>
                    <CheckIcon />
                </Button>
                <Button variant="danger" onClick={() => onCancel()}>
                    <CrossIcon />
                </Button>
            </InputGroup>
        </Form>
    )
}
