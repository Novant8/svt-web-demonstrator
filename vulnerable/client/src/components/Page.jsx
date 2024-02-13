import React, { useContext, useEffect, useState } from 'react'
import { TODAY, longDate } from '../lib/date'
import '../../../typedefs'

import { getPageDetails } from '../lib/api'

import { UserContext } from '../context/UserContext'

import { ReactComponent as CalendarIcon } from '../assets/calendar.svg'
import { ReactComponent as AddIcon } from '../assets/page-add.svg'
import { ReactComponent as AuthorIcon } from '../assets/person.svg'
import { ReactComponent as ArrowLeft } from '../assets/arrow-left.svg'
import { ReactComponent as DraftIcon } from '../assets/pencil-square.svg'

import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, Col, Placeholder, Row } from 'react-bootstrap'
import ManagementButtons from './ManagementButtons'
import NotFound from './NotFound'

/**
 * 
 * @param {object} props
 * @param {Page} props.preview The page to preview, if any
 * @param {(id: number) => (void | Promise<void>)} props.onDelete
 */
export default function Page({ preview, onDelete }) {
    
    /* Resolve page from its ID. If it doesn't exist, show a 404 page */
    const { id } = useParams();
    const page_id = parseInt(id);

    const { user } = useContext(UserContext);

    const { state } = useLocation();
    const prevLocation = state?.prevLocation;

    /**
     * @type {'add' | 'edit' | 'delete' | undefined}
     */
    let success = state?.success;
    let success_verb = '';
    switch(success) {
        case 'edit':
            success_verb = "edited"
            break;
        case 'add':
            success_verb = "created"
            break;
        default:
            success = false;
    }

    const navigate = useNavigate();

    /**
     * If `null`, the page does not exist. If `undefined`, the page is still loading.
     * @type {[ PageWithBlocks | null | undefined, React.Dispatch<PageWithBlocks | null | undefined> ]}
     */
    const [ page, setPage ]                     = useState(preview);
    const [ pageRestricted, setPageRestricted ] = useState(false);
    const [ error, setError ]                   = useState('');

    const loading = typeof page === 'undefined';
    const notFound = page === null;

    /**
     * Calls `onDelete`, which may or may not be a promise.
     * This function handles this by trying to call `navigate` inside a `then` block if the function if a promise or, if it fails (`onDelete` returns `void`), it calls `navigate` directly without `then`.
     * @param {number} id - ID of the deleted page
     * @returns {void | Promise<void>}
     */
    const handlePageDelete = (id) => onDelete(id)?.then(() => navigate('/back', { state: { success: 'delete' } })) ?? navigate('/back', { state: { success: 'delete' } });

    useEffect(() => {
        if(preview)
            return;
        setPage();
        setError();
        getPageDetails(page_id)
            .then(page => {
                if(page) {
                    page = {
                        ...page,
                        blocks: page.blocks.map(block => {
                            if(block.type === 'image')
                                return { ...block, content: `http://localhost:3001/${block.content}` };
                            return block;
                        })
                    };
                    if(!page.publicationDate || page.publicationDate > TODAY())
                        setPageRestricted(true);
                    else
                        setPageRestricted(false);
                }
                setPage(page);
            })
            .catch(err => setError(err))
    }, [ user, page_id, preview ]);

    if(error)
        return <Alert variant="danger" className="text-center"><strong>Error:</strong> {error} <Alert.Link as={Link} to="/">Go back to the homepage</Alert.Link></Alert>;

    if(notFound) {
        if(pageRestricted) /* User may have logged out while viewing a restricted page */
            return <Navigate replace to="/front" />;
        return <NotFound />;
    }

    if(loading)
        return <PagePlaceholder />;

    const showMgmtButtons = !preview && user && (user.admin  || page.author.id === user.id);
    const showSuccessAlert = !preview && user && success;

    return (
        <>
        {
            showSuccessAlert &&
                <Alert variant="success"  className="text-center" dismissible>Page has been {success_verb} successfully!</Alert>
        }
        {
            !preview &&
                <Button variant="outline-primary" as={Link} to={ prevLocation || '/front' } className="my-3"><ArrowLeft /> Back</Button>
        }
        {
            showMgmtButtons &&
                <ManagementButtons className="d-inline-block" edit-className="mx-2" pageId={page.id} onDelete={handlePageDelete} />
        }
        <h1 className="display-4">{ page.title }</h1>
        <Row className="text-muted">
            <Col lg={2} md={3} xs={12}>
                <small>
                    <AuthorIcon className="mb-1" /> {page.author.name} { !!page.author.admin && <Badge pill bg="danger">Admin</Badge> }
                </small>    
            </Col>
            <Col lg={3} md={4} xs={6}>
                <small>
                    <AddIcon className="mb-1" /> Created on {longDate(page.creationDate)}
                </small>
            </Col>
            <Col lg={3} md={4} xs={6}>
                <small>
                    {
                        page.publicationDate ?
                            <>
                            <CalendarIcon className="mb-1" />&nbsp;
                            { page.publicationDate > TODAY() ? "Scheduled" : "Published" } on {longDate(page.publicationDate)}
                            </>
                        :
                            <>
                            <DraftIcon className="mb-1" /> Draft
                            </>
                    }
                </small>
            </Col>
        </Row>
        <hr/>
        {
            page.blocks.map(({ id, content, type }, i) => {
                switch(type) {
                    case "header":
                        return <HeaderBlock key={`block-${id || i}`} content={content} />;
                    case "paragraph":
                        return <ParagraphBlock key={`block-${id || i}`} content={content} />;
                    case "image":
                        return <ImageBlock key={`block-${id || i}`} url={content} />;
                    default:
                        return <p key={`block-${id || i}`} className='text-danger'>Invalid block type!</p>;    
                }
            })
        }
        </>
    )
}

