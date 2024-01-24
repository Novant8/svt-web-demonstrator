import React, { useContext, useEffect, useRef, useState } from 'react'
import { TODAY } from '../lib/date'
import '../../../typedefs'
import { parse as toXML } from 'js2xmlparser'

import { addPage, editPage, getPageDetails, listImages, listUsers } from '../lib/api'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { ReactComponent as ArrowUp } from '../assets/arrow-up.svg'
import { ReactComponent as ArrowDown } from '../assets/arrow-down.svg'
import { ReactComponent as DeleteIcon } from '../assets/cross.svg'
import { ReactComponent as ArrowLeft } from '../assets/arrow-left.svg'

import { UserContext } from '../context/UserContext'

import { Alert, Button, Card, Col, Dropdown, Form, Row, Spinner } from 'react-bootstrap'
import NotFound from './NotFound'

/**
 * 
 * @param {object} props
 * @param {(page: PageWithBlocks) => (void | Promise<void>)} props.onAdd
 * @param {(page: PageWithBlocks) => (void | Promise<void>)} props.onEdit
 */
export default function PageForm({ onAdd, onEdit }) {

    /*** HOOKS AND CONSTANTS ***/
    const navigate = useNavigate();

    const { id } = useParams();
    const edit_id = parseInt(id);
    const isEdit = !isNaN(edit_id);

    const { state } = useLocation();
    const prevLocation = state?.prevLocation;

    /**
     * User must be logged in (checked in the App component)
     */
    const { user } = useContext(UserContext);

    /*** STATES ****/

    /* Show/hide form */
    const [ showForm, setShowForm ]             = useState(true);

    /* Original title state (edit only) */
    const [ originalTitle, setOriginalTitle ]   = useState('');  

    /* Title state */
    const [ title, _setTitle ]                  = useState('');
    const [ titleError, setTitleError ]         = useState('');
    const setTitle = (title) => {
        _setTitle(title);
        setTitleError('');
        setError('');
    }

    /* Publication date state */
    const [ publicationDate, _setPublicationDate ]          = useState('');
    const [ publicationDateError, setPublicationDateError ] = useState('');
    const setPublicationDate = (publicationDate) => {
        _setPublicationDate(publicationDate);
        setPublicationDateError('');
        setError('');
    }

    /* Creation date */
    const [ creationDate, setCreationDate ] = useState(isEdit ? '' : TODAY());

    /* Author state */
    const [ author, setAuthor ]             = useState(user.id);

    /**
     * @typedef BlockEditObj
     * @type {object}
     * @property {BlockWithposition[]} add  - List of blocks to add (without IDs)
     * @property {BlockWithposition[]} edit - List of blocks to edit (with IDs)
     * @property {number[]} delete          - List of block IDs to delete
     */

    /**
     * @typedef BlockWithFeedback
     * @type {Block & { invalidFeedback: string }}
     */

    /**
     * @type {[BlockWithFeedback[], React.Dispatch<BlockWithFeedback[]> ]}
     */
    const [ blocks, setBlocks ] = useState([
        {
            type: 'header',
            content: '',
            invalidFeedback: ''
        },
        {
            type: 'paragraph',
            content: '',
            invalidFeedback: ''
        },
    ]);

    /**
     * @type {[ number[], React.Dispatch<number[]> ]}
     */
    const [ toDelete, setToDelete ]     = useState([]);

    /**
     * `images` contains a list of all images' information retrieved from the server.
     * If `undefined`, the images have to be loaded.
     * @type {[ Image[] | undefined, React.Dispatch<Image[]> ]}
     */
    const [ images, setImages ]             = useState();
    const [ imagesError, setImagesError ]   = useState('');

    /**
     * Fetch list of images from the database
     */
    useEffect(() => {
        listImages()
            .then(setImages)
            .catch(setImagesError)
    }, []);

    /* Submit states */
    const [ loading, setLoading ]       = useState(false);
    const [ error, setError ]           = useState('');
    const [ notFound, setNotFound ]     = useState(false);

    /**
     * @param {PageWithBlocks} page 
     */
    const fillForm = (page) => {
        setTitle(page.title);
        if(user.admin)
            setAuthor(page.author.id);
        setCreationDate(page.creationDate);
        setPublicationDate(page.publicationDate || '');
        setBlocks(page.blocks);
    }

    useEffect(() => {
        if(!isEdit) return;
        setLoading(true);
        setError('');
        getPageDetails(edit_id)
            .then(page => {
                if(page === null) {
                    setNotFound(true);
                } else {
                    setOriginalTitle(page.title);
                    fillForm(page);
                }
            })
            .catch(err => {
                setShowForm(false);
                setError(err);
            })
            .finally(() => setLoading(false));
    }, [isEdit, edit_id]);

    /*** BLOCK FUNCTIONS ***/

    /**
     * Changes a block's content upon a change event
     * @param {React.ChangeEvent} e 
     * @param {number} position 
     */
    const handleBlockChange = (e, position) => {
        blocks[position].content = e.target.value;
        blocks[position].invalidFeedback = '';
        setBlocks([ ...blocks ]);
        setError('');
    }

    /**
     * Adds a block of given type
     * @param {'header' | 'paragraph' | 'image'} type
     */
    const addBlock = (type) => {
        setError('');
        setBlocks([
            ...blocks,
            {
                type,
                content: ''
            }
        ]);
    }

    /**
     * Moves a block up
     * @param {number} position
     */
    const moveBlockUp = (position) => {
        const isFirstBlock = position === 0;
        if(!isFirstBlock) {
            // Swap this and previous block
            [ blocks[position-1], blocks[position] ] = [ blocks[position], blocks[position-1] ];
            setBlocks([...blocks]);
            setError('');
        }
    }

    /**
     * Moves a block down
     * @param {number} position
     */
    const moveBlockDown = (position) => {
        const isLastBlock = position === blocks.length-1;
        if(!isLastBlock) {
            // Swap this and next block
            [ blocks[position], blocks[position+1] ] = [ blocks[position+1], blocks[position] ];
            setBlocks([...blocks]);
            setError('');
        }
    }

    /**
     * Deletes a block, given its position
     * @param {number} position
     */
    const deleteBlock = (position) => {
        const removed = blocks.splice(position,1)[0];
        if(removed.id)
            setToDelete([...toDelete, removed.id]);
        setBlocks([...blocks]);
        setError('');
    }

    /*** VALIDATION AND SUBMISSION ***/

    /**
     * Validates a single block of content
     * @param {Block} block
     */
    const validateBlock = (block) => {
        if(block.content.length === 0) {
            let invalidFeedback = '';
            switch(block.type) {
                case "header":
                case "paragraph":
                    invalidFeedback = `Please insert some content.`;
                    break;
                case "image":
                    invalidFeedback = 'Please choose an image.';
                    break;
                default:
                    invalidFeedback = "Invalid block!"; // Should never show.
            }
            block.invalidFeedback = invalidFeedback;
            return false;
        }
        return true;
    }

    /**
     * Validates the entire form
     * @returns {boolean} If `true`, the form is valid.
     */
    const validate = () => {
        let valid = true;

        /* Validate title */
        if(title.length === 0) {
            setTitleError("Please insert a title.")
            valid = false;
        }

        /* Author and Publication date need no client-side controls */
        
        /* Validate all blocks */
        let validBlocks = true;
        let headerBlocksPresent = false;
        let otherBlocksPresent = false;
        blocks.forEach(b => {
            if(b.type === 'header')
                headerBlocksPresent = true;
            else
                otherBlocksPresent = true;
            if(!validateBlock(b))
                validBlocks = false;
        });

        if(!headerBlocksPresent || !otherBlocksPresent) {
            setError("The page must contain at least one header and another type of block.");
            valid = false;
        }

        /* Re-render blocks only if at least one invalidFeedback has been changed */
        if(!validBlocks)
            setBlocks([...blocks]);

        return valid && validBlocks;
    }

    /**
     * @type {React.EventHandler<SubmitEvent>}
     */
    const handleSubmit = (e) => {
        e.preventDefault();

        if(!validate())
            return;

        /* Build local JSON object of page */
        const page = {
            title,
            author,
            publicationDate: publicationDate || undefined,
            blocks
        }
        setLoading(true);
        setError('');

        /* Convert page to XML format before sending to server. */
        const pageXml = toXML("page", {
            '@': {title, author, publicationDate},
            block: blocks.map(block => ({
                '@': {
                    type: block.type
                },
                '#': block.content
            }))
        });

        let promise;
        if(isEdit)
            promise = editPage(edit_id, pageXml)
                        .then(({ blocks }) => {
                            /* Remove invalidFeedback from all blocks. */
                            page.blocks = 
                                page.blocks
                                    .map(block => {                             
                                        const { invalidFeedback, ...b } = block;
                                        return b;
                                    });

                            /* Assign IDs to *only* the new blocks. */
                            page.blocks
                                .filter(p => !p.id)
                                .forEach((b,i) => { b.id = blocks[i] });

                            /* Inform parent components of edit */
                            onEdit(page);
                            return `/pages/${edit_id}`;
                        });
        else
            promise = addPage(pageXml)
                        .then(({ id, blocks }) => {
                            /* Assign ID to the new page and blocks. */
                            page.id = id;
                            page.blocks = 
                                page.blocks.map((block,i) => {
                                    const { invalidFeedback, ...b } = block;
                                    b.id = blocks[i];
                                    return b;
                                });

                            /* Inform parent components of add */
                            onAdd(page);
                            return `/pages/${id}`;
                        });
        promise
            .then(route => navigate(route, { state: { success: isEdit ? 'edit' : 'add' } }))
            .catch(err => setError(err))
            .finally(() => setLoading(false));
    }

    /**
     * Automatically scroll to the first object containing an error message, if it exists and the user cannot see it.
     */
    useEffect(() => {
        /**
         * Checks if a DOM element is fully visible by the user.
         * @param {HTMLElement} el - The element 
         * @returns {boolean}
         */
        function elementFullyVisible(el) {
            var rect = el.getBoundingClientRect();

            return (
                rect.top >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
            );
        }

        if(error) {
            const element = document.querySelector('.is-invalid') || document.querySelector('.alert-danger');
            if(!elementFullyVisible(element))
                element.scrollIntoView();
        }
    }, [ error ])

    if(notFound)
        return <NotFound />
  
    return (
        <>
        <Button variant="outline-primary" as={Link} to={ prevLocation || '/back' } className="my-3"><ArrowLeft /> Back</Button>
        <h1>{ isEdit ? <>Edit page <span className="display-6">{originalTitle}</span></> : 'Add new page' }</h1>
        {
            showForm &&
                <Form onSubmit={handleSubmit}>
                    <Form.Group controlId='page-title' className="my-3">
                        <Form.Label>Title</Form.Label>
                        <Form.Control
                            type='text'
                            value={title}
                            isInvalid={!!titleError}
                            onChange={ev => setTitle(ev.target.value)} 
                            disabled={loading}
                            autoFocus 
                        />
                        <Form.Control.Feedback type="invalid">{titleError}</Form.Control.Feedback>
                    </Form.Group>
                    {
                        !!user.admin &&
                            <AuthorCombobox
                                value={author}
                                disabled={loading}
                                onChange={e => setAuthor(parseInt(e.target.value))}
                            />
                    }
                    <Row>
                        <Col sm={6}>
                            <Form.Group controlId='page-creation-date' className="my-3">
                                <Form.Label>Creation date</Form.Label>
                                <Form.Control type='date' readOnly disabled value={creationDate} />
                            </Form.Group>
                        </Col>
                        <Col sm={6}>
                            <Form.Group controlId='page-publish-date' className="my-3">
                                <Form.Label>Publication date</Form.Label>
                                <Form.Control
                                    type='date'
                                    value={publicationDate}
                                    isInvalid={!!publicationDateError}
                                    onChange={ev => setPublicationDate(ev.target.value)}
                                    disabled={loading}
                                />
                                <Form.Control.Feedback type="invalid" disabled={loading}>{publicationDateError}</Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                    </Row>
                    <h3>Blocks</h3>
                    {
                        blocks.map(({ type, content, invalidFeedback }, position) => {
                            let Block;
                            switch(type) {
                                case "header":
                                    Block = HeaderBlockFormElement;
                                    break;
                                case "paragraph":
                                    Block = ParagraphBlockFormElement;
                                    break;
                                case "image":
                                    Block = ImageBlockFormElement;
                                    break;
                            }
                            return <Block
                                        key={`block-${position}`}
                                        content={content}
                                        position={position}
                                        totalBlocks={blocks.length}
                                        invalidFeedback={invalidFeedback}
                                        disabled={loading}
                                        images={images}
                                        imagesError={imagesError}
                                        onChange={handleBlockChange}
                                        onMoveUp={moveBlockUp}
                                        onMoveDown={moveBlockDown}
                                        onDelete={deleteBlock}
                                    />
                        })
                    }
                    <div className='text-center'>
                        <Dropdown>
                            <Dropdown.Toggle variant="outline-dark" disabled={loading}>
                                Add block
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                                <Dropdown.Item onClick={() => addBlock("header")}>Header</Dropdown.Item>
                                <Dropdown.Item onClick={() => addBlock("paragraph")}>Paragraph</Dropdown.Item>
                                <Dropdown.Item onClick={() => addBlock("image")}>Image</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                    <Button type="submit" variant="primary" disabled={loading}>
                        {
                            isEdit ? 'Edit page' :
                            !publicationDate ? 'Add draft' :
                            publicationDate <= TODAY() ? 'Publish page' :
                            'Schedule publication'
                        }
                    </Button>
                </Form>
        }
        <div className="my-3 text-center">
            {
                error ? <Alert variant="danger" className="text-center"><strong>Error:</strong> {error}</Alert> :
                loading && <Spinner variant="primary" />
            }
        </div>
        </>
    )
}

