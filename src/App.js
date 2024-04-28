import "./App.css";
import Navbar from "./navbar/navbar";
import Home from "./pages/home";
import Receive from "./pages/receive";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/receive/:id" element={<Receive />} />
        <Route path="/receive" element={<Receive />} />
      </Routes>
    </>
  );
}

export default App;
