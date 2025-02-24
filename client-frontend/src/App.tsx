import { SetStateAction, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import Connected_users from "./components/Connected-users";
import User from "../../shared/users/user";
import Message from "../../shared/message/message";
import Chat_name from "./components/Chat-name";
const MAX_MESSAGE_LENGTH = 1e3;

// Conectar con el servidor
export const socket = io(import.meta.env.VITE_SERVER_URL, {
  reconnectionAttempts: 3,
  timeout: 5000
});

/*socket.on("connect_error", (error) => {
  console.error("❌ Error de conexión:", error.message);
  alert("❌ Error de conexión: " + error.message);
});*/

function App() {
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [showUsers, setShowUsers] = useState(window.innerWidth >= 800);
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [alias, setAlias] = useState("");
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [disconnectedUsers, setDisconnectedUsers] = useState<User[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Nuevo estado para controlar si el usuario ha ingresado su nombre
  const actualConversationIdRef = useRef(-1);
  const [actualConversationId, setConversation] = useState(-1);
  const [conversationName, setConversationName] = useState("");
  const [myUser, setMyUser] = useState(new User("", "", -1));

  useEffect(() => {
    const handleResize = () => {
      setShowUsers(window.innerWidth > 800);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      }
    }, 0);
  }, [messages]);

  useEffect(() => {
    actualConversationIdRef.current = actualConversationId;
  }, [actualConversationId]);

  // Escuchar mensajes del servidor
  useEffect(() => {
    socket.on("message", (msg: string, converId: number) => {
      console.log(msg);
      console.log(`mensaje de converId: ${converId} y estoy en conver: ${actualConversationIdRef.current}`);
      if(actualConversationIdRef.current == converId){
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("history_chat", (msgs: Message[]) => {
      console.log(`He recibido un historial: ${msgs}`);
      if(msgs){
        setMessages(() => []);
        msgs.forEach(restoredMessage => {
        console.log(restoredMessage.alias + ": " + restoredMessage.content);
        setMessages((prev) => [...prev, restoredMessage.alias + ": " + restoredMessage.content]);
      });
      }
    });

    socket.on("-connected_users", (usersData: any[]) => {
      const formattedUsers = usersData.map(user => new User(user.name, user.socketId, user.userId));
      setConnectedUsers(formattedUsers);
    });

    socket.on("-disconnected_users", (usersData: any[]) => {
      const formattedUsers = usersData.map(user => new User(user.name, user.socketId, user.userId));
      setDisconnectedUsers(formattedUsers);
    });

    socket.on("conver_id", (conver_id: number) => {
      if(conver_id == -1){
        console.warn("Se ha recibido que estoy en el chat -1, revisa la logica del servidor");
      }else{
        setConversation(conver_id);
        console.log("Actual conver: " + actualConversationIdRef.current);
      }
    });

    socket.on("who_i_am", (userData: any) => {
      const formattedUser = new User(userData.name, userData.socketId, userData.userId);
      setMyUser(formattedUser);
      setIsLoggedIn(true);
    });

    socket.on("connect", () => {
      console.log("Pidiendo historial de chat");
      //socket.emit("-restore_chat", `${actualConversationId}`);
      socket.emit("-get_users", "");
    });

    socket.on("disconnect", (reason) => {
      console.warn("Desconectado del servidor:", reason);
      alert("Se perdió la conexión con el servidor. Recargando...");
      window.location.reload();
    });

    socket.on("-error", (error : string) => {
      alert(error);
    });

    return () => {
      socket.off("message");
      socket.off("private_message");
      socket.off("history_chat");
    };
  }, []);

  // Enviar mensaje al servidor
  const sendMessage = () => {
    if(message.length >= MAX_MESSAGE_LENGTH){
      alert(`No puedes sobrepasar ${MAX_MESSAGE_LENGTH} caracteres`);
      return;
    }
    if (message.trim()) {
      const myUserId = myUser.getUserId();
      socket.emit("message", message, myUserId, actualConversationIdRef.current);
      setMessage("");
    }
  };

  const saveAlias = () => {
    if (alias) {
      socket.emit("identification", alias);
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
          <button id="toggle-users" onClick={() => setShowUsers(!showUsers)}>
            ...
          </button>
          <div id="connected-users" style={{ display: showUsers ? "flex" : "none" }}>
            <Connected_users userList={connectedUsers} myUser={myUser} disconnectedUserList={disconnectedUsers} fakeConversationName={setConversationName}/>
          </div>
          <div id="chat-container">
            <div id="header-chat">
              <Chat_name title={conversationName}/>
            </div>
            <div id="message-container" ref={messageContainerRef}>
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