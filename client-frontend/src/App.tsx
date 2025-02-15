import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import Connected_users from "./components/Connected-users";
import User from "../../shared/users/user";

// Conectar con el servidor
export const socket = io("http://192.168.68.101:3001");

function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  // Escuchar mensajes del servidor
  useEffect(() => {
    socket.on("message", (msg) => {

      if(Array.isArray(msg) && msg.every(m => m.name && m.ip)){
        const usersArray = msg.map(m => new User(m.name, m.ip));
        setUsers(usersArray);
      }else{
        console.log(msg);
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.off("message");
    };
  }, []);

  // Enviar mensaje al servidor
  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("message", message);
      setMessage("");
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const button = document.getElementById("send-button") as HTMLButtonElement;
      button.click();
    }
  };

  return (
    <div id="main-container">
      <div id="connected-users">
        <Connected_users userList={users}/>
      </div>
      <div id="chat-container">
        <h1>Chat App</h1>
        <div id="message-container">
          {messages.map((msg, index) => (
            <p key={index}>{msg}</p>
          ))}
        </div>
        <div id="input-container">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button onClick={sendMessage} id="send-button">Enviar</button>
        </div>
      </div>
    </div>
  );
}

export default App;
