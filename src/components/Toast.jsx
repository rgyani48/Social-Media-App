const Toast = ({ message }) => {
  if (!message) return null;

  return (
    <div className="toast-box">
      {message}
    </div>
  );
};

export default Toast;