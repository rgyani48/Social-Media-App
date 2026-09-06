const WelcomeMessage = ({onGetPostClick}) => {
    return <center className="welcome-message"><h1 >There are no post</h1>
    <button type="button" 
    onClick={onGetPostClick}
    className="btn btn-primary">Get Posts From Server</button>
    </center>
}

export default WelcomeMessage;