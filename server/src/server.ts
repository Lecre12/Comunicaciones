import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import User from "../../shared/users/user"
import HandlerDB from "./db-handler/db-handler"
import DbAtribute from "./types/db-atribute";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

HandlerDB.createTableIfNotExists("grupal_chat", [
  new DbAtribute("sender", "STRING", false, undefined),
  new DbAtribute("content", "STRING", false, undefined),
  new DbAtribute("send_time", "DATETIME", false, "CURRENT_TIMESTAMP")
], "sender, send_time");

HandlerDB.createTableIfNotExists("alias_table", [
  new DbAtribute("name", "STRING", false, "'Desconocido'"),
  new DbAtribute("ip", "STRING", false, undefined)
], "ip");


app.use(cors());

let connectedUsers: User[] = [new User("Chat Grupal", "0.0.0.0.0", "")];
io.on("connection", async (socket) => {
  console.log(`Usuario conectado: ${socket.id} con ip: ${socket.handshake.address}`);
  HandlerDB.initialiceAlias(socket.handshake.address);
  const userNameConnected = (await HandlerDB.getALiasFromIp(socket.handshake.address));
  console.log(userNameConnected);
  if(userNameConnected){
    connectedUsers.push(new User(userNameConnected, socket.handshake.address, socket.id));
  }

  socket.on("message", async (data: string) => {
    console.log("Mensaje recibido:", data);
    const senderUser = connectedUsers.find(user => user.getIp() === socket.handshake.address);

    if(data === "-get connected_users"){
      sendConnectedUsers();
    }else if(data == "-restore chat"){

      console.log("Recuperando chat...");
      if(senderUser?.getAlias())
      io.to(senderUser?.getAlias()).emit("private_message", await HandlerDB.getConversationFromChat("grupal_chat", 25));
    
    }else{
        console.log("Esto es un mensaje para el grupo, " + data);
        if(senderUser?.getIp())
        await HandlerDB.saveMessage("grupal_chat", senderUser?.getIp(), data);
        io.emit("message", (senderUser ? senderUser.getName() : "Desconocido") + ": " + data);
    }
    
    data = "";
  });

  socket.on("alias_save", async (alias: string) => {
    if(alias){
      await HandlerDB.saveAlias(`alias_table`, alias, socket.handshake.address);
      connectedUsers.forEach(user => {
        if(user.getIp() == socket.handshake.address){
          user.setName(alias);
        }
      });
      sendConnectedUsers();
    }
    
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

function sendConnectedUsers(){
  console.log("Consiguiendo usuarios conectados: \n");
  connectedUsers.forEach(user => {
      console.log(user.getIp());
  })
  io.emit("message", connectedUsers);
}