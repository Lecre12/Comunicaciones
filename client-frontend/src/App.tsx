import { SetStateAction, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import Connected_users from "./components/Connected-users";
import User from "../../shared/users/user";
import Message from "../../shared/message/message";

// Conectar con el servidor
export const socket = io("wss://contains-stronger-nh-reviewing.trycloudflare.com", {
  reconnectionAttempts: 3,
  timeout: 5000
});

/*socket.on("connect_error", (error) => {
  console.error("❌ Error de conexión:", error.message);
  alert("❌ Error de conexión: " + error.message);
});*/

function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [alias, setAlias] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Nuevo estado para controlar si el usuario ha ingresado su nombre
  const [actualConversationId, setConversation] = useState(-1);
  const [myUser, setMyUser] = useState(new User("", "", -1));


  // Escuchar mensajes del servidor
  useEffect(() => {
    socket.on("message", (msg) => {
        console.log(msg);
        setMessages((prev) => [...prev, msg]);
    });

    socket.on("private_message", (msg: Message[]) => {
      setMessages(() => []);
      msg.forEach(restoredMessage => {
        console.log(restoredMessage.alias + ": " + restoredMessage.content);
        setMessages((prev) => [...prev, restoredMessage.alias + ": " + restoredMessage.content]);
      });
    });

    socket.on("history_chat", (msg) => {

    });

    socket.on("-connected_users", (usersData: any[]) => {
      const formattedUsers = usersData.map(user => new User(user.name, user.socketId, user.userId));
      setUsers(formattedUsers);
    });

    socket.on("conver_id", (conver_id: number) => {
      setConversation(conver_id);
    });

    socket.on("who_i_am", (userData: any) => {
      const formattedUser = new User(userData.name, userData.socketId, userData.userId);
      setMyUser(formattedUser);
    });

    socket.on("connect", () => {
      console.log("Pidiendo historial de chat");
      //socket.emit("-restore_chat", `${actualConversationId}`);
      socket.emit("-get_users", "");
    });

    return () => {
      socket.off("message");
      socket.off("private_message");
      socket.off("history_chat");
    };
  }, []);

  // Enviar mensaje al servidor
  const sendMessage = () => {
    if (message.trim()) {
      const myUserId = myUser.getUserId();
      socket.emit("message", message, myUserId, actualConversationId);
      setMessage("");
    }
  };

  const saveAlias = () => {
    if (alias) {
      socket.emit("identification", alias);
      setIsLoggedIn(true); // Cambiar el estado a true para mostrar el chat
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
      {!isLoggedIn ? (
        <div id="login-container">
          <h1>Bienvenido al Chat</h1>
          <div id="alias-container">
            <input
              type="text"
              value={alias}
              onChange={(e: { target: { value: SetStateAction<string>; }; }) => setAlias(e.target.value)}
              placeholder="Ingresa tu nombre de usuario"
            />
            <button onClick={saveAlias}>Entrar al chat</button>
          </div>
        </div>
      ) : (
        <>
          <div id="connected-users">
            <Connected_users userList={users} myUser={myUser}/>
          </div>
          <div id="chat-container">
            <div id="header-chat">
              <h1>Chat App</h1>
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
        </>
      )}
    </div>
  );
}

export default App;