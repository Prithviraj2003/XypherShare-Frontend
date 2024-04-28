import React from "react";
import { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <header className="app-header">
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 100 }}
        reverseOrder={false}
      />
      <div onClick={() => navigate("/")}>
        <div className="header-logo">
          <div className="title-and-slogan">
            <span className="title">Quick Share</span>
            <span className="slogan">Making sharing Easy . . . </span>
          </div>
        </div>
      </div>
      <div className="container-menu-desktop">
        <div className="links-desktop">
          <div onClick={() => navigate("/")} className="menu-link">
            Home
          </div>
          <div onClick={() => navigate("/receive")} className="menu-link">
            Receive
          </div>
        </div>
        <div className="menu-buttons">
          <div className="menu-button">Download</div>
          <div className="menu-button-outlined"> Nearby devices</div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
