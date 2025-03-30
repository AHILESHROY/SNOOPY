import React from 'react';
import { Link } from 'react-router-dom';
import './YourPage.css'; // Optional: if you want separate styling

const YourPage = () => {
  return (
    <div className="your-page-container">
      <header>
        {/* Navigation is already in HomePage, but you could add a back link */}
        <Link to="/" className="back-link">Back to Home</Link>
      </header>
      
      <main>
        <h1>Your Page</h1>
        <p>This is the content for Your Page.</p>
        {/* Add your page content here */}
      </main>
      
      <footer>
        <p>&copy; 2025 Your Brand</p>
      </footer>
    </div>
  );
};

export default YourPage;