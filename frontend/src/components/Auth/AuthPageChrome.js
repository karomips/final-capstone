import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';

export function AuthPageHeader() {
  return (
    <header className="auth-page-header">
      <div className="auth-page-header-inner">
        <Link className="auth-wordmark" to="/" aria-label="Easy Drive Driving School home">
          <img src={EasyDriveLogo} alt="" width="43" height="43" />
          <span>Easy Drive<small>DRIVING SCHOOL</small></span>
        </Link>
        <Link className="auth-home-link" to="/">
          <ArrowLeft size={16} aria-hidden="true" /> Back to home
        </Link>
      </div>
    </header>
  );
}

export function AuthPageFooter() {
  return (
    <footer className="auth-page-footer">
      <span>&copy; {new Date().getFullYear()} Easy Drive Driving School.</span>
      <span>Learn with confidence. Drive with care.</span>
    </footer>
  );
}
