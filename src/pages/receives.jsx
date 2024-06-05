import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Receives = () => {
  const navigate = useNavigate();
  const [tempCode, setTempCode] = useState("");
  return (
    <div className="page-receiver">
      <div className="content-top">
        <div className="left">
          <div className="modal-background"></div>
          <div className="container-modal">
            <div className="transfer-receiver">
              <i
                className="bi bi-x-lg icon-close"
                onClick={() => navigate("/")}
              ></i>
              <div className="transfer-receiver-inner Share-code">
                <h3>Enter Share Code</h3>
                <p>
                  Enter the share code you received from the sender to start a
                  secure transfer.
                </p>
                <div className="item-file">
                  <input
                    type="number"
                    value={tempCode}
                    style={{
                      width: "100%",
                      padding: "5px",
                      fontSize: "1rem",
                      textAlign: "center",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                    }}
                    onChange={(e) => setTempCode(e.target.value)}
                    placeholder="Enter a number"
                  />
                </div>
                <div className="spacer"></div>
                <div
                  className="button on-white"
                  onClick={() => navigate(`/receive/${tempCode}`)}
                >
                  Submit
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="right">
          <div className="right-centered">
            <h1>Receiving files with XypherShare</h1>
            <p>
              You are one step away from downloading your file(s). Enter Share
              Code received from sender and submit to open download page.
            </p>
          </div>
        </div>
      </div>
      <div className="content-bottom">
        <div className="container-informative">
          <h2>Tips and tricks</h2>
          <p className="italic">
            In order to use ToffeeShare to its fullest potential we would like
            to give you some tips and tricks. These are based on suggestions and
            questions we received over the last couple of years.
          </p>
          <div className="item-info">
            <div className="container-circle-icon">
              <div className="img-info">🐘</div>
            </div>
            <div className="block-info">
              <h3>Receiving large files? Use Firefox, Chrome or Edge!</h3>
              <p>
                With Firefox, Chrome and Edge we can store the files directly to
                your disk. With other browsers the files may first simply be put
                in your computers memory. This is fine for smaller files, but
                with large files (1GB and up) this may result in unexpected
                behaviour.
              </p>
            </div>
          </div>
          <div className="item-info">
            <div className="container-circle-icon">
              <div className="img-info">📱</div>
            </div>
            <div className="block-info">
              <h3>
                On mobile devices, keep this page open until the transfer is
                complete
              </h3>
              <p>
                On desktop devices (Windows, MacOS, Linux etc.) you can simply
                minimize this browser tab, but doing the same thing on a mobile
                device can result in Android or iOS putting the website to
                sleep.
              </p>
            </div>
          </div>
          <div className="item-info">
            <div className="container-circle-icon">
              <div className="img-info">💻</div>
            </div>
            <div className="block-info">
              <h3>Make sure the sender keeps connected</h3>
              <p>
                The biggest mistake when using ToffeeShare is if the sender
                decides to close the website or turns off the device. Peer to
                peer only works if both sender and receiver are online at the
                same time.
              </p>
            </div>
          </div>
          <div className="item-info">
            <div className="container-circle-icon">
              <div className="img-info">📁</div>
            </div>
            <div className="block-info">
              <h3>Sending folders? Put them in an archive!</h3>
              <p>
                We currently do not support sending folders. Instead you can put
                all of your files in an{" "}
                <a
                  className="link"
                  target="_blank"
                  href="https://www.wikihow.com/Make-a-Zip-File"
                >
                  archive or zip file
                </a>
                . This allows you to transfer complete folder structures and
                will even save on bandwidth.
              </p>
            </div>
          </div>
          <div className="item-info">
            <div className="container-circle-icon">
              <div className="img-info">🐌</div>
            </div>
            <div className="block-info">
              <h3>Transfer speed too slow? Try reconnecting!</h3>
              <p>
                We always try to find the most optimal connection, but sometimes
                we simply fail. If you experience much lower transfer speed than
                you would expect it might help to simply restart the transfer.
              </p>
            </div>
          </div>
          <div className="item-info">
            <div className="container-circle-icon">
              <div className="img-info">📈</div>
            </div>
            <div className="block-info">
              <h3>Keep an eye on your data usage</h3>
              <p>
                If you're on a metered connection make sure you don't make any
                unexpected costs because of high data usage. What some people
                don't know is that uploading may also count towards the total
                amount of data used.
              </p>
            </div>
          </div>
          <div className="item-info">
            <div className="container-circle-icon">
              <div className="img-info">👍</div>
            </div>
            <div className="block-info">
              <h3>Spread the word</h3>
              <p>
                Had a good experience using our tool? Please share your positive
                experience with others and{" "}
              </p>
            </div>
          </div>
          <div className="spacer"></div>
        </div>
        <div className="spacer"></div>
      </div>
      <div className="spacer"></div>
    </div>
  );
};

export default Receives;
