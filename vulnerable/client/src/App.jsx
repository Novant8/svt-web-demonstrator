import React, { useContext, useEffect, useState } from 'react';
import { TODAY } from './lib/date';
import '../../typedefs';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { getPages, getWebsiteName } from './lib/api';

import { Helmet } from 'react-helmet-async';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Alert, Container, Spinner } from 'react-bootstrap';
import Navbar from './components/Navbar';
import LoginForm from './components/LoginForm';
import { UserContext } from './context/UserContext';
import PageList from './components/PageList';
import Page from './components/Page';
import PageForm from './components/PageForm';
import NotFound from './components/NotFound';
import RegisterForm from './components/RegisterForm';

function App() {
  const { user, loadingUser, userError } = useContext(UserContext);
  const isLoggedIn = !!user;

  /**
   * If `websiteName` is undefined, then it's still loading.
   * @type [ string | undefined, React.Dispatch<string | undefined> ]
   */
  const [ websiteName, setWebsiteName ]           = useState();
  const [ websiteNameError, setWebsiteNameError ] = useState('');
  const nameLoading                               = typeof websiteName === 'undefined';
  

  /**
   * Forces website name to be re-fetched.
   * @returns {Promise<void>} - Promise that resolves when fetching is completed. Never rejects.
   */
  const refreshName = async () => {
    try {
      const name = await getWebsiteName();
      setWebsiteName(name);
    } catch(err) {
      setWebsiteNameError("Unknown name!");
    }
  }

  /**
   * `fetchedPages` contains the pages that have been fetched from the server from the API.
   * If undefined, the pages have to be loaded from the API. 
   * @type [ PageWithBlocks[] | undefined, React.Dispatch<PageWithBlocks[] | undefined> ]
   */
  const [ fetchedPages, setFetchedPages ] = useState();
  const [ pagesError, setPagesError ] = useState('');
  const pagesLoading = typeof fetchedPages === 'undefined';

  /**
   * Contains the pages of the back-office, if the user is logged in.
   */
  const backPages = isLoggedIn && fetchedPages;

  /**
   * Contains the pages of the front-office.
   * - If the user is logged in, filter only pages that are published
   * - If the user is not logged in, there is no need to filter
   */
  const frontPages = isLoggedIn ? fetchedPages?.filter(p => p.publicationDate <= TODAY()) : fetchedPages;

  /**
   * Forces pages to be re-fetched.
   * @returns {Promise<void>} - Promise that resolves when fetching is completed. Never rejects.
   */
  const searchPages = async (search = '') => {
    try {
      setFetchedPages();
      setPagesError('');
      const pages = await getPages(search);
      setFetchedPages(pages);
    } catch(err) {
      setPagesError(err);
    }
  }

  /**
   * Forces everything (pages and website name) to be re-fetched
   * @returns {Promise<[ void, void ]>} - Promise that resolves when fetching is completed. Never rejects.
   */
  const refresh = () => Promise.all([ refreshName(), searchPages() ]);

  /**
   * Fetch page list on first load
   */
  useEffect(() => {
    refresh();
  }, []);

  return (
    <BrowserRouter>
      <Helmet>
          <title>{websiteName || "Loading..."}</title>
      </Helmet>
      <Navbar
        websiteName={websiteName}
        nameError={websiteNameError}
        nameLoading={nameLoading}
        onLogout={() => refresh()}
        onNameChange={newName => setWebsiteName(newName)}
      />
      <Container className="my-3">
        <Routes>
          <Route
            index
            exact path='/'
            element={<Navigate replace to="/front" />}
          />
          <Route
            exact path='/front'
            element={
              <PageList
                office="front"
                pages={frontPages}
                loading={pagesLoading}
                error={pagesError}
                onSearch={search => searchPages(search)}
              />
            }
          />
          <Route
            index
            exact path='/back'
            element={
              userError ? <Alert variant="danger" className="text-center"><strong>Error:</strong> { userError }</Alert> :
              loadingUser ? <CenteredSpinner /> :
              user ?
                <PageList
                  office="back"
                  pages={backPages}
                  loading={pagesLoading}
                  error={pagesError}
                  onPageDelete={() => refresh()}
                  onSearch={search => searchPages(search)}
                />
              :
                <Navigate replace to="/front" />
            }
          />
          <Route
            exact path="/login"
            element={
              userError ? <Alert variant="danger" className="text-center"><strong>Error:</strong> { userError }</Alert> :
              loadingUser ? <CenteredSpinner /> :
              /* The Navigate component was moved into the the LoginForm component, which keeps track of the previous page. */
              <LoginForm onLogin={() => refresh()} />
            }
          />
           <Route
            exact path="/register"
            element={
              userError ? <Alert variant="danger" className="text-center"><strong>Error:</strong> { userError }</Alert> :
             /*  loadingUser ? <CenteredSpinner /> : */
              /* The Navigate component was moved into the the LoginForm component, which keeps track of the previous page. */
              <RegisterForm onRegister={() => refresh()} />
            }
          />
          <Route
            path="/pages/:id"
            element={
              <Page onDelete={() => refresh()} />
            }
          />
          <Route
            path="/pages/new"
            element={
              userError ? <Alert variant="danger" className="text-center"><strong>Error:</strong> { userError }</Alert> :
              loadingUser ? <CenteredSpinner /> :
              user ?
                <PageForm
                  onAdd={() => refresh()}
                />
              :
                <Navigate replace to="/back" />
            }
          />
          <Route
            path="/pages/:id/edit"
            element={
              userError ? <Alert variant="danger" className="text-center"><strong>Error:</strong> { userError }</Alert> :
              loadingUser ? <CenteredSpinner /> :
              user ?
                <PageForm
                    onEdit={() => refresh()}
                />
              :
                <Navigate replace to="/back" />
            }
          />
          <Route
            path="*"
            element={<NotFound />}
          />
        </Routes>
      </Container>
    </BrowserRouter>
  )
}

function CenteredSpinner() {
  return (
    <div className="text-center">
      <Spinner variant="primary"/>
    </div>
  )
}

export default App
