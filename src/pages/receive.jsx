import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const Receive = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  console.log(id);
  const [tempCode, setTempCode] = useState("");
  const [state, setState] = useState(id ? "loading" : "enterCode");
  const [files, setFiles] = useState([]);
  const [socket, setSocket] = useState();
  const pc = useRef();
  let chunks = [];
  let filename = "";
  const sizeReceived = useRef(0);
  const fileSize = useRef(0);
  const filesReceived = useRef(0);
  const [circleStroke, setCircleStroke] = useState(0);
  const [receivedPercentage, setReceivedPercentage] = useState(0);
  if (state === "transfering") {
    let intvalId = setInterval(() => {
      setReceivedPercentage(
        Math.floor((sizeReceived.current / fileSize.current) * 100)
      );
      setCircleStroke((sizeReceived.current / fileSize.current) * 615.752);
      if (
        sizeReceived.current === fileSize.current &&
        filesReceived.current === files.length
      ) {
        setReceivedPercentage(100);
        setCircleStroke(615.752);
        clearInterval(intvalId);
      }
    }, 200);
  }
  const [destination, setDestination] = useState("");
  console.log(state);
  const sizeConverter = (size) => {
    if (size < 1024) {
      return size + " B";
    } else if (size < 1024 * 1024) {
      return (size / 1024).toFixed(2) + " KB";
    } else if (size < 1024 * 1024 * 1024) {
      return (size / (1024 * 1024)).toFixed(2) + " MB";
    } else {
      return (size / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }
  };
  const socketRef = useRef();
  const destinationRef = useRef();
  useEffect(() => {
    socketRef.current = socket;
    destinationRef.current = destination;
  }, [socket, destination]);

  const peerConnection = async () => {
    console.log("peerConnection");
    const configuration = {
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
          ],
        },
      ],
    };
    const pc2 = new RTCPeerConnection(configuration);
    pc2.ondatachannel = (event) => {
      console.log("Data Channel is created");
      let receiveChannel = event.channel;
      console.log("receiveChannel", receiveChannel);

      receiveChannel.onmessage = (event) => {
        if (typeof event.data === "string") {
          if (event.data.split(" ")[0] === "FileName") {
            filename = event.data.slice(9);
            console.log("Filename received", filename);
          }
          if (event.data.split(" ")[0] === "FileSize") {
            fileSize.current = parseInt(event.data.slice(9));
            console.log("fileSize received", fileSize.current);
          }
        }
        if (typeof event.data === "object") {
          chunks.push(event.data);
          sizeReceived.current += event.data.byteLength;
          console.log("Data received", sizeConverter(sizeReceived.current));
          if (
            fileSize.current !== 0 &&
            sizeReceived.current !== 0 &&
            fileSize.current === sizeReceived.current
          ) {
            console.log("Full FIle received");
            let blob = new Blob(chunks);
            let url = URL.createObjectURL(blob);
            let a = document.createElement("a");
            a.href = url;
            a.download = filename; // Set your file name and extension
            a.click();
            filename = "";
            chunks = [];
            sizeReceived.current = 0;
            fileSize.current = 0;
            filesReceived.current++;
          }
        } else {
          console.log("Data received", event.data);
        }
      };

      receiveChannel.onopen = () => {
        console.log("Data Channel is open");
      };
      receiveChannel.onclose = () => {
        console.log("Data Channel is closed");
      };
    };
    // When ICE Candidate is created, send it to Machine 2 via your signaling server
    pc2.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.send(
          JSON.stringify({
            event: "ICE_CANDIDATE",
            destination: destinationRef.current,
            data: event.candidate,
          })
        );
        // send this candidate to Machine 2 via your signaling server
        console.log("candidate : ", JSON.stringify(event.candidate));
      }
    };
    pc2.onicecandidateerror = (event) => {
      console.log("ICE Candidate Error", event);
    };
    pc2.onnegotiationneeded = async () => {
      console.log("Negotiation needed");
    };
    pc.current = pc2;
  };
  const sendAnswer = async (data) => {
    console.log("REMOTE_DESCRIPTION", data);
    console.log("pc2", pc.current);
    pc.current.setRemoteDescription(data);
    console.log("Remote Description set");
    const answer = await pc.current.createAnswer();
    console.log("offer", answer);
    await pc.current.setLocalDescription(answer);
    console.log("Local Description set");
    socketRef.current.send(
      JSON.stringify({
        event: "REMOTE_DESCRIPTION",
        destination: destinationRef.current,
        data: answer,
      })
    );
  };
  useEffect(() => {
    if (id && state !== "enterCode") {
      console.log("Connecting to sender", id, state);
      // Create a WebSocket connection to the server
      const socket = new WebSocket(`${process.env.REACT_APP_SERVER_WSS}`);
      setSocket(socket);
      console.log("Socket", socket);
      // Connection opened
      socket.addEventListener("open", () => {
        socket.send(
          JSON.stringify({ event: "CONNECTION_REQUEST", destination: id })
        );
      });
      // Send a message to the server

      // Listen for messages
      socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        console.log("Message from server ", data);
        switch (data.event) {
          case "CONNECTION_ACCEPT":
            console.log("Connection accepted", data);
            setState("connected");
            setFiles(data.data.files);
            setDestination(data.origin);
            break;
          case "CONNECTION_REQUEST":
            console.log("Connection request", data);
            if (!data.data.success) {
              setState("failed");
            }
            break;
          case "REMOTE_DESCRIPTION":
            sendAnswer(data.data);
            break;
          case "NEGOTIATION":
            console.log("Negotiation", data);
            pc.current.setRemoteDescription(data.data);
            break;
          case "ICE_CANDIDATE":
            console.log("ICE_CANDIDATE", data);
            pc.current.addIceCandidate(data.data);
            console.log("ICE Candidate added");
            break;
          default:
            console.log("Unknown message", data);
        }
      });
    }
  }, []);
  return (
    <div className="page-receiver">
      <div className="content-top">
        <div className="left">
          <div className="modal-background"></div>
          <div className="container-modal">
            <div className="transfer-receiver">
              <i
                className="bi bi-x-lg icon-close"
                onClick={() => navigate(`${id ? "/receive" : "/"}`)}
              ></i>
              {state === "loading" && (
                <div className="loader">
                  <div className="spacer"></div>
                  <div className="lds-roller">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                  <div className="spacer"></div>
                  <div>
                    <h4>Connecting to sender</h4>
                    <p>Trying to establish a connection with the sender</p>
                  </div>
                </div>
              )}
              {state === "failed" && (
                <div className="transfer-receiver-inner-failed">
                  <div className="spacer"></div>
                  <h4>Sender has stopped sharing</h4>
                  <p>
                    The sender has either closed this transfer or is now
                    offline. Please check if the sender has an active internet
                    connection or ask for a new link.
                  </p>
                </div>
              )}
              {state === "enterCode" && (
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
              )}

              {state === "connected" && (
                <div className="transfer-receiver-inner">
                  <div className="container-files">
                    {files?.map((file) => (
                      <div className="item-file">
                        <div className="container-name">
                          <span className="filename">{file.name}</span>
                        </div>
                        <span className="filesize">
                          {sizeConverter(file.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="spacer"></div>
                  <a
                    className="button on-white"
                    onClick={() => {
                      socket.send(
                        JSON.stringify({
                          event: "TRANSFER_START",
                          destination: destination,
                        })
                      );
                      peerConnection();
                      setState("transfering");
                    }}
                  >
                    Download
                  </a>
                </div>
              )}
              {state === "transfering" && (
                <div className="container-progress">
                  <div className="container-progress-circle">
                    <svg viewBox="0 0 200 200" className="progress-ring">
                      <circle
                        className="progress-ring--outline"
                        stroke="#333"
                        strokeWidth="3"
                        fill="transparent"
                        r="98"
                        cx="100"
                        cy="100"
                      ></circle>
                      <circle
                        className="progress-ring--circle"
                        stroke="#e4631e"
                        strokeWidth="3"
                        fill="transparent"
                        r="98"
                        cx="100"
                        cy="100"
                        style={{
                          strokeDasharray: `${circleStroke}, 615.752`,
                          strokeDashoffset: "0",
                        }}
                      ></circle>
                      <text
                        fill="#fff"
                        fontSize="32"
                        x="50%"
                        y="45%"
                        dominantBaseline="middle"
                        textAnchor="middle"
                      >
                        {receivedPercentage?receivedPercentage:0}%
                      </text>
                      <text
                        fill="#fff"
                        fontSize="15"
                        fontWeight="300"
                        x="47%"
                        y="58%"
                        dominantBaseline="middle"
                        textAnchor="middle"
                      >
                        Finished
                      </text>
                      <text
                        fill="#fff"
                        fontSize="10"
                        x="47%"
                        y="64%"
                        dominantBaseline="middle"
                        textAnchor="middle"
                      ></text>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="right">
          <div className="right-centered">
            <h1>Receiving files with QuickShare</h1>
            {state !== "enterCode" ? (
              <p>
                You are about to start a secure transfer with ToffeeShare,
                directly from the sender. Click download to start receiving the
                file(s).
              </p>
            ) : (
              <p>
                You are one step away from downloading your file(s). Enter Share
                Code received from sender and submit to open download page.
              </p>
            )}
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

export default Receive;
