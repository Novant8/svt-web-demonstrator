import React, { useState } from 'react'

import { deletePage } from '../lib/api';

import { ReactComponent as EditIcon } from '../assets/pencil-square.svg'
import { ReactComponent as DeleteIcon } from '../assets/trash.svg'

import { Button, Spinner } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom'

/**
 * @param {React.HTMLAttributes<HTMLDivElement>} props
 * @param {number} props.pageId
 * @param {string} props.delete-className
 * @param {string} props.edit-className
 * @param {(pageId: number) => (void | Promise<void>)} props.onDelete 
 * @returns 
 */
export default function ManagementButtons({ pageId, onDelete, "edit-className": edit_className, "delete-className": delete_className, ...props }) {
    const [ loadingDelete, setLoadingDelete ] = useState(false);
    const [ deleteError, setDeleteError ]     = useState('');

    const location = useLocation();

    /**
     * @type {React.MouseEventHandler} 
     */
    const handleDelete = e => {
        e.preventDefault();
        setLoadingDelete(true);
        deletePage(pageId)
            .then(() => onDelete(pageId))
            .catch(() => {
                setDeleteError("Cannot delete!");
                setTimeout(() => setDeleteError(''), 1000);
            })
            .finally(() => setLoadingDelete(false));
    }

    return (
        <div {...props}>
            <Button variant="outline-warning" as={Link} to={`/pages/${pageId}/edit`} state={{ prevLocation: location }} className={edit_className}><EditIcon className="mb-1 me-1" /> Edit</Button>
            {
                deleteError ? <span className="text-danger">{ deleteError }</span> :
                <Button variant="outline-danger" className={delete_className} onClick={handleDelete} disabled={loadingDelete}>
                    {
                        loadingDelete ?
                            <><Spinner variant="danger" size="sm" /> Deleting...</>
                        :
                            <><DeleteIcon className="mb-1 me-1" /> Delete</>
                    }
                </Button>
            }
        </div>
    )
}