function HeaderBlock({ content }) {
    return <h2>{content}</h2>
}

function ParagraphBlock({ content }) {
    return <div className="paragraph-block" dangerouslySetInnerHTML={{ __html: content }} />
}

function ImageBlock({ url }) {
    return (
        <Row className="justify-content-center my-3">
            <Col xl={8} lg={9}>
                <Card>
                    <Card.Img className="img-fluid" src={url} />
                </Card>
            </Col>
        </Row>
    )
}

function PagePlaceholder() {

    /**
     * Generates `n` placeholders of random length
     * @param {number} n 
     */
    function genPlaceholders(n) {
        let placeholders = [];
        for(let i=0; i<n; i++) {
            const len = Math.floor(Math.random()*3)+2;
            placeholders.push(<Placeholder key={i} xs={len} className="mx-1" />)
        }
        return placeholders;
    }

    return (
        <>
        <Placeholder animation="glow">
            <Placeholder.Button xs={1} className="my-3" />
        </Placeholder>
        <Placeholder as="h1" className="display-4" animation="glow">
            <Placeholder xs={7+Math.floor(Math.random()*5)} />
        </Placeholder>
        <Row className="text-muted">
            <Col lg={2} md={3} xs={12}>
                <small>
                    <AuthorIcon />&nbsp;
                    <Placeholder animation="glow">
                        <Placeholder xs={3} />
                    </Placeholder>
                </small>
            </Col>
            <Col lg={3} md={4} xs={6}>
                <small>
                    <AddIcon />&nbsp;
                    <Placeholder animation="glow">
                        <Placeholder xs={6} />
                    </Placeholder>
                </small>
            </Col>
            <Col lg={3} md={4} xs={6}>
                <small>
                    <CalendarIcon />&nbsp;
                    <Placeholder animation="glow">
                        <Placeholder xs={7} />
                    </Placeholder>
                </small>
            </Col>
        </Row>
        <hr />
        <Placeholder as="h2" animation="glow">
            <Placeholder xs={3} />
        </Placeholder>
        <Placeholder as="p" animation="glow">
            { genPlaceholders(10) }
        </Placeholder>
        </>
    )
}