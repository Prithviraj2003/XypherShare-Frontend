import React, { useState } from "react";
import { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  return (
    <header className="app-header">
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 100 }}
        reverseOrder={false}
      />
      <div
        onClick={() => {
          navigate("/");
          setMenu(false);
        }}
      >
        <div className="header-logo">
          <div className="title-and-slogan">
            <span className="title">Xypher Share</span>
            <span className="slogan">Making sharing Easy . . . </span>
          </div>
        </div>
      </div>
      <div className="container-menu-desktop">
        <div className="links-desktop">
          <div onClick={() => navigate("/")} className="menu-link">
            Transfer
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
      <svg
        stroke="currentColor"
        fill="currentColor"
        stroke-width="0"
        viewBox="0 0 512 512"
        class="menu-button-mobile"
        height="35"
        width="35"
        xmlns="http://www.w3.org/2000/svg"
        onClick={() => setMenu(!menu)}
      >
        <path
          fill="none"
          stroke-linecap="round"
          stroke-miterlimit="10"
          stroke-width="48"
          d="M88 152h336M88 256h336M88 360h336"
        ></path>
      </svg>
      {menu && (
        <div class="container-menu-mobile">
          <div
            onClick={() => {
              navigate("/");
              setMenu(false);
            }}
            className="menu-button-outlined"
          >
            Transfer
          </div>
          <div
            onClick={() => {
              navigate("/receive");
              setMenu(false);
            }}
            className="menu-button-outlined"
          >
            Receive
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
