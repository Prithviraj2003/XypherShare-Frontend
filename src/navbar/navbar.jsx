import React, { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
const Navbar = () => {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visitors, setVisitors] = useState(0);
  const [filesTransfered, setFilesTransfered] = useState(0);
  const isNew = localStorage.getItem("isNew");
  const fetchVisitors = async () => {
    let response = await fetch(`${process.env.REACT_APP_SERVER_API}/visit`, {
      method: "GET",
    });
    let data = await response.json();
    setVisitors(data.NoOfVisitors);
    setFilesTransfered(data.NoOfFilesTransfered);
  };
  const addVisitor = async () => {
    if (!isNew) {
      let response = await fetch(`${process.env.REACT_APP_SERVER_API}/visit`, {
        method: "PUT",
      });
      let data = await response.json();
      setVisitors(data.NoOfVisitors);
      localStorage.setItem("isNew", false);
    }
  };
  useEffect(() => {
    addVisitor();
    fetchVisitors();
    // Listen for the beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user's response to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      // Clear the deferred prompt so it can't be used again
      setDeferredPrompt(null);
    }
  };
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
          <div>
            <span className="visitors me-2">Total Visitors: {visitors} </span>
          </div>
          |
          <div>
            <span className="files-transfered mx-2">
              Total Files Transfered: {filesTransfered}
            </span>
          </div>
          |
          <div
            onClick={() => navigate("/")}
            className="menu-link"
            style={{ cursor: "pointer" }}
          >
            Transfer
          </div>
          <div
            onClick={() => navigate("/receive")}
            className="menu-link"
            style={{ cursor: "pointer" }}
          >
            Receive
          </div>
        </div>
        <div className="menu-buttons" style={{ cursor: "pointer" }}>
          <div className="menu-button" onClick={handleInstallClick}>
            Download
          </div>
        </div>
      </div>
      <svg
        stroke="currentColor"
        fill="currentColor"
        strokeWidth="0"
        viewBox="0 0 512 512"
        className="menu-button-mobile"
        height="35"
        width="35"
        xmlns="http://www.w3.org/2000/svg"
        onClick={() => setMenu(!menu)}
      >
        <path
          fill="none"
          strokeLinecap="round"
          strokeMiterlimit="10"
          strokeWidth="48"
          d="M88 152h336M88 256h336M88 360h336"
        ></path>
      </svg>
      {menu && (
        <div className="container-menu-mobile">
          <div
            onClick={() => {
              navigate("/");
              setMenu(false);
            }}
            className="menu-button-outlined"
            style={{ cursor: "pointer" }}
          >
            Transfer
          </div>
          <div
            onClick={() => {
              navigate("/receive");
              setMenu(false);
            }}
            className="menu-button-outlined"
            style={{ cursor: "pointer" }}
          >
            Receive
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
