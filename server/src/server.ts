import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import User from "../../shared/users/user"
import HandlerDB from "./db-handler/db-handler"
import { stringify } from "querystring";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
  maxHttpBufferSize: 1e3,
});

HandlerDB.initDataBase();


app.use(cors());

let connectedUsers: User[] = [];
io.on("connection", async (socket) => {
  console.log(`Usuario conectado: ${socket.id} con ip: ${socket.handshake.address}`);

  socket.on("message", async (data: string, senderId: number, conversationId: number) => {
    console.log(`Mensaje para la conversacion: ${conversationId}, con mensaje: ${data}`);
    if(conversationId == -1) return;

    const participantsIds = await HandlerDB.getParticipantsByConversationId(conversationId);
    console.log(participantsIds);

    if(!participantsIds.includes(senderId)) return; // El usuario no tiene permitido enviar mensajes en este chat

    console.log("Tiene permitido mandar mensajes al chat");
    const senderAlias = await HandlerDB.getALiasFromId(senderId);
    await HandlerDB.saveMessage(senderId, conversationId, data);


    connectedUsers.forEach((userCon) => {
      if(participantsIds.includes(userCon.getUserId())){
        console.log("MNandando mensaje a: " + userCon.getSocketId());
        io.to(userCon.getSocketId()).emit("message", (senderAlias ||"Desconocido") + ": " + data, conversationId);
      }
    });
    data = "";
  });

  socket.on("set-conversation", async (conversationName: string, participants: string[]) => {

    const participantsIds :number[] = []; 

    participants.forEach((alias) => {
      participantsIds.push(HandlerDB.getIdFromAlias(alias));
    });

    console.log(participantsIds);

    if(conversationName){
      const matches = conversationName.match(/_?(\d+)_(\d+)_/);
      let converName: string = "";
      if(matches){
        const id1 = parseInt(matches[1], 10);
        const id2 = parseInt(matches[2], 10);
        converName = normalizeConversationId(id1, id2);
      }

      if(converName){
        let converId = await HandlerDB.getChatIdFromName(converName);
        if(converId == -1){
          converId = await HandlerDB.newConversation(converName, participantsIds);
          io.to(socket.id).emit("conver_id", converId);
        }else{
          io.to(socket.id).emit("conver_id", converId);
          const historyMsgs = await HandlerDB.getConversationFromChat(converId, 25); 
          io.to(socket.id).emit("history_chat", historyMsgs);
        }
        
      }else{
        let converId = await HandlerDB.getChatIdFromName(conversationName);
        if(converId != -1){
          io.to(socket.id).emit("conver_id", converId);
          const historyMsgs = await HandlerDB.getConversationFromChat(converId, 25); 
          io.to(socket.id).emit("history_chat", historyMsgs);
        }else{
          converId = HandlerDB.newConversation(conversationName, participantsIds);
          io.to(socket.id).emit("conver_id", converId);
        }
      }
    }  
  });

  socket.on("identification", async (alias: string) => {

    const userIdConnected: number = (await HandlerDB.getIdFromAlias(alias));
    
    if(userIdConnected != -1){
      console.log(`Usuario identificado y conectado como: ${userIdConnected}`);
      connectedUsers.push(new User(alias, socket.id, userIdConnected));
      io.to(socket.id).emit("who_i_am", new User(alias, socket.id, userIdConnected));
    }else{
      console.log(`Usuario no identificado previamente, añadiendo a db...`);
      await HandlerDB.saveAlias(alias);
      const newUserId = await HandlerDB.getIdFromAlias(alias);
      connectedUsers.push(new User(alias, socket.id, newUserId));
      io.to(socket.id).emit("who_i_am", new User(alias, socket.id, newUserId));
    }

  });

  socket.on("-restore_chat", async (chatId: number) => {
    console.log("Recuperando chat...");
    io.to(socket.id).emit("history_chat", await HandlerDB.getConversationFromChat(chatId, 25));
  });

  socket.on("-get_users", () => {
    sendConnectedUsers();
  });

  socket.on("disconnect", (reason) => {
    console.log(`Usuario desconectado: ${socket.id} por: ${reason}`);
    const newArray = connectedUsers.filter(item => item.getSocketId() !== socket.id);
    connectedUsers = newArray;
  });
});

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en el puerto: ${PORT}`);
});

function sendConnectedUsers(){
  console.log("Consiguiendo usuarios conectados: \n");
  connectedUsers.forEach(user => {
    console.log(user.getName());
  })
  io.emit("-connected_users", connectedUsers);
}

function normalizeConversationId(id1: number, id2: number): string {
  const sortedIds = [id1, id2].sort((a, b) => a - b);
  return `_${sortedIds[0]}_${sortedIds[1]}`;
}