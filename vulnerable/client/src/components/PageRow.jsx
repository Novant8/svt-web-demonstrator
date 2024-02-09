import React, { useContext } from 'react';
import { TODAY, longDate } from '../lib/date';
import '../../../typedefs';

import { ReactComponent as RightArrow } from '../assets/arrow-right.svg'

import { UserContext } from '../context/UserContext';

import ManagementButtons from './ManagementButtons';
import { Badge, Button, Placeholder, PlaceholderButton } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

/**
 * 
 * @param {object} props
 * @param {Page} props.page
 * @param {(id: number) => (void | Promise<void>)} props.onPageDelete
 * @returns 
 */
export default function PageRow({ page, onPageDelete }) {

    const { user }          = useContext(UserContext);
    const showMgmtButtons   = user.admin || user.id === page.author.id;

    const location = useLocation();

    return (
        <tr>
            <td>{ page.title }</td>
            <td>{ page.author.name }</td>
            <td>{ longDate(page.creationDate) }</td>
            <td>
                {
                    page.publicationDate ? (
                        page.publicationDate <= TODAY() ?
                            <Badge bg="success">Published</Badge>
                        :
                            <Badge bg="primary">Scheduled</Badge>
                    )
                    :
                        <Badge bg="secondary">Draft</Badge>
                }
            </td>
            <td>{ page.publicationDate && longDate(page.publicationDate) }</td>
            <td className="text-lg-end">
                {
                    showMgmtButtons &&
                        <ManagementButtons
                            pageId={page.id}
                            onDelete={onPageDelete}
                            className="d-inline-block"
                            delete-className="mx-xxl-2 ms-lg-2 mb-2 mb-xxl-0"
                            edit-className="mb-2 mb-xxl-0"
                        />
                }
                <Button
                    variant="outline-primary"
                    as={Link} to={`http://localhost:3001/api/pageclick?redirect=${encodeURIComponent(`http://localhost:5173/pages/${page.id}`)}`}
                    state={{ prevLocation: location }}
                >
                    Show <RightArrow className="mb-0" />
                </Button>
            </td>
        </tr>
    )
}

export function PageRowPlaceholder() {
    return (
        <tr>
            <Placeholder animation="glow" as="td">
                <Placeholder style={{ width: 100+Math.random()*200 }} />
            </Placeholder>
            <Placeholder animation="glow" as="td">
                <Placeholder style={{ width: 50+Math.random()*25 }} />
            </Placeholder>
            <Placeholder animation="glow" as="td">
                <Placeholder style={{ width: 100 }} />
            </Placeholder>
            <Placeholder animation="glow" as="td">
                <Placeholder style={{ width: 100 }} />
            </Placeholder>
            <Placeholder animation="glow" as="td">
                <Placeholder style={{ width: 100 }} />
            </Placeholder>
            <Placeholder animation="glow" as="td" className="text-end">
                <PlaceholderButton variant="warning" style={{ width: 75 }} />
                <PlaceholderButton variant="danger" style={{ width: 100 }} className="mx-2" />
                <PlaceholderButton variant="primary" style={{ width: 100 }} />
            </Placeholder>
        </tr>
    )
}