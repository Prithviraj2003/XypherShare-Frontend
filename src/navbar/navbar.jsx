import React from "react";
import { Toaster } from "react-hot-toast";

const Navbar = () => {
  return (
    <header className="app-header">
      
      <Toaster position="top-right" containerStyle={{zIndex:100}} reverseOrder={false} />
      <a href="/">
        <div className="header-logo">
          <div className="title-and-slogan">
            <span className="title">Quick Share</span>
            <span className="slogan">Making sharing Easy . . . </span>
          </div>
        </div>
      </a>
      <div className="container-menu-desktop">
        <div className="links-desktop">
          <a className="menu-link" href="/">
            Home
          </a>
          <a className="menu-link" href="/receive">
            Receive
          </a>
        </div>
        <div className="menu-buttons">
          <a className="menu-button" href="/download">
            Download
          </a>
          <a className="menu-button-outlined" href="/nearby">
            {" "}
            Nearby devices
          </a>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
