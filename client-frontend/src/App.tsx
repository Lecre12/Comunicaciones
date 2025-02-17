import { SetStateAction, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import Connected_users from "./components/Connected-users";
import User from "../../shared/users/user";

// Conectar con el servidor
//console.log(import.meta.env.VITE_SERVER_URL);
export const socket = io(import.meta.env.VITE_SERVER_URL);

function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [alias, setAlias] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  // Escuchar mensajes del servidor
  useEffect(() => {
    socket.on("message", (msg) => {

      if(Array.isArray(msg) && msg.every(m => m.name && m.ip)){
        const usersArray = msg.map(m => new User(m.name, m.ip, ""));
        setUsers(usersArray);
      }else{
        console.log(msg);
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("private_message", (msg) => {
      if(Array.isArray(msg) && msg.every(m => m.sender && m.content && m.send_time && m.alias)){
        setMessages(() => [])
        msg.forEach(restoredMessage => {
          console.log(restoredMessage.alias + ": " + restoredMessage.content);
          setMessages((prev) => [...prev, restoredMessage.alias + ": " + restoredMessage.content]);
        });
      }
    });

    return () => {
      socket.off("message");
    };
  }, []);

  socket.on("connect", () =>{
    console.log("Pidiendo historial de chat");
    socket.emit("message", "-restore chat");
  });

  // Enviar mensaje al servidor
  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("message", message);
      setMessage("");
    }
  };

  const saveAlias = () => {
    if(alias){
      socket.emit("alias_save", alias);
      setAlias("");
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
        <div id="header-chat">
          <h1>Chat App</h1>
          <div id="alias-container">
            <input
              type="text"
              value={alias}
              onChange={(e: { target: { value: SetStateAction<string>; }; }) => setAlias(e.target.value)}
            />
            <button onClick={saveAlias}>Guardar alias</button>
          </div>
        </div>
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
