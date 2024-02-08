import React from 'react'
import { longDate } from '../lib/date';
import '../../../typedefs';

import { ReactComponent as CalendarIcon } from '../assets/calendar.svg'
import { ReactComponent as AddIcon } from '../assets/page-add.svg'
import { ReactComponent as AuthorIcon } from '../assets/person.svg'

import { Badge, Card, Placeholder } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

/**
 * 
 * @param {object} props
 * @param {Page} props.page
 * @returns 
 */
export default function PageCard({ page }) {
  const location = useLocation();

  return (
    <Card
      as={Link} to={`http://localhost:3001/api/pageclick?redirect=${encodeURIComponent(`http://localhost:5173/pages/${page.id}`)}`}
      state={{ prevLocation: location }}
      className="page-card text-decoration-none h-100"
    >
      <Card.Body className="d-flex flex-column">
        <Card.Title>{page.title}</Card.Title>
        <table className="text-muted mt-auto d-block">
          <tbody>
            <tr>
              <td><AddIcon className="mb-1 me-1" /></td>
              <td>Created { longDate(page.creationDate) }</td>
            </tr>
            <tr>
              <td><CalendarIcon className="mb-1 me-1" /></td>
              <td>Published { longDate(page.publicationDate) }</td>
            </tr>
            <tr>
              <td><AuthorIcon className="mb-1 me-1" /></td>
              <td>{ page.author.name } { !!page.author.admin && <Badge pill bg="danger" as="small">Admin</Badge> }</td>
            </tr>
          </tbody>
        </table>
      </Card.Body>
    </Card>
  )
}

export function PageCardPlaceholder() {
  return (
    <Card className="my-3">
      <Card.Body>
        <Placeholder as={Card.Title} animation="glow">
          <Placeholder xs={Math.floor(7+Math.random()*5)} />
        </Placeholder>
        <table>
          <tbody>
            <tr>
              <td><AddIcon className="mb-1 me-1" /></td>
              <Placeholder animation="glow" as="td">
                <Placeholder style={{ width: 100 }} />
              </Placeholder>
            </tr>
            <tr>
              <td><CalendarIcon className="mb-1 me-1" /></td>
              <Placeholder animation="glow" as="td">
                <Placeholder style={{ width: 100 }} />
              </Placeholder>
            </tr>
            <tr>
              <td><AuthorIcon className="mb-1 me-1" /></td>
              <Placeholder animation="glow" as="td">
                <Placeholder style={{ width: 50+Math.random()*25 }} />
              </Placeholder>
            </tr>
          </tbody>
        </table>
      </Card.Body>
    </Card>
  )
}