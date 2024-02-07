import React, { useId, useState, useEffect } from 'react'
import { useDebounce } from 'use-debounce';

import "../../../typedefs"
import validator from 'validator';
import { ToggleButtonGroup, ToggleButton, Form, Row, Col, Card, Placeholder, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { searchImages } from '../lib/api';

/**
 * @typedef ImageInvalidFeedback
 * @type{object}
 * @property {string} name Feedback relative to the file's name
 * @property {string} file Feedback relative to the file itself
 */

/**
 * @typedef LocalFileImageBlock
 * @type {object}
 * @property {File} file
 */

/**
 * @typedef LocalImageBlock
 * @type {UrlImageBlock | LocalFileImageBlock | ExistingImageBlock}
 */

/**
 * @param {object} props
 * @param {boolean} props.disabled
 * @param {LocalImageBlock} props.value
 * @param {ImageInvalidFeedback | undefined} props.invalidFeedback
 * @param {(image: NewImage) => void} props.onChange
 */
export default function ImageBlockForm({ disabled, value, invalidFeedback, onChange }) {

    const formId = useId().slice(1,-1);
    
    const isExistingImage = typeof value.file === 'undefined' && typeof value.url === 'undefined';
    const formType = isExistingImage ? 'existing' : 'new';

    /**
     * @param {typeof formType} newType
     */
    function handleFormTypeChange(newType) {
        value = { fileName: '' };
        if(newType === 'new')
            value.file = null;
        onChange(value);
    }

    return (
        <>
          <ToggleButtonGroup type="radio" name={`form-type-${formId}`} value={formType} onChange={handleFormTypeChange} className="mb-3">
                <ToggleButton id={`form-type-new${formId}`} variant="outline-secondary" value="new">
                    Upload a new image
                </ToggleButton>
                <ToggleButton id={`form-type-existing-${formId}`} variant="outline-secondary" value="existing">
                    Use an existing image
                </ToggleButton>
          </ToggleButtonGroup>
          {
            formType === 'new' ?
                <NewImageForm
                    formId={formId}
                    value={value}
                    invalidFeedback={invalidFeedback}
                    disabled={disabled}
                    onChange={onChange}
                />
            :
                <ExistingImageForm
                    value={value}
                    disabled={disabled}
                    onChange={onChange}
                />
          }
        </>
    )
}

/**
 * @param {object} props
 * @param {string} props.formId
 * @param {LocalImageBlock} props.value
 * @param {ImageInvalidFeedback | undefined} props.invalidFeedback
 * @param {boolean} props.disabled
 * @param {(img: NewImage) => void} props.onChange
 */
function NewImageForm({ formId, value, invalidFeedback, disabled, onChange }) {

    const uploadType = typeof value.url !== 'undefined' ? 'url' : 'file';

    /**
     * @type{React.EventHandler<React.ChangeEvent<HTMLInputElement>>} 
     */
    function handleRadioChange(e) {
        if(e.target.value === 'file')
            value = { file: null };
        else
            value = { url: '' };
        value.fileName = '';
        onChange(value);
    }

    /**
     * @type{React.EventHandler<React.ChangeEvent<HTMLInputElement>>} 
     */
    function handleNameChange(e) {
        value.fileName = e.target.value;
        onChange(value);
    }

    /**
     * @type{React.EventHandler<React.ChangeEvent<HTMLInputElement>>} 
     */
    function handleValueChange(e) {
        if(uploadType === 'file')
            value.file = e.target.files[0];
        else
            value.url = e.target.value;
        onChange(value);
    }

    const validImage =
        (uploadType === 'file' && value.file !== null && value.file.type.startsWith("image/") && !['image/svg', 'image/svg+xml'].includes(value.file.type))
        || (uploadType === 'url' && validator.isURL(value.url));

    return (
        <>
            <Form.Group controlId={`new-image-upload-type-${formId}`}>
                <Form.Check
                    type="radio"
                    label="Upload a file"
                    name={`radio-new-image-${formId}`}
                    id={`radio-new-image-file-${formId}`}
                    value="file"
                    checked={uploadType === "file"}
                    disabled={disabled}
                    onChange={handleRadioChange}
                />
                <Form.Check
                    type="radio"
                    label="Download from an external URL"
                    name={`radio-new-image-${formId}`}
                    id={`radio-new-image-url-${formId}`}
                    value="url"
                    checked={uploadType === "url"}
                    disabled={disabled}
                    onChange={handleRadioChange}
                />
            </Form.Group>
            <Form.Group controlId={`new-image-filename-${formId}`} className="my-3">
                <Form.Label>File name</Form.Label>
                <Form.Control
                    type='text'
                    value={value.fileName}
                    isInvalid={!!invalidFeedback?.name}
                    disabled={disabled}
                    onChange={handleNameChange}
                />
                <Form.Control.Feedback type="invalid" disabled={disabled}>{invalidFeedback?.name}</Form.Control.Feedback>
            </Form.Group>
            {
                uploadType === 'file' ?
                    <>
                        <Form.Group controlId={`new-image-file-${formId}`} className="my-3">
                            <Form.Label>File</Form.Label>
                            <Form.Control
                                type='file'
                                disabled={disabled}
                                isInvalid={!!invalidFeedback?.file}
                                onChange={handleValueChange}
                            />
                            <Form.Control.Feedback type="invalid" disabled={disabled}>{invalidFeedback?.file}</Form.Control.Feedback>
                        </Form.Group>
                        {
                            validImage &&
                                <Row className="justify-content-center mt-3">
                                    <Col xl={6} lg={7} md={8}>
                                        <Card border="light">
                                            <Card.Img className="img-fluid" src={URL.createObjectURL(value.file)} />
                                        </Card>
                                    </Col>
                                </Row>
                        }
                    </>
                :
                    <>
                        <Form.Group controlId={`new-image-url-${formId}`} className="my-3">
                            <Form.Label>URL</Form.Label>
                            <Form.Control
                                type='text'
                                defaultValue={value.url}
                                isInvalid={!!invalidFeedback?.file}
                                disabled={disabled}
                                onChange={handleValueChange}
                            />
                            <Form.Control.Feedback type="invalid" disabled={disabled}>{invalidFeedback?.file}</Form.Control.Feedback>
                        </Form.Group>
                        {
                            validImage &&
                                <Row className="justify-content-center mt-3">
                                    <Col xl={6} lg={7} md={8}>
                                        <Card border="light">
                                            <Card.Img className="img-fluid" src={value.url} />
                                        </Card>
                                    </Col>
                                </Row>
                        }
                    </>
            }
        </>
    )
}

function ImageGridPlaceholder() {
    return (
        <Row className="image-select-row">
            {
                Array(6).fill().map((_, i) => (
                    <Col key={`placeholder-col-${i}`} xl={2} lg={3} md={4} sm={6}>
                        <Placeholder animation="wave" as={Card.Img} style={{ height: "150px", backgroundColor: "#d0d0d0" }} />
                    </Col>
                ))
            }
        </Row>
    )
}

/**
 * 
 * @param {object} props
 * @param {string[]} props.images
 * @param {number} props.selected
 * @param {(img: string) => void} props.onChange
 * @returns 
 */
function ImageGrid({ images, onChange }) {
    return (
        <Row className="image-select-row">
            {
                images.map((img, i) => (
                    <Col key={`img-col-${img}`} xl={2} lg={3} md={4} sm={6}>
                        <OverlayTrigger placement="bottom" overlay={<Tooltip style={{ marginTop: "10px" }}>{img}</Tooltip>}>
                            <Card className="image-select-card" onClick={() => onChange(img)}>
                                <Card.Img
                                    className="img-fluid"
                                    src={`http://localhost:3001/${img}`}
                                    alt={img}
                                />
                            </Card>
                        </OverlayTrigger>
                    </Col>
                ))
            }
        </Row>
    )
}

/**
 * 
 * @param {object} props
 * @param {LocalImageBlock} props.value
 * @param {boolean} props.disabled
 * @param {(img: NewImage) => void} props.onChange
 * @returns 
 */
function ExistingImageForm({ value, disabled, onChange }) {
    const [ search, setSearch ]             = useState("");
    const [ debouncedSearch ]               = useDebounce(search, 500);

    const [ images, setImages ]             = useState(value.fileName ? [] : undefined);
    const [ searchError, setSearchError ]   = useState("");
    const loadingImages                     = typeof images === 'undefined';

    const [ selected, setSelected ]         = useState(!!value.fileName);

    useEffect(() => {
        if(selected)
            return;
        setSearchError('');
        setImages();
        searchImages(debouncedSearch)
            .then(images => setImages(images))
            .catch(e => setSearchError(e));
    }, [ debouncedSearch, selected ]);

    /**
     * @param {string} fileName File name of the selected image
     */
    function handleSelectedChange(fileName) {
        value.fileName = fileName
        onChange(value);
        setSearch("");
        setImages([]);
        setSelected(true);
    }

    function handleSearchFocus() {
        if(selected) {
            setSelected(false);
            setSearch("");
        }
    }

    const noImageFound = !selected && !loadingImages && images.length === 0 && debouncedSearch.length > 0;

    return (
        <>
            {
                value.fileName &&
                    <Row className="justify-content-center mb-3">
                        <Col xl={6} lg={7} md={8}>
                            <Card border="light">
                                <Card.Img className="img-fluid" src={`http://localhost:3001/${value.fileName}`} />
                            </Card>
                        </Col>
                    </Row>
            }
            <Form.Control
                className="mb-3"
                placeholder="Search..."
                type="text"
                value={search}
                disabled={disabled}
                onFocus={handleSearchFocus}
                onChange={(e) => { setSearch(e.target.value); setSelected(false); }}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            />
            {
                loadingImages ? <ImageGridPlaceholder /> :
                noImageFound ? <Alert variant="dark">No image found.</Alert> :
                searchError ? <Alert variant="danger"><strong>Error:</strong>{searchError}</Alert> :
                    <ImageGrid
                        images={images}
                        onChange={img => handleSelectedChange(img)}
                    />
            }
        </>
    )
}