/**
 * @param {object} props
 * @param {string} props.value
 * @param {boolean} props.disabled
 * @param {React.ChangeEventHandler} props.onChange
 */
function AuthorCombobox({ value, disabled, onChange }) {
    /**
     * @type {[ User[], React.Dispatch<User[]> ]}
     */
    const [ authorList, setAuthorList ] = useState();
    const [ error, setError ]           = useState('');
    const loading = typeof authorList === 'undefined';

    useEffect(() => {
        listUsers()
            .then(setAuthorList)
            .catch(setError);
    }, []);

    if(error)
        return <Alert variant="danger"><strong>Error:</strong> {error}</Alert>        

    return (
        <Form.Group controlId={`page-author`}>
            <Form.Label>Author</Form.Label>
            <Form.Select onChange={onChange} value={value} disabled={disabled || loading}>
                {
                    authorList?.map(user => (
                        <option key={`author-${user.id}`} value={user.id}>{user.name}</option>
                    ))
                }
            </Form.Select>
        </Form.Group>
    )
}

/**
 * @param {object} props
 * @param {string} props.title
 * @param {number} props.position
 * @param {number} props.totalBlocks
 * @param {boolean} props.disabled
 * @param {(position: number) => void} props.onMoveUp
 * @param {(position: number) => void} props.onMoveDown
 * @param {(position: number) => void} props.onDelete
 * @param {React.JSX.Element} children
 */
