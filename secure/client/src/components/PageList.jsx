import React, { useContext } from 'react';
import '../../../typedefs';

import { UserContext } from '../context/UserContext';

import PageCard, { PageCardPlaceholder } from './PageCard';
import { Alert, Button, Col, Row } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import PageRow, { PageRowPlaceholder } from './PageRow';

/**
 * 
 * @param {object} props
 * @param {'front' | 'back'} props.office
 * @param {PageWithBlocks[]} props.pages
 * @param {boolean} props.loading
 * @param {string} props.error
 * @param {(id: number) => (void | Promise<void>)} props.onPageDelete
 * @returns 
 */
export default function PageList({ office, pages, loading, error, onPageDelete }) {
    const { user } = useContext(UserContext);
    const isLoggedIn = !!user;

    const { state } = useLocation();
    
    /**
     * @type {'add' | 'edit' | 'delete' | undefined}
     */
    let success = state?.success;
    let success_verb = '';
    switch(success) {
        case 'delete':
            success_verb = "deleted"
            break;
        default:
            success = false;
    }

    const showNewButton = office === 'back' && user;

    const List = office === 'back' ? BackPageList : FrontPageList;

    return (
        <>  
        <h1 className="d-inline-block">Pages { isLoggedIn && `(${office}-office)` }</h1>
        { showNewButton && <Button variant="primary" as={Link} to="/pages/new" className="mx-2 mb-3"><small>New Page</small></Button> }
        {
            success &&
                <Alert variant="success" className="text-center" dismissible>Page has been {success_verb} successfully!</Alert>
        }
        <List
            pages={pages}
            loading={loading}
            error={error}
            onPageDelete={onPageDelete}
        />
        </>
    )
}

/**
 * 
 * @param {object} props
 * @param {PageWithBLocks[]} props.pages
 * @param {boolean} props.loading
 * @param {string} props.error
 * @param {(id: number) => (void | Promise<void>)} props.onPageDelete
 * @returns 
 */
function FrontPageList({ pages, loading, error, onPageDelete }) {
    if(error)
        return <Alert variant="danger" className="text-center my-1"><strong>Error:</strong> {error}</Alert>

    if(loading)
        return (
            <Row className="my-3">
                {
                    /* Show 4 placeholders in the same row */
                    Array.apply(null, Array(4)).map((_, i) => (
                        <Col key={`page-card-placeholder-${i}`} xl={3} lg={4} sm={6}>
                            <PageCardPlaceholder />
                        </Col>
                    ))
                }
            </Row>
        )

    if(pages.length === 0)
        return <Alert variant="dark" className="text-center my-1">There are no published pages at the moment.</Alert>
    
    return (
        <Row className="my-3 row-gap-4">
            {
                pages.map(page => (
                    <Col key={`page-card-${page.id}`} lg={3} md={4} sm={6}>
                        <PageCard page={page} />
                    </Col>
                ))
            }
        </Row>
    )
}

/**
 * 
 * @param {object} props
 * @param {PageWithBLocks[]} props.pages
 * @param {boolean} props.loading
 * @param {string} props.error
 * @param {(id: number) => (void | Promise<void>)} props.onPageDelete
 * @returns 
 */
function BackPageList({ pages, loading, error, onPageDelete }) {
    if(error)
        return <Alert variant="danger" className="text-center"><strong>Error:</strong> {error}</Alert>

    if(!loading && pages.length === 0)
        return <Alert variant="dark" className="text-center">There are no pages to show.</Alert>

    return (
        <table className="table my-3 align-middle">
            <tbody>
                <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Creation date</th>
                    <th>Status</th>
                    <th>Publication date</th>
                    <th className="text-center">Actions</th>
                </tr>
                {
                    loading ?
                        Array.apply(null, Array(4)).map((_, i) => <PageRowPlaceholder key={`page-row-placeholder-${i}`} />)
                    :
                        pages.map(page => <PageRow key={`page-row-${page.id}`} page={page} onPageDelete={onPageDelete} />)
                }
            </tbody>
        </table>
    )
}