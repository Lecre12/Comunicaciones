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
});

HandlerDB.initDataBase();


app.use(cors());

let connectedUsers: User[] = [];
io.on("connection", async (socket) => {
  console.log(`Usuario conectado: ${socket.id} con ip: ${socket.handshake.address}`);

  socket.on("message", async (data: string, senderId: number, conversationId: number) => {
    console.log(`Mensaje para la conversacion: ${conversationId}, con mensaje: ${data}`);
    const senderAlias = await HandlerDB.getALiasFromId(senderId);
    await HandlerDB.saveMessage(senderId, conversationId, data);
    io.emit("message", (senderAlias? senderAlias : "Desconocido") + ": " + data);
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

      console.log(converName);

      if(converName){
        let converId = await HandlerDB.getChatIdFromName(converName);
        if(converId == -1){
          converId = HandlerDB.newConversation(converName, participantsIds);
          io.to(socket.id).emit("conver_id", converId);
        }else{
          io.to(socket.id).emit("conver_id", converId);
          io.to(socket.id).emit("history_chat", await HandlerDB.getConversationFromChat(converId, 25));
        }
        
      }else{
        if(await HandlerDB.getChatIdFromName(conversationName) != -1){
          const converId = await HandlerDB.getChatIdFromName(conversationName);
          io.to(socket.id).emit("conver_id", converId);
          io.to(socket.id).emit("history_chat", await HandlerDB.getConversationFromChat(converId, 25));
        }else{
          const converId = HandlerDB.newConversation(conversationName, participantsIds);
          io.to(socket.id).emit("conver_id", converId);
        }
      }

      /*if(await HandlerDB.getChatIdFromName(conversationName) != -1){
        const converId = await HandlerDB.getChatIdFromName(conversationName);
        io.to(socket.id).emit("conver_id", converId);
        io.to(socket.id).emit("history_chat", await HandlerDB.getConversationFromChat(converId, 25));
      }else if(converName && await HandlerDB.getChatIdFromName(converName) != -1){
        const converId = await HandlerDB.getChatIdFromName(converName);
        io.to(socket.id).emit("conver_id", converId);
        io.to(socket.id).emit("history_chat", await HandlerDB.getConversationFromChat(converId, 25));
      }else{
        const converId = HandlerDB.newConversation(conversationName, participantsIds);
        io.to(socket.id).emit("conver_id", converId);
      }*/
    }else{
      let converName : string = "";

      participantsIds.forEach((id) => {
        converName += `_${id}_`;
      });

      const converId = HandlerDB.newConversation(`${converName}`, participantsIds);
      io.to(socket.id).emit("conver_id", converId);
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
    io.to(socket.id).emit("private_message", await HandlerDB.getConversationFromChat(chatId, 25));
  });

  socket.on("-get_users", () => {
    sendConnectedUsers();
  });

  socket.on("disconnect", () => {
    console.log(`Usuario desconectado: ${socket.id}`);
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