function BlockFormElement({ title, position, totalBlocks, buttonsDisabled, onMoveUp, onMoveDown, onDelete, children }) {
    return (
        <Card className="my-3">
            <Card.Header>
                <div className="d-flex justify-content-between">
                    <strong>{title}</strong>
                    <MoveDeleteButtons
                        disabled={buttonsDisabled}
                        position={position}
                        totalBlocks={totalBlocks}
                        onMoveUp={onMoveUp}
                        onMoveDown={onMoveDown}
                        onDelete={onDelete}
                    />
                </div>
            </Card.Header>
            <Card.Body>
                {children}
            </Card.Body>
        </Card>
    )
}

/**
 * @param {object} props
 * @param {number} props.position
 * @param {number} props.totalBlocks
 * @param {boolean} props.disabled
 * @param {(position: number) => void} props.onMoveUp
 * @param {(position: number) => void} props.onMoveDown
 * @param {(position: number) => void} props.onDelete
 */
function MoveDeleteButtons({ position, totalBlocks, disabled, onMoveUp, onMoveDown, onDelete }) {
    const isFirstBlock = position === 0;
    const isLastBlock = position === totalBlocks-1;
    
    return (
        <div>
            <ArrowUp
                role={ (disabled || isFirstBlock) ? undefined : "button"}
                className={ (disabled || isFirstBlock) ? 'opacity-25' : '' }
                onClick={ (disabled || isFirstBlock) ? undefined : () => onMoveUp?.(position)}
            />
            <ArrowDown
                role={ (disabled || isLastBlock) ? undefined : "button"}
                className={ (disabled || isLastBlock) ? 'opacity-25' : '' }
                onClick={ (disabled || isLastBlock) ? undefined : () => onMoveDown?.(position)}
            />
            <DeleteIcon
                role={ disabled ? undefined : "button"}
                className={ [ 'text-danger', disabled ? 'opacity-25' : '' ].join(' ') }
                onClick={disabled ? undefined : () => onDelete?.(position)}
            />
        </div>
    )
}

