const Footer = ({ darkMode }) => {
  return (
    <div 
      className={`w-100 py-3 ${darkMode ? "text-white" : "bg-white text-dark"}`}
      style={{ 
        backgroundColor: darkMode ? "#1E1E1E" : "#FFFFFF",
        borderTop: darkMode ? "1px solid #424242" : "1px solid #dee2e6"
      }}
    >
      <div className="container">
        <footer className="py-2">
          <ul 
            className="nav justify-content-center pb-3 mb-3"
            style={{ 
              borderBottom: darkMode ? "1px solid #424242" : "1px solid #dee2e6" 
            }}
          >
            <li className="nav-item">
              <a href="#" className={`nav-link px-2 ${darkMode ? 'text-light' : 'text-body-secondary'}`}>
                Home
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link px-2 ${darkMode ? 'text-light' : 'text-body-secondary'}`}>
                Features
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link px-2 ${darkMode ? 'text-light' : 'text-body-secondary'}`}>
                Pricing
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link px-2 ${darkMode ? 'text-light' : 'text-body-secondary'}`}>
                FAQs
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link px-2 ${darkMode ? 'text-light' : 'text-body-secondary'}`}>
                About
              </a>
            </li>
          </ul>
          <p className={`text-center mb-0 ${darkMode ? 'text-light' : 'text-body-secondary'}`}>
            © 2026 Company, Inc
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Footer;