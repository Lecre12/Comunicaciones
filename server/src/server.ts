import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import User from "../../shared/users/user"

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());

let connectedUsers: User[] = [new User("Chat Grupal", "0.0.0.0.0")];
io.on("connection", (socket) => {
  console.log(`Usuario conectado: ${socket.id} con ip: ${socket.handshake.address}`);
  connectedUsers.push(new User(`Maquina ${connectedUsers.length}`, socket.handshake.address))

  socket.on("message", (data: string) => {
    console.log("Mensaje recibido:", data);
    if(data === "-get connected_users"){
        console.log("Consiguiendo usuarios conectados: \n");
        connectedUsers.forEach(user => {
            console.log(user.getIp());
        })
        io.emit("message", connectedUsers);
    }else{
        console.log("Esto es un mensaje para el grupo, " + data);
        io.emit("message", data); // Reenvía el mensaje a todos los clientes
    }
    
    data = "";
  });

  socket.on("disconnect", () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    const newArray = connectedUsers.filter(item => item.getIp() !== socket.handshake.address);
    connectedUsers = newArray;
  });
});

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo`);
});