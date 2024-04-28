import React, { useEffect, useRef, useState } from "react";
import qr from "qrcode";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
const Home = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [socket, setSocket] = useState();
  const [destination, setDestination] = useState("");
  const pc = useRef();
  const input = useRef();
  let dataSent = 0;
  const dataChannel = useRef();
  const [sendFiles, setSendFile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  console.log("socket", socket);
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
  const totalSize = (files) => {
    let size = 0;
    for (let i = 0; i < files.length; i++) {
      size += files[i].size;
    }
    return sizeConverter(size);
  };

  const createQRCode = (code) => {
    const newcode = `${process.env.REACT_APP_API}/receive/${code}`;
    qr.toDataURL(newcode, (err, url) => {
      if (err) {
        console.error("Error generating QR code:", err);
      } else {
        setQRCodeImage(url);
        console.log("QR code generated:", url);
      }
    });
  };
  const [shareCode, setShareCode] = useState();
  const [qrCodeImage, setQRCodeImage] = useState();
  const socketRef = useRef();
  const destinationRef = useRef();
  useEffect(() => {
    socketRef.current = socket;
    destinationRef.current = destination;
  }, [socket, destination]);
  const sendArrayBuffer = async (arrayBuffer, byteLength) => {
    console.log("sendArrayBuffer", arrayBuffer, byteLength);
    let chunkSize = 16384;
    const sendChunk = async (chunk) => {
      if (dataChannel.current.bufferedAmount < 16750000) {
        console.log("sendChunk", dataChannel.current.bufferedAmount);
        dataChannel.current.send(chunk);
        dataSent += chunk.byteLength;
        console.log("dataSent", dataSent, sizeConverter(dataSent));
      } else {
        setTimeout(() => {
          console.log(
            "set time out bufferred : ",
            dataChannel.current.bufferedAmount
          );
          sendChunk(chunk);
        }, 500);
      }
    };
    for (let i = 0; i < byteLength; i += chunkSize) {
      let end = Math.min(i + chunkSize, byteLength);
      let chunk = arrayBuffer.slice(i, end);
      await sendChunk(chunk);
    }
    if (dataSent === byteLength) {
      console.log("File sent successfully");
    }
  };
  const sendFile = async (file) => {
    if (dataChannel.current.readyState !== "open") {
      console.log("Data channel not open");
      return;
    }
    dataChannel.current.send("hello world");
    console.log("sendFile", file);
    let reader = new FileReader();

    reader.onload = function (event) {
      let arrayBuffer = event.target.result;
      let byteLength = arrayBuffer.byteLength;

      // Send the file name first
      dataChannel.current.send("FileName " + file.name);
      dataChannel.current.send("FileSize " + byteLength);

      // Then send the file data in chunks
      sendArrayBuffer(arrayBuffer, byteLength);
    };

    reader.readAsArrayBuffer(file);
  };
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
    const pc1 = new RTCPeerConnection(configuration);
    dataChannel.current = pc1.createDataChannel("file");
    dataChannel.current.onopen = function () {
      console.log("Data channel is open", dataChannel.current);
      setIsOpen(true);
    };
    console.log("pc1", pc1);
    const offer = await pc1.createOffer();
    console.log("offer", offer);
    // await pc1.setLocalDescription(offer);
    await pc1.setLocalDescription(offer);
    console.log("kdnvsocket", socketRef.current);
    socketRef.current?.send(
      JSON.stringify({
        event: "REMOTE_DESCRIPTION",
        destination: destinationRef.current,
        data: offer,
      })
    );

    // Set the local description with the created offer
    // When ICE Candidate is created, send it to Machine 2 via your signaling server
    pc1.onicecandidate = (event) => {
      console.log("onicecandidate", event);
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
    pc1.onicecandidateerror = (event) => {
      console.log("onicecandidateerror", event);
    };
    pc1.onnegotiationneeded = async () => {
      console.log("Negotiation needed");
      const offer = pc1.localDescription;
      socketRef.current?.send(
        JSON.stringify({
          event: "NEGOTIATION",
          destination: destinationRef.current,
          data: offer,
        })
      );
      console.log("Negotiation send");
    };
    pc.current = pc1;
  };
  console.log("sendFiles", sendFiles, dataChannel?.current?.readyState);
  useEffect(() => {
    console.log("sendFiles", sendFiles, dataChannel?.current?.readyState);
    if (sendFiles && dataChannel?.current?.readyState === "open") {
      for (let i = 0; i < files.length; i++) {
        sendFile(files[i]);
      }
    }
  }, [isOpen, sendFiles, dataChannel?.current?.readyState]);
  useEffect(() => {
    //create a new WebSocket connection
    if (files.length === 0) return;
    const socket = new WebSocket(`${process.env.REACT_APP_SERVER_WSS}`);

    setSocket(socket);
    // Connection opened
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ event: "REQUIST_SHARE_CODE" }));
    });
    // Send a message to the server

    // Listen for messages
    socket.addEventListener("message", (event) => {
      console.log("Message from server: ", event.data);
      const data = JSON.parse(event.data);
      switch (data.event) {
        case "SHARE_CODE":
          console.log("Share Code: ", data.data);
          setShareCode(data.data);
          // Create a QR code for the received code

          // Call the createQRCode function with the received share code
          createQRCode(data.data);
          break;
        case "CONNECTION_REQUEST":
          console.log("Connection Request: ", data.origin);
          let newFiles = [];
          for (let i = 0; i < files.length; i++) {
            newFiles.push({
              name: files[i].name,
              size: files[i].size,
            });
          }
          socket.send(
            JSON.stringify({
              event: "CONNECTION_ACCEPT",
              destination: data.origin,
              data: {
                files: [...newFiles],
              },
            })
          );
          setDestination(data.origin);
          break;
        case "CONNECTION_ACCEPT":
          console.log("Connection Accept: ", data.data);
          break;
        case "TRANSFER_START":
          console.log("transfer start", data);
          peerConnection();
          setSendFile(true);
          break;
        case "REMOTE_DESCRIPTION":
          console.log("REMOTE_DESCRIPTION", data);
          pc.current.setRemoteDescription(data.data);
          console.log("pc", pc.current);
          console.log("Remote Description set");
          break;
        case "ICE_CANDIDATE":
          console.log("ICE_CANDIDATE", data);
          pc.current.addIceCandidate(data.data);
          console.log("ICE Candidate added");
          console.log("pc", pc.current);
          break;
        default:
          console.log("Unknown event: ", data.event);
      }
    });
    // Connection closed
    socket.addEventListener("close", (event) => {
      console.log("Connection closed", event);
    });
    // Connection error
    socket.addEventListener("error", (event) => {
      console.log("Error: ", event);
    });
  }, [files]);
  return (
    <div>
      <div className="container-main">
        <div className="page-sender">
          <div className="content-top">
            <div className="left">
              {files.length === 0 && (
                <div className="select-files-mobile">
                  <a
                    className="button on-dark"
                    onClick={() => input.current.click()}
                  >
                    Select files
                  </a>
                  <div className="spacer"></div>
                </div>
              )}
              <div></div>
              <div
                className={`modal-background ${
                  files.length === 0
                    ? "select-files-desktop"
                    : "container-modal-sender"
                } `}
              ></div>
              <div
                className={`container-modal ${
                  files.length === 0
                    ? "select-files-desktop"
                    : "container-modal-sender"
                } `}
              >
                {files.length === 0 && (
                  <div className="transfer-select-files">
                    <div className="spacer"></div>
                    <div
                      className="container-file-drop"
                      onClick={() => input.current.click()}
                    >
                      <input
                        ref={input}
                        className="fileInput"
                        type="file"
                        readOnly
                        multiple
                        onChange={(e) => setFiles([...e.target.files])}
                        style={{ display: "none" }}
                      />
                      <span className="plus">+</span>
                      <span className="drop-them-here">
                        Click to browse or drag files here to start sharing
                      </span>
                    </div>
                  </div>
                )}
                {files.length > 0 && !shareCode && (
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
                {files.length > 0 && shareCode && (
                  <div className="transfer-sender">
                    <div>
                      <div className="transfer-sender-inner">
                        <i
                          className="bi bi-x-lg icon-close"
                          onClick={() => navigate("/")}
                        ></i>
                        <div className="spacer"></div>
                        <div className="container-files">
                          <div className="item-file">
                            <div className="container-name">
                              <span className="filename">
                                {files.length === 1
                                  ? files[0].name
                                  : `Multiple Files (${files.length})`}
                              </span>
                            </div>
                            <span className="filesize">{totalSize(files)}</span>
                          </div>
                        </div>
                        <div className="container-share-url">
                          <input
                            type="text"
                            id="share-url"
                            readonly=""
                            value={`${process.env.REACT_APP_API}/receive/${shareCode}`}
                            fdprocessedid="ikadmv"
                            onClick={(e) => {
                              e.target.select();
                              navigator.clipboard.writeText(e.target.value);
                              toast.success("Link copied to clipboard");
                            }}
                          />
                        </div>
                        <div className="container-desktop">
                          <div className="container-qr" id="qrcode">
                            <img
                              src={qrCodeImage}
                              alt="QR Code"
                              style={{ height: "125px", width: "125px" }}
                            />
                          </div>
                          <div class="share-buttons w-100">
                            <div
                              class="button-social whatsapp"
                              onClick={() =>
                                window.open(
                                  `https://web.whatsapp.com/send?text=http://localhost:3000/receive/${shareCode}`,
                                  "_blank"
                                )
                              }
                            >
                              <img
                                class="image-share"
                                src="data:image/png;base64,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"
                              ></img>
                            </div>
                            <div
                              class="button-social facebook"
                              onClick={() =>
                                window.open(
                                  `https://www.facebook.com/sharer/sharer.php?mode=message&u=https://toffeeshare.com/${shareCode}`,
                                  "_blank"
                                )
                              }
                            >
                              <img
                                class="image-share"
                                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjRCNzIwQkIyOEVEQTExRTU5MDk4QjUyMThCRUU1RDIxIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjRCNzIwQkIzOEVEQTExRTU5MDk4QjUyMThCRUU1RDIxIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NEI3MjBCQjA4RURBMTFFNTkwOThCNTIxOEJFRTVEMjEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6NEI3MjBCQjE4RURBMTFFNTkwOThCNTIxOEJFRTVEMjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5XeVJ2AAAEeUlEQVR42uxbTUwTQRR+LVXQ1qJghETlJ2gh+H/AiDEeDB4QEw/GAxesxANC1AsnE08mnrioQTkYRS/EgyGcjLGJoTeJf4mhQRIURRGVqkBboVLxPXiFUrbtAp1lt+NLvkzSbnfn++bNzHvbNyYQbCcvPcnH5jCiFFGCcCCyETaElS/zI3wIL6IX0YPwINwPrx79ILJ/JgGETUy4GlGBKFrmLfsQLkQbCzKlSwGQ+EZsGhBORIGgAetHtCKaUYhhXQiAxHOxaUTURbi0aKMp04JoQiGGVkQAJJ7GI34FYYeVsVHEZfaIkGYCIPld2NxD7AN92CvEaRThzWJ/aF4C+bPYdOmIPHBfurhvYjwAb74am1uIWtC33UGcQ28IJk0AJL8Wmw7e1oxgtG2eQBECyxaAyT/ivd1I5kZUJhLBrMLtOwxIHrjPHcxhyYvgLQO5vZJVMIfFC8Arai0Y32rj7Q6mOPs8bXUZkBo2jtivFCeYFMhbdLjPJytYIhEmE02B+hQkHw6W6uN6ACc2b7WI7fdsy4Jj5XlQkp8J1jWrpj8Lhabgd3ASfo0FYehHAJ51f4enLweTnTsURyZQlqgLGkWTN6HkzmMOqDqYt+C7tDQT2FAMwpZNVhjxBZMtgJ05Ni6YApzP14ke+SocdSXySjbw1S+iC3XMdcEa0CA6n08zm+DUkULV1w9884nohpW5zgnAr7Gcoke/aLN9dr6rsY9iPIDMyZxn1wAKGwtEC5CTtSbmd09fDMKT55/BF/gD69elQ36ODX6OTYjqSgFz7gwLUK3FPpRpVQ7LvSMTcLPdA1P8unNwOACe9z9Fd4c4d5ojYuYVs7FAcJa8xnkCmPm9fRHIZ0XE3WzQVDdpKTOtATtEPqF85ybIts/kVKWFG5SjE1wbjivEBo+7PsGfyb8iu1dKAhSLfELlga0xiYcty54OziqHogCCrYSmgEOPvjkRDIkefTIHCZCtRwFG/EEtHpNNAtj0KMAYBkQamM0iOv5vd/djRvdlJgXengWHducuuGZ4ZBweuN7N++yXb0ILAawW4a9her1zT8uwKApA4W+S017VRlPAD/KanwTwSSyAjwTwSiyAlwTolViAXhKgR2IBekgAj8QCeEgAt8QCuM1ch9cnIfk+4h5+I+SSUABXOBAia5NQgLZIAWgd6JeIfH947ZsWgMtPWyUSoDVcchv5z1CzJHmBn7nCPAG49rZFAgFaIuuMo+sDmmDmL+RUtVHmOGtKFSIXsLmWogJcxNG/Hv0+INpuIl6nIPnXzA3iCsA1NDUwU1iUKkZcaqLrg2J5AHA11fkUEuB8rEryuKWyuB5Q4fEZg5O/i+Rj1jsmqhStM3ie4IIEZT//i6UT3YVvUGkwT3CpIa9KgAgRqmg+GWHOU1/VkFc1BRSmBBUe3wD91RGP82p/ezE/Ws6hqfuIvToKcmo0OTQVESeUUWi5wrnDKPehbCnkl+wBUd4g58FJBSHkPDqrIISch6fjCBI+Pk/FWFSPpOb4PJXsd4MGx+f/CTAAplh1BUxRGEIAAAAASUVORK5CYII="
                              ></img>
                            </div>
                            <div
                              class="button-social email"
                              onClick={() =>
                                window.open(
                                  `mailto:?Subject&body=/receive/${shareCode}`,
                                  "_blank"
                                )
                              }
                            >
                              <img
                                class="image-share"
                                src="data:image/png;base64,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"
                              ></img>
                            </div>
                            <div
                              class="button-social gmail"
                              onClick={() =>
                                window.open(
                                  `https://mail.google.com/mail/?view=cm&source=mailto&body=https://toffeeshare.com/receive/${shareCode}`,
                                  "_blank"
                                )
                              }
                            >
                              <img
                                class="image-share"
                                src="data:image/png;base64,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"
                              ></img>
                            </div>
                            <div
                              class="button-social linkdin"
                              onClick={() =>
                                window.open(
                                  `https://www.linkedin.com/sharing/share-offsite/?url=https://toffeshare.com/receive/${shareCode}`,
                                  "_blank"
                                )
                              }
                            >
                              <img
                                class="image-share"
                                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAPfXpUWHRSYXcgcHJvZmlsZSB0eXBlIGV4aWYAAHjarZlpciOxjoT/8xRzhOIK8jhcI94N5vjzgSzLklt2d78eOyzJpRIXIJGZoMz83/8s8z/8hJyzCVFyKild/IQSiqu8yNf5KfvRXmE/7p9wv8X/L9fN4w3HJc+zP/9Kve+vXI+fH/iYw7bX6ybf77h8D2QfA+8frzPr6/G8SK67c93eKzFlnhepZHlearsH6h9Lzp9/4bGse7v8b14uCFEakYm8c9Nbf/Ho/L0Cf/4q1y2PvOY+6+O+Usx++lgJAXnZ3sfzdT0H6CXIH6/M1+g/Xn0Jvqv3df8llumOES/evmHjl+v+MY17ntg/VuRe35jW2l+2c/+tNfJa8+yuhkRE042oHWz7MQw3NkLu98cSv8Jf5LXs38JvvurVSfm4+tX47bZYR1aWscEOW+2ycz9321licNMJz8515/e17MUV173mKeivXU588cNn8tfdNN5z2T3WYve8Zc/XbWbmYbnVWQazfOTbX/PTm3/za9bqGiJ75UesWJdTXLMMzZw+chcJsevOW9wB/vi903894QeoksG4w5zZYL3aGaJF+4ktv/PsuS/yfErIGhn3AISIuSOLoQSCvRLot8le4pxYSxwzCaqs3PngGhmwMbrBIl3wPjkjLjudm8+I3fe66JLTy3ATiYg+eSE3xVeSFUIEPxIyGKrRxxBjTFFiNrHEmnwKKaaUJCnJVfESJEoSkSxFavY55JhTFqiw5Fpc8XBgLKlIyaWUWp2pTFQZq3J/5UpzzbfQYktNWm6l1Q58euixpy4999LrcMMPaGKkISOPMuq0ZsIUM8w405SZZ5l1gbXlV1hxpSUrr7LqI2t3Vn/5/Yus2TtrbmdK75NH1rhqRD6GsEonUXNGxlywZFw0AwDaac6ubENwmjnN2VUcRREdi4yaGzOsZowUhmldXPaRu8/M/VHeTMx/lDf3u8wZTd3/R+YMqfs1b2+yNlTn+s7YqUKN6eWpvplSBke5rjr8tMHxX64qcO+fyZIPLUQVMh6+PpvXC+Qss0nU8qp7hB+eW6uyWFFvYXVvWE90Xy5yLfQ1rU+8XkoyNtS9MLTr1xGv0ofFRKjs6pL++2dNqSFfH6EozuXWe18+d2kRrMxu5cyM5Mc4Bgucscq0a6Ranq+YfSnJukpLECEgqXFPFG3Ob4L6h8H+++caZiqEyly/Bvq/Cr55zau4OidBQgFdy6O6NqwE/XCO+ph4zy9EzzafEq/iaL70KcuMtlKduaZFkQHuQZxKw9OsFfQfHFaJYnuzKyQ3h6wOs2T+KROKnaHOEducRm/1vieWw1JiWarcVHexexPM76WPsYek4BJT5L22zIbFljhsmNSiYfXod5dYcwQJDG9jPmWBvv+2cB7P5t0bl+yU/Iibr7AxP+NGqidr1/DCUmGAttoYrUkvJJEYz8UFKR1iI4jc2fpqUQj7mnNpxJ20KX7JbFnFINXMx1ck38P1SqAkMjqryn0Fp+knRlMIXLa2wIdSoZ/VY6k6bhJ1VjJmklLQgQwP9zRgKe6rV2osZeJqeM+s5imt5PudatfacrN4iHgwoVYePATCsiS9o46Bw9l7j1MXO0/pmn+o/SiKVQaHt5fJe+fx5eK+VsrqLg1eT5xbLrZsxntPSTOb1t2oewiyqK+GJfLLN1JLpY3Gvom/ny32OWwkEA7YFY2iq3Xi8MP0rRo/i6rGXC3tGIwxO59mGWTXxzTbTFbFhGCS0eIlzS7SY6qhTGepPbtmbgYOW8OzLaakLnxvjnzJLtG4pEze7WMWHalX1orGeCo1VhXTlfRDe6CZFpltCtc0yJ5lvkFer6liNAelubGl+Vs24WSZOUctJz51DWRzXLOJASECwQrlTWpTcyyt38U2q8/XH1ab+f4GmKl0Vpi+lBqS+KbYwNFvaFpCw15wP1l00S+4DaZaLH2Uk1o3VmuGJCyAz0vlFwA9aQMuIWgJLlo3uSYqxk/SHWqBM12eenVdgTjY6PKIhuBn9QKejwalUXwReQyyB9AlkPf63fUVsxJaWtUsyJPMIWCLPNJijFLgZ3LVNwRKmeHMDgEswl/2VccT5hEbVsfMZQ2TxwyyKtxKjZPneW0w+9F1q/joOK0A3f1xgYZb2kMRGRj7Wrht9h0m9tiDA9dlMiWgd5O+auBkIPQ8PcI0BpAA3EstVTtMnnA+HdDw0Da2lEYi5EfEYLKVwawIf5QIEkOxEDxUafhKCufVZ+iNZRFjlLEql41VFaKa/s4yNtNk/WxQZUwYv/X2epwNXABibFjdEjpW5jbaLDhw4hz0HyoVduwLI0Yx0OuxJUWGI4hkDBRCDUr+WQu7KdM1TSNgCaZymWEpb8FQE4mdXjzkTJvl4Q6Int3ndXWKTBYsr0pAHU8haE31tiSjhQo/aKGSj+kXzOYKBnJr/0XzRBYaxrdoegp1TmbxmbS4FTYh7EwOCZp1UvAq5BAcOj4xrrSkUMXmc+60qkUUFpJrlX+6WhB4smWUFkHHbKDJ4KmWQF+ArEt3DcoqalO1uNSX7JDv8M82oEwtJWhvNMC7uglDDteAiHnYZgNiqHbT17cRkLSaIJjqQXTzQbJLzQIGslRQQKiPgQZyIwosexDNtjY/K6xD7q3AiHQWdeXA525u55E9sM3ej2DQ+Cn9obqVAsM4Fg/XUDngXPLInfGDal6QuesdcZNSx1G1aqd90I75Y5dHeyHd7uEKOq0HBVssSCdBiuaVftSTKQtBPy5RqWhK1LIa5KtslWm6OhLu/Yhpk+nSlDSoFmVbCMxS9d1DKZ8mVEJCXWTfjpM1pHK0cIQ9qbCvXQkR3pmSTFLc7gXD9bvch6InKZ7HXrzyKSQWJUcKAKm4lMGcvT2lIiylauYgoirS2BzLyEyJYVzAkbhuJpeMKbFXp2WkQCe8XPmfpn/rFRmi2KSZxf0rN7tT31OpAcZzIzfRIlfH0fd2cJKbizKJ9RZug5y0lJulsbXLGt96OVbTuqzlQSHpVthpp5wrlATnFK0nYukpDsfURHVvjU30Emg9p6FRVfKrUO1Clgl9wzGzYC07xluBZhGLxlopASGZeIUKSVW6UuwulaTyPIyebwSiwLXKzpT8Mc9r3qTlwf26bjHfHOGoNIjEVcbYt+MjMItmQCo0qktYy4Q6MdpU2VAmpW3IhE1ly1EoOQj98/rQ85Fh90+jZH7TJq54KZPvcGuI26m0FjUGrC14lIRS7ZgI8KK2jEVA7Wyk6S1xleqbqvHSA+CsjYNLUu86Wx4IpEuxtY7qmhmpiQkfU9vwxyw/6Jhs5oFlyYTv8DZccTIeCbalfXgFrMJVUYvrpiaJ3u5Peg86I6NulWpFW5JdETivPo16eK/qMphiniqEsqrjBuvpKDetNC2StjASUbswhbCScgfcTJd6XQb9pnVBU9RCZhwAlRq8Y0ghRYwwL+2+UATcv6eNSDP33Qc7rUoiMyd8jGRj7HEHLTStGBJQ1D5owYDvTJUmZpraeQCSHUpUDzjNrEtviMAgA6vtfq1fULl3iA5ltiftByvL02nkebXpIryi4xBmcKmKN47ikTkYthmivJTW7Hrhoh1lcRgekK5kUFkXJVVczeXk6TaJK1zLfdOvvXt+wt4z9KC3A1rzHrUFLVRZcNT9TJmGmcoe7B9F7zBibYeqOiUVM2RjzXfga/UB21fMbk5ZpBeeAQlNzT6CptYvBrGwDhDRQ9mSNzl7tXa1Ie5tYKlI1aKbeaFeQKH95TbmC2JDKilkBhSGPwDppCZnbQnDstf2ZSe7hD3Cs7KLLeftF7aIo2trEEhHDKa2lozG/OCQm/iHVv9WQ1Lt6bpgd2035hOeqgqSmK7RdscVsTPUeuHcRQ9OpSdNPDj0CTvc9d1tPvai9YiN3pMmUjPpNyA/i9+2HSs/NVbbIW0pUyE70dJNHslhhQ3L0WWPf0s2iMZj5X+Rb/Os3/8i3+ZZv/9Fvs2zfr+R7xtC++sxBawcq6ry+6rf5okPVb3lVb1J5Fv93sUx3XVqQgnHHCqjc3hF3429ivFFkdYeSzsIRE6LA3KLN7nRMyeacbN2RbdjOPWmsR0CyH2PPeu9U8IjHHlVSFYOdmn8zskCjk6TassGkaZV1nNAP4pODlvsTT0XuTlB031e2oor/4nPVJ9Ok24YD9p4+e5w9RzvGSzz9dQBv55I+p9Olm5MbkQikNtTvkfkUz/7FpEvdtK8xyPcqohMpz3/gshPPD7MpEq2O1T+gsivePxKaV/RqAN92sk3ePwdGstZveqqeYfGBxc+8KhF8zMiTftE5L/gUcxbPL4ntYNGxeKOlwoYSLyBaA4S1Zz8BRZ/PWju5s0582+O+Cf2DYHBVtJ6AWQ9ysgRGilYkXT3XVgxHKoej93Nc52ih/h4bM9iEZvkadyji0Eb+AvEZGyG0kjEkyDe+xyk0+UtdSK88e460kHECT+FcJ3jk7JPXmOu5vOEZe6T5xb1KOU6Mo6xWoMW3ZbaZ9Pucu2TFHpxSiphmzzV0nnMBqwkyjKCowt3QR/fo2Ue/LVUOtdYelWLDgwTOizHwzZ7GGxlgLaPZ+hp6fTp3a0WMfINYPIkW4wZqmUGWgW8pTarIerpX7uXfj0tnqUfOYIlfn3rfgc0A9FMqwzO9rEH42JOXI+CLcXO7ZN7821g1UPsc049UWltFEyfRpcOyur5VtQ2whV8KNQBsrnflhh7hNVqK3RQDVY5BBab7T2yGR3QqkozIEbR3nYVM+LZLnB0w6hC5HO+EIacvj6SSZowH70eFdFK4NApeLLcQG4R1x0Z0hNSp4dvSd2cCVZ1Ne104zQeb3y5TjTIgH9GECFIJTmaLQqfYAMM8jq2ySMgPZ+Gk6z6DZWN+LX7QGKlq9hpJUAEx+Xo6dqdL0bPepmmqNNsh+PpLN2X028Q8zjo/jj8fr5G9T+ffpczDjaNpEz9mlJPrhYGXU97RtNvZDPds0uYKFd8KDDcmdIb9+ffofz4bH59A8WIBDkVtY1QQStT/e2eubhQBrTILhwcuQ+G9yadQXAudY6hfl68r+lB31XqsfHfHA3H2JSmm1MVgX74K3MBMprn/e1baVErLRX60fjx9WFx338zYf7uKwz6b6+txzmgA54Ujt2FYyZdIQ2TajlzEv5Q+yAMRb97jhDqR3ueQv7paynz1jz83deZVE5sOP8WVID0q6cuCR9OfJBZVsf6op5L7AUF/8N3yTU1k9mu89Dt0CqgD6s5lRYGfYn9OAc5X9T2H78dMC8JfweCCFvkcJ+o9RDUyBVMw/8BrmGCeBuH5gcAAAGFaUNDUElDQyBwcm9maWxlAAAokX2RPUjDQBzFX1OlolURM4g4ZKhOFkRFxEmrUIQKoVZo1cF89AuaNCQpLo6Ca8HBj8Wqg4uzrg6ugiD4AeLk6KToIiX+Lym0iPHguB/v7j3u3gFcraRoVtsYoOm2mYzHhHRmVQi9ogs8etCHGUmxjDlRTMB3fN0jwNa7KMvyP/fn6FazlgIEBOJZxTBt4g3iqU3bYLxPzCsFSSU+Jx416YLEj0yXPX5jnHeZY5m8mUrOE/PEQr6F5RZWCqZGPEkcUTWd8rm0xyrjLcZaqaI07sleGM7qK8tMpzmEOBaxBBECZFRQRAk2orTqpFhI0n7Mxz/o+kVyyeQqQiHHAsrQILl+sD/43a2Vmxj3ksIxoP3FcT6GgdAuUK86zvex49RPgOAzcKU3/eUaMP1JerWpRY6A3m3g4rqpyXvA5Q4w8GRIpuRKQZpcLge8n9E3ZYD+W6BzzeutsY/TByBFXSVugINDYCRP2es+7+5o7e3fM43+fgCV4XK1nJj/vgAAAAZiS0dEAPkA8wDmQowDlwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+QLFA4TDxJkc+QAAAYLSURBVHja5ZttbBRFGMd/t722tNc3CpW2Sks/UESlCgitCiLSaOKCppYQE3kJKKQhqBDRTQhqYiSyMeGDgoIBhIKGYBBiWUyMIlGRN8WiUG2LVqC22BdaaA/KXe/OD7u1rb297t31yl7vn9yXm51n9v/fZ2aemXnGQqghKSnAVOA+YBwwFkgCMgCb9pQdqAeuAtVAJXAGOIEsXg3l61lCRHoCUAyIwOQg2vEAp4BDwKfIYoV5BZCUeGABUKJ97VDgNLAF2IUs3jCHAJJiA14AVgMjGBw0Au8Am5DF67dOAElZAKwHMrk1qAUkZPGTwRVAUrKAbUAh5sCXwHPIYm3oBZCUp4CdQDLmQguwEFk86E8lwU/ybwIHTEgeYDhQhqS8NvAeIClRmssvIjywHViKLLqDF0AlvweYS3hhDzAfWXQF2wW2hyF5gGeAD4MbAyTlLWAh4YslSMobgXUBSSkCPmNo4Elkscy4AJIyRluMJA0RAVqBPGTxktEusM0f8okWC8uyEpmVEmtWAVI0TgY8QFKW6D3cZ+IVLOx9ejzT8+4gNsYKwN9NbbxXdha5ssWMQixEFnfpCyApidp6fJQRa4fn3c3MSdl9/u9wdDL/3W/Z19RhNgHqgHHIYrteF1hllHymVWBa3mivZcNirDw/fYwZPSATWOF9DJCUBGClUUtFoxOIturPomnJcWYdD1Zrexd9PGCxFk8bwqHadlxu/Uiz1X7TrAKM6BnS9xSgxB8rNU43JyvqvZY5Ol3s+P6CmafFkt4CSMr9wF3+Wlm69ywnKupwuz3dWzWt11m/5yd219vNLEAeknIvgFX7ozgQK+ccLgpKy3kksYKCTBuNdifba9vxhEdwVAyc6RJgTjCWjrQ5OFLpCLfocA7wugVJGQVcNtvbLctKJD9nOElx0bjcHi422dlfeYVjdudANjPSCjwQaO2GNTOJtUZ5LTvwXTWLvukeCLfNyGLujFyvz45b9zWXXR4EC+yalcNjU7IZmRzf57lVbje/nm9gwxeVAzXGFFgJYg8/KT5GV4C4mKg+MXdSfIzXZx9Pt1Fvd7J50WRyMlJ027MKAhNz09mak0be/nJePf1PsAJMFlCPqkKOG079jZnxt9nYsTTfJ/meiI2OYlXxRF4ZOzzY18odNAGaffTdktn3kDEiwS971iiBl4smIFiCFyBtMARw+PCAZFtgy+hRqQlsmBrUmUyq1ejiJ1h43Maig9b2DqouNtPp8nB7WiLZ6b534B/Ny4QTdYG+VroViDbL1HfqtzrmffwLf3V2rzF2F+bwbOF43TpjMlOCaTJWMAv52oZrzCwt70UeYP5XNVRebNbfjYqL4aHEmIDbFQCnGQQoO16DXaeXHD1X77PutAxboM3eFFCPmm85qhv0A5uqy20+60YFPhM0CkCDGQRwdLp9zCDuUDXbJAB/mn3V4gzd8rJaAKqIXJwXgPIIFqBcAI5FsADHBGSxDvUsINJQiSzWdwVCZREoQFlXIARD5xTYH+zvFkAWjwJ/RBD5amTxh54eAGoGZqRgS8+1QBe2Am0RQL4NNe3nfwLIYgvwQQQI8L7GtY8HALyNmk0xVNGCmtr7H6y9imWxFUlZC2w0Yq2usY1YnRPiK+29D0evdXRS13hN11a7w+WjzHfdtpsuowKsRRZ7fWBvGSIWLTrMH2Jf/zhYHkR+wuNbAFWEXOBnIH6IkLcDE5HFPhGvd/+VxSpg+RD6+su9kdcXQBVhp9GxwOTYiCyW6hX2tym6MszXCZ/TT9qPkWTpYZoIhWFG/jAwu7+7Rf1vi8tiB+pZejh5QpkR8sYE6BahCNgUBuQ3AUVGb5UFcmVmsTY4mm2KvA6sQBY/8qdSoJem7gRKgSkmIf8jsABZ/N3fioEdjakNFQAvol53vVW4CrwE5AdCPnAP6O0NqcAa1Nw72yC6+2ZgHbJ4JRhDA3l1NhVYpgmRHSLil7TNjM3IYvNAGBz4y9PqYuph1Dy82UBOkBYvAAeBfcARZHFAz4ksIXdWSclGzUSbBOQCWdovie7cBKfWny9phKtQL0qfRBZrQvl6/wIHybZ/SQm6JQAAAABJRU5ErkJggg=="
                              ></img>
                            </div>
                            {/* <div
                              class="button-social twitter"
                              onClick={() =>
                                window.open(
                                  `https://www.linkedin.com/sharing/share-offsite/?url=https://toffeeshare.com/c/H8dC6t8QTRreceive/${shareCode}`,
                                  "_blank"
                                )
                              }
                            >
                              <img
                                class="image-share"
                                src="data:image/png;base64,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"
                              ></img>
                            </div> */}
                          </div>
                        </div>
                        <div className="spacer"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="right">
              {files.length === 0 && (
                <div className="right-centered">
                  <h1>Share files directly from your device to anywhere</h1>
                  <p className="description">
                    Send files of any size directly from your device without
                    ever storing anything online.
                  </p>
                  <div className="features">
                    <div className="features-left">
                      <div className="feature">
                        <svg
                          stroke="currentColor"
                          fill="currentColor"
                          strokeWidth="0"
                          viewBox="0 0 512 512"
                          height="1em"
                          width="1em"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fill="none"
                            strokeLinecap="round"
                            strokeMiterlimit="10"
                            strokeWidth="32"
                            d="M256 256s-48-96-126-96c-54.12 0-98 43-98 96s43.88 96 98 96c37.51 0 71-22.41 94-48m32-48s48 96 126 96c54.12 0 98-43 98-96s-43.88-96-98-96c-37.51 0-71 22.41-94 48"
                          ></path>
                        </svg>
                        <span>No file size limit</span>
                        <div className="feature">
                          <svg
                            stroke="currentColor"
                            fill="currentColor"
                            strokeWidth="0"
                            viewBox="0 0 512 512"
                            height="1em"
                            width="1em"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="32"
                              d="M320 120l48 48-48 48"
                            ></path>
                            <path
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="32"
                              d="M352 168H144a80.24 80.24 0 00-80 80v16m128 128l-48-48 48-48"
                            ></path>
                            <path
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="32"
                              d="M160 344h208a80.24 80.24 0 0080-80v-16"
                            ></path>
                          </svg>
                          <span>Peer-to-peer</span>
                        </div>
                      </div>
                    </div>
                    <div className="features-right">
                      <div className="feature">
                        <svg
                          stroke="currentColor"
                          fill="currentColor"
                          strokeWidth="0"
                          viewBox="0 0 512 512"
                          height="1em"
                          width="1em"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M432 208H288l32-192L80 304h144l-32 192z"></path>
                        </svg>
                        <span>Blazingly fast</span>
                      </div>
                      <div className="feature">
                        <svg
                          stroke="currentColor"
                          fill="currentColor"
                          strokeWidth="0"
                          viewBox="0 0 512 512"
                          height="1em"
                          width="1em"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="32"
                            d="M288 304v-18c0-16.63-14.26-30-32-30s-32 13.37-32 30v18"
                          ></path>
                          <path d="M304 416h-96a32 32 0 01-32-32v-48a32 32 0 0132-32h96a32 32 0 0132 32v48a32 32 0 01-32 32z"></path>
                          <path
                            fill="none"
                            strokeLinejoin="round"
                            strokeWidth="32"
                            d="M416 221.25V416a48 48 0 01-48 48H144a48 48 0 01-48-48V96a48 48 0 0148-48h98.75a32 32 0 0122.62 9.37l141.26 141.26a32 32 0 019.37 22.62z"
                          ></path>
                          <path
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="32"
                            d="M256 50.88V176a32 32 0 0032 32h125.12"
                          ></path>
                        </svg>
                        <span>End-to-end encrypted</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}{" "}
              {files.length > 0 && (
                <div class="right-centered">
                  <div class="keep-open ">
                    <h1>Now sharing your files directly from your device</h1>
                    <p class="block-focus">
                      <b>⚠️ Please note:</b>
                      <br />
                      Closing this page means you stop sharing! <br />
                      Simply keep this page open in the background to keep
                      sharing.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="content-middle">
            <div className="scroll"></div>
          </div>
          <div className="content-bottom">
            <div className="container-informative">
              <h2>What is QuickShare ?</h2>
              <p className="text-explained">
                We are a free and independent peer-to-peer (P2P) file sharing
                service that prioritizes your privacy and keeps your data safe.
                We store nothing online: simply close your browser to stop
                sending. Our mission is to make sure people keep their data
                safely into their own hands, as it should be.
              </p>
              <div className="divider-orange"></div>
              <div className="item-info">
                <div className="container-circle-icon">
                  <div className="img-info">☁️</div>
                </div>
                <div className="block-info">
                  <h3>Files are shared straight from your device</h3>
                  <p>
                    When you close the browser tab your files are no longer
                    accessible, minimising the risk of anyone getting unwanted
                    access. QuickShare uses the peer-to-peer technology WebRTC
                    to find the shortest path, meaning sometimes your data
                    doesn't even have to leave the building!
                  </p>
                </div>
              </div>
              <div className="item-info">
                <div className="container-circle-icon">
                  <div className="img-info">📏</div>
                </div>
                <div className="block-info">
                  <h3>No more file size limits</h3>
                  <p>
                    Because we don't store the data, there's no need for file
                    size limits. Just share files of any size or whatever
                    amount. As long as you keep an eye on your own data usage.
                  </p>
                </div>
              </div>
              <div className="item-info">
                <div className="container-circle-icon">
                  <div className="img-info">🔒</div>
                </div>
                <div className="block-info">
                  <h3>Only the receiver can access your files</h3>
                  <p>
                    Only you and the receiver can access your files. Your data
                    is encrypted end-to-end, and can only be read by your
                    receiver (and you of course). ToffeeShare currently uses an
                    implementation of{" "}
                    <a
                      className="link"
                      href="https://en.wikipedia.org/wiki/Datagram_Transport_Layer_Security"
                    >
                      DTLS 1.3.
                    </a>
                  </p>
                </div>
              </div>
              <div className="item-info">
                <div className="container-circle-icon">
                  <div className="img-info">🌳</div>
                </div>
                <div className="block-info">
                  <h3>Low environmental impact</h3>
                  <p>
                    Because we don't store data we don't need bulky servers, and
                    that saves a lot of energy. By using QuickShare you'll have
                    a much smaller carbon footprint than when using a cloud
                    storage provider.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