/**
 * @param {object} props
 * @param {string} props.content
 * @param {number} props.position
 * @param {number} props.totalBlocks
 * @param {string} props.invalidFeedback
 * @param {boolean} props.disabled
 * @param {React.ChangeEventHandler} props.onChange
 * @param {(position: number) => void} props.onMoveUp
 * @param {(position: number) => void} props.onMoveDown
 * @param {(position: number) => void} props.onDelete
 */
function HeaderBlockFormElement({ content, position, totalBlocks, invalidFeedback, disabled, onChange, onMoveUp, onMoveDown, onDelete }) {
    return (
        <BlockFormElement
            title="Header"
            position={position}
            totalBlocks={totalBlocks}
            buttonsDisabled={disabled}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDelete={onDelete}
        >
            <Form.Group controlId={`page-header-${position}`}>
                <Form.Label>Content</Form.Label>
                <Form.Control
                    type='text'
                    value={content}
                    isInvalid={!!invalidFeedback}
                    onChange={e => onChange?.(e, position)}
                    disabled={disabled}
                />
                <Form.Control.Feedback type="invalid">{invalidFeedback}</Form.Control.Feedback>
            </Form.Group>
        </BlockFormElement>
    )
}

/**
 * @param {object} props
 * @param {string} props.content
 * @param {number} props.position
 * @param {number} props.totalBlocks
 * @param {string} props.invalidFeedback
 * @param {boolean} props.disabled
 * @param {(event: React.ChangeEvent, position: number) => void} props.onChange
 * @param {(position: number) => void} props.onMoveUp
 * @param {(position: number) => void} props.onMoveDown
 * @param {(position: number) => void} props.onDelete
 */
