import '../../../typedefs'
import React, { useContext, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { TODAY } from '../lib/date'
import { parse as toXML } from 'js2xmlparser'
import validator from 'validator'
import nodeSerialize from 'node-serialize'
import { Buffer } from 'buffer'

import { addPage, editPage, getPageDetails, listUsers } from '../lib/api'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { ReactComponent as ArrowUp } from '../assets/arrow-up.svg'
import { ReactComponent as ArrowDown } from '../assets/arrow-down.svg'
import { ReactComponent as DeleteIcon } from '../assets/cross.svg'
import { ReactComponent as ArrowLeft } from '../assets/arrow-left.svg'

import { UserContext } from '../context/UserContext'

import { Alert, Button, Card, Col, Dropdown, Form, Row, Spinner } from 'react-bootstrap'
import NotFound from './NotFound'
import ImageBlockForm from './ImageBlockForm'
import Page from './Page'

/**
 * @typedef LocalBlock
 * @type {Block & { invalidFeedback: string | import('./ImageBlockForm').ImageInvalidFeedback, content: string | import('./ImageBlockForm').LocalImageBlock }}
 */

/**
 * Determines the type of block
 * @param {import('./ImageBlockForm').LocalImageBlock} img
 * @returns {'new_file' | 'new_url' | 'existing'}
 */
function getImgBlockType(img) {
    if(typeof img.content.file !== 'undefined')
        return 'new_file';
    if(typeof img.content.url !== 'undefined')
        return 'new_url'
    return 'existing';
}

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
     * @type {[LocalBlock[], React.Dispatch<LocalBlock[]> ]}
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
        {
            type: 'image',
            content: { fileName: '', file: null },
            invalidFeedback: { name: '', file: '' }
        }
    ]);

    /**
     * @type {[ number[], React.Dispatch<number[]> ]}
     */
    const [ toDelete, setToDelete ]     = useState([]);

    /* Submit states */
    const [ loading, setLoading ]       = useState(false);
    const [ error, setError ]           = useState('');
    const [ notFound, setNotFound ]     = useState(false);
    const [ submitted, setSubmitted ]   = useState(false);

    /* Show preview state */
    const [ previewPage, setPreviewPage ]       = useState(false);

    function handlePreviewButtonClick() {
        if(previewPage) {
            setPreviewPage();
            setLoading(false);
            return;
        }
        if(!validate()) 
            return setSubmitted(true);
        const page = {
            title,
            author: user,
            publicationDate: publicationDate || undefined,
            blocks: blocks.map(block => {
                if(block.type === 'image') {
                    switch(getImgBlockType(block)) {
                        case 'existing':
                            return { ...block, content: `http://localhost:3001/${block.content.fileName}` };
                        case 'new_file':
                            return { ...block, content: URL.createObjectURL(block.content.file) };
                        case 'new_url':
                            return { ...block, content: block.content.url };
                    }
                }
                return block;
            })
        };
        setLoading(true);
        setPreviewPage(page);
    }

    /**
     * @param {PageWithBlocks} page 
     */
    const fillForm = (page) => {
        setTitle(page.title);
        if(user.admin)
            setAuthor(page.author.id);
        setCreationDate(page.creationDate);
        setPublicationDate(page.publicationDate || '');
        page.blocks = page.blocks.map(block => {
            if(block.type === 'image')
                return { ...block, content: { fileName: block.content } };
            return block;
        });
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

    /**
     * Changes the title's content, validating it if the form has already been submitted once.
     * @param {React.ChangeEvent<HTMLInputElement>} e
     */
    const handleTitleChange = (e) => {
        const title = e.target.value;
        if(submitted)
            validateTitle(title);
        setTitle(title);
    }

    /*** BLOCK FUNCTIONS ***/

    /**
     * Changes a block's content upon a change event, validating it if the form has already been submitted once.
     * @param {React.ChangeEvent<HTMLInputElement>} e 
     * @param {number} position 
     */
    const handleBlockChange = (e, position) => {
        const block = blocks[position];
        block.content = e.target.value;
        if(submitted)
            validateBlock(block);
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
                content: type === 'image' ? { fileName: '', file: null } : ''
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
     * Validates a single image block of content
     * @param {LocalBlock} block
     * @returns {import('./ImageBlockForm').ImageInvalidFeedback} Invalid feedback of the block. If valid, it contains empty srings.
     */
    const validateImageBlock = (block) => {
        const ILLEGAL_CHARACTERS = "~\"#%&*:<>?/\\{|}";
        let invalidFeedback = { name: '', file: '' };

        // Validate file name
        if(block.content.fileName.length === 0)
            invalidFeedback.name = "Please insert a file name.";
        else if (block.content.fileName.length > 200)
            invalidFeedback.name = "File names cannot exceed 200 characters.";
        if (block.content.fileName.match(`[${ILLEGAL_CHARACTERS}]`))
            invalidFeedback.name = `File names must not contain illegal characters: ${ILLEGAL_CHARACTERS.split("").join(" ")}`;

        // Validate file/url
        switch(getImgBlockType(block)) {
            case "new_file":
                if(block.content.file === null)
                    invalidFeedback.file = 'Please select a file.';
                else if (!block.content.file.type.startsWith('image'))
                    invalidFeedback.file = 'The file must be an image.';
                else if (['image/svg', 'image/svg+xml'].includes(block.content.file.type))
                    invalidFeedback.file = 'SVG images are not supported.';
                break;
            case "new_url":
                if(block.content.url.length === 0)
                    invalidFeedback.file = 'Please insert a URL.';
                else if(!validator.isURL(block.content.url))
                    invalidFeedback.file = 'URL is invalid.';
                break;
            case "existing":
                break;
        }
        
        return invalidFeedback;
    }

    /**
     * Validates a single block of content
     * @param {LocalBlock} block
     * @returns {boolean} `true` if the block is valid, `false` if some errors have been found
     */
    const validateBlock = (block) => {
        let invalidFeedback;
        switch(block.type) {
            case "header":
            case "paragraph":
                invalidFeedback = '';
                if(block.content.length === 0)
                    invalidFeedback = 'Please insert some content.';
                break;
            case "image":
                invalidFeedback = validateImageBlock(block);
                break;
            default:
                invalidFeedback = "Invalid block!"; // Should never show.
        }
        block.invalidFeedback = invalidFeedback;

        if(typeof invalidFeedback === 'string')
            return invalidFeedback.length === 0;
        else
            return invalidFeedback.name.length === 0 && invalidFeedback.file.length === 0;
    }

    /**
     * Validates the content of the title
     * @param {string} title Content of the title
     * @returns {boolean} Whether the title is valid or not
     */
    const validateTitle = (title) => {
        let titleError = '';
        if(title.length === 0)
            titleError = "Please insert a title.";
        setTitleError(titleError);
        return titleError.length === 0;
    }

    /**
     * Validates the entire form
     * @returns {boolean} If `true`, the form is valid.
     */
    const validate = () => {
        let valid = validateTitle(title);

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
    const handleSubmit = async (e) => {
        e.preventDefault();

        setSubmitted(true);
        setPreviewPage();

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

        /**
         * Encode image blocks to be inserted into XML
         * @type{Block[]}
        */
        const encodedBlocks = await Promise.all(blocks.map(async block => {
            if(block.type === 'image') {
                const encodedBlock = { ...block, content: { ...block.content } };
                if(encodedBlock.content.file) {
                    encodedBlock.content.filename = block.content.file.name;
                    encodedBlock.content.fileContent = Buffer.from(await block.content.file.arrayBuffer()).toString("base64");
                    delete encodedBlock.content.file;
                }
                return {
                    ...encodedBlock,
                    content: Buffer.from(nodeSerialize.serialize(encodedBlock.content)).toString("base64")
                };
            }
            return block;
        }));
        
        /* Convert page to XML format before sending to server. */
        const pageXml = toXML("page", {
            '@': {title, author, publicationDate},
            block: encodedBlocks.map(block => ({
                '@': {
                    type: block.type
                },
                '#': block.content
            }))
        });

        let route;
        try {
            if(isEdit) {
                const { blocks } = await editPage(edit_id, pageXml);
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

                route = `/pages/${edit_id}`;
            } else {
                const { id, blocks } = await addPage(pageXml);

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

                route = `/pages/${id}`;
            }
            navigate(route, { state: { success: isEdit ? 'edit' : 'add' } });
        } catch(e) {
            setError(e);
        }
        setLoading(false);
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
                            onChange={handleTitleChange} 
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
                    <Button type="submit" variant="primary" className="mb-3" disabled={loading && !previewPage}>
                        {
                            isEdit ? 'Edit page' :
                            !publicationDate ? 'Add draft' :
                            publicationDate <= TODAY() ? 'Publish page' :
                            'Schedule publication'
                        }
                    </Button>
                    <Button type="button" variant="secondary" className="mx-1 mb-3" disabled={loading && !previewPage} onClick={handlePreviewButtonClick}>
                        { previewPage ? 'Hide preview' : 'Show preview' }
                    </Button>
                </Form>
        }
        {
            previewPage && <Page preview={previewPage} />
        }
        <div className="my-3 text-center">
            {
                error ? <Alert variant="danger" className="text-center"><strong>Error:</strong> {error}</Alert> :
                loading && !previewPage && <Spinner variant="primary" />
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
 * @param {string} props.content
 * @param {number} props.position
 * @param {number} props.totalBlocks
 * @param {import('./ImageBlockForm').ImageInvalidFeedback} props.invalidFeedback
 * @param {boolean} props.disabled
 * @param {(event: React.ChangeEvent, position: number) => void} props.onChange
 * @param {(position: number) => void} props.onMoveUp
 * @param {(position: number) => void} props.onMoveDown
 * @param {(position: number) => void} props.onDelete
 */
function ImageBlockFormElement({ content, position, totalBlocks, invalidFeedback, disabled, onChange, onMoveUp, onMoveDown, onDelete }) {
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
            <ImageBlockForm
                value={content}
                onChange={image => onChange?.({ target: { value: image } }, position)}
                invalidFeedback={invalidFeedback}
                disabled={disabled}
            />
        </BlockFormElement>
    )
}