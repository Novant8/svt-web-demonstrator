import React, { useContext, useEffect, useState } from 'react';
import '../../../typedefs';

import { UserContext } from '../context/UserContext';

import PageCard, { PageCardPlaceholder } from './PageCard';
import { Alert, Button, Col, Row, Form } from 'react-bootstrap';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import PageRow, { PageRowPlaceholder } from './PageRow';

/**
 * 
 * @param {object} props
 * @param {'front' | 'back'} props.office
 * @param {PageWithBlocks[]} props.pages
 * @param {boolean} props.loading
 * @param {string} props.error
 * @param {(query: string) => void} props.onSearch
 * @param {(id: number) => (void | Promise<void>)} props.onPageDelete
 * @returns 
 */
export default function PageList({ office, pages, loading, error, onSearch, onPageDelete }) {
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
            onSearch={onSearch}
            onPageDelete={onPageDelete}
        />
        </>
    )
}

function FrontPageListPlaceholder() {
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
}

/**
 * 
 * @param {object} props
 * @param {PageWithBLocks[]} props.pages
 * @param {boolean} props.loading
 * @param {string} props.error
 * @param {(query: string) => void} props.onSearch
 * @param {(id: number) => (void | Promise<void>)} props.onPageDelete
 * @returns 
 */
function FrontPageList({ pages, loading, error, onSearch, onPageDelete }) {
    const [ searchParams, setSearchParams ] = useSearchParams();
    const [ search, setSearch ] = useState(searchParams.get("search") ?? '');
    const [ debouncedSearch ] = useDebounce(search, 500);

    useEffect(() => {
        onSearch(debouncedSearch);
        setSearchParams(debouncedSearch  ? { search: debouncedSearch } : {});
    }, [ debouncedSearch ]);

    const noPagesFound = !pages?.length;
    return (
        <>  
            <Form.Control
                className="my-3"
                placeholder="Search..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            { debouncedSearch && <h3>Pages containing <span dangerouslySetInnerHTML={{ __html: debouncedSearch }} /></h3> }
            {
                error ? <Alert variant="danger" className="text-center my-1"><strong>Error:</strong> {error}</Alert> :
                loading ? <FrontPageListPlaceholder /> :
                noPagesFound ? <Alert variant="dark" className="text-center my-1">No pages found.</Alert> :
                <Row className="my-3 row-gap-4">
                    {
                        pages.map(page => (
                            <Col key={`page-card-${page.id}`} lg={3} md={4} sm={6}>
                                <PageCard page={page} />
                            </Col>
                        ))
                    }
                </Row>
            }
        </>
    );
}

/**
 * 
 * @param {object} props
 * @param {PageWithBLocks[]} props.pages
 * @param {boolean} props.loading
 * @param {string} props.error
 * @param {(query: string) => void} props.onSearch
 * @param {(id: number) => (void | Promise<void>)} props.onPageDelete
 * @returns 
 */
function BackPageList({ pages, loading, error, onSearch, onPageDelete }) {
    const [ searchParams, setSearchParams ] = useSearchParams();
    const [ search, setSearch ] = useState(searchParams.get("search") ?? '');
    const [ debouncedSearch ] = useDebounce(search, 500);

    useEffect(() => {
        onSearch(debouncedSearch);
        setSearchParams(debouncedSearch  ? { search: debouncedSearch } : {});
    }, [ debouncedSearch ]);

    const noPagesFound = !loading && pages.length === 0;
    return (
        <>
            <Form.Control
                className="my-3"
                placeholder="Search..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            { debouncedSearch && <h3>Pages containing <span dangerouslySetInnerHTML={{ __html: debouncedSearch }} /></h3> }
            {
                error ? <Alert variant="danger" className="text-center"><strong>Error:</strong> {error}</Alert> :
                noPagesFound ? <Alert variant="dark" className="text-center">No pages found.</Alert> :
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
            }
        </>
    )
}