function ParagraphBlockFormElement({ content, position, totalBlocks, invalidFeedback, disabled, onChange, onMoveUp, onMoveDown, onDelete }) {
    /**
     * @type {React.MutableRefObject<HTMLTextAreaElement>}
     */
    const textareaRef = useRef(null);

    /**
     * Handle auto-size of the textarea
     */
    useEffect(() => {
        textareaRef.current.style.height = '0px'; // Set height to zero first to get accurate scrollHeight
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${Math.max(scrollHeight, 62)}px`;
    }, [ content ])
    
    return (
        <BlockFormElement
            title="Paragraph"
            position={position}
            totalBlocks={totalBlocks}
            buttonsDisabled={disabled}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDelete={onDelete}
        >
            <Form.Group controlId={`page-header-${position}`}>
                <Form.Label>Content</Form.Label>
                <Form.Control
                    type="text"
                    as="textarea"
                    ref={textareaRef}
                    value={content}
                    isInvalid={!!invalidFeedback}
                    onChange={e => onChange?.(e, position)}
                    disabled={disabled}
                    className="overflow-hidden"
                />
                <Form.Control.Feedback type="invalid">{invalidFeedback}</Form.Control.Feedback>
            </Form.Group>
        </BlockFormElement>
    )
}

/**
 * @param {object} props
 * @param {Image[]} props.images
 * @param {string} props.imagesError
 * @param {string} props.content
 * @param {number} props.position
 * @param {number} props.totalBlocks
 * @param {string} props.invalidFeedback
 * @param {boolean} props.disabled
 * @param {(event: React.ChangeEvent, position: number) => void} props.onChange
 * @param {(position: number) => void} props.onMoveUp
 * @param {(position: number) => void} props.onMoveDown
 * @param {(position: number) => void} props.onDelete
 */
function ImageBlockFormElement({ images, imagesError, content, position, totalBlocks, invalidFeedback, disabled, onChange, onMoveUp, onMoveDown, onDelete }) {
    const loadingImages = typeof images === 'undefined';
    return (
        <BlockFormElement
            title="Image"
            position={position}
            totalBlocks={totalBlocks}
            buttonsDisabled={disabled}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDelete={onDelete}
        >
            {
                imagesError ?
                    <Alert variant="danger"><strong>Error:</strong> {imagesError}</Alert> 
                :
                    <>
                    <Form.Group controlId={`page-image-${position}`}>
                        <Form.Label>Content</Form.Label>
                        <Form.Select onChange={e => onChange?.(e, position)} value={content} isInvalid={!!invalidFeedback} disabled={disabled || loadingImages}>
                            <option value="">Choose an image</option>
                            {
                                images?.map(img => (
                                    <option key={`img-option-${img.filename}`} value={img.filename}>{img.name}</option>
                                ))
                            }
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">{invalidFeedback}</Form.Control.Feedback>
                    </Form.Group>
                    {
                        content.length > 0 &&
                            <Row className="justify-content-center mt-3">
                                <Col xl={6} lg={7} md={8}>
                                    <Card>
                                        <Card.Img className="img-fluid" src={`http://localhost:3001/${content}`} />
                                    </Card>
                                </Col>
                            </Row>
                    }
                    </>
            }
        </BlockFormElement>
    )
}