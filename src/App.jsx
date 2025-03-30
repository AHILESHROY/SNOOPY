import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import LoginForm from './components/LoginForm.jsx';
import HomePage from './components/HomePage/HomePage.jsx';
import YourPage from './components/YourPage/YourPage.jsx';
import AboutUs from './components/About/AboutUs.jsx';
import Navbar from "./components/Navbar/Navbar";
import OurService from './components/OurService/OurService.jsx';
function Layout() {
  const location = useLocation();
  const showNavbar = location.pathname !== "/"; // Hide Navbar on LoginForm

  return (
    <div className="App">
      {showNavbar && <Navbar />}  {/* Show Navbar except on login page */}
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/yourpage" element={<YourPage />} />
        <Route path="/ourservice" element={<OurService />} />
        <Route path="/aboutus" element={<AboutUs />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}
export default App;