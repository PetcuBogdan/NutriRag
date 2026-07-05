import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";
import ChatPage from "./pages/ChatPage/ChatPage";
import AnalysisPage from "./pages/AnalysisPage/AnalysisPage";
import MenuPage from "./pages/MenuPage/MenuPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/analysis" element={<AnalysisPage />} />
      <Route path="/menu" element={<MenuPage />} />
    </Routes>
  );
}

export default App;
