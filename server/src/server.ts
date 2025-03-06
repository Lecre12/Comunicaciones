import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import User from "../../shared/users/user"
import HandlerDB from "./db-handler/db-handler"
import path from "path";
import fs from "fs";

const ALLOWED_TYPES = ["image/svg+xml", "image/png", "image/webp", "image/jpeg"];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://client-chat-adminsys.netlify.app',
     methods: ['GET', 'POST'],
     allowedHeaders: ['Content-Type'],
    },
  maxHttpBufferSize: 50e3,
});

HandlerDB.initDataBase();


app.use(cors());
app.use("/uploads", express.static("uploads"));

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
          io.to(socket.id).emit("history_chat", []);
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
          io.to(socket.id).emit("history_chat", []);
        }
      }
    }  
  });

  socket.on("identification", async (alias: string) => {

    const userIdConnected: number = (await HandlerDB.getIdFromAlias(alias));
    let alreadyExists : boolean = false;
    
    connectedUsers.forEach(user => {
      if(user.getName() === alias){
        alreadyExists = true;
        io.to(socket.id).emit("-error", "Este usuario ya esta conectado desde otro dispositivo");
      }
    });

    if(alreadyExists) return;

    if(userIdConnected != -1){
      console.log(`Usuario identificado y conectado como: ${userIdConnected}`);
      const icon = HandlerDB.getIcon(userIdConnected).icon_name;
      console.log("EL icono de este tio es: " + icon);
      connectedUsers.push(new User(alias, socket.id, userIdConnected, icon));
      const sendUser = new User(alias, socket.id, userIdConnected, icon);
      console.log(sendUser);
      io.to(socket.id).emit("who_i_am", sendUser);
    }else{
      console.log(`Usuario no identificado previamente, añadiendo a db...`);
      await HandlerDB.saveAlias(alias);
      const newUserId = await HandlerDB.getIdFromAlias(alias);
      connectedUsers.push(new User(alias, socket.id, newUserId));
      io.to(socket.id).emit("who_i_am", new User(alias, socket.id, newUserId));
    }

    sendConnectedUsers();
    sendDisconnectedUsers();

  });

  socket.on("-restore_chat", async (chatId: number) => {
    console.log("Recuperando chat...");
    io.to(socket.id).emit("history_chat", await HandlerDB.getConversationFromChat(chatId, 25));
  });

  socket.on("-get_users", () => {
    sendConnectedUsers();
    sendDisconnectedUsers();
  });

  socket.on("upload_image", (userId: number, fileData) => {
    console.log(`Se ha recibido un archivo con nombre: ${fileData.name}`);
    if (!ALLOWED_TYPES.includes(fileData.type)) {
      console.log("❌ Archivo rechazado:", fileData.name);
      return;
    }
    const extension = fileData.name.split('.').pop();

    fileData.name = userId.toString() + `.${extension}`;
    
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    // Guardar el archivo en la carpeta "uploads"
    const relativePath = path.join("uploads", fileData.name);
    fs.writeFileSync(relativePath, Buffer.from(fileData.buffer));


    console.log("✅ Archivo guardado en:", relativePath);
    HandlerDB.updateUserIcon(userId, relativePath);
    connectedUsers.forEach(user => {
      if(user.getUserId() == userId){
        user.setIcon(relativePath);
      }
    });

    io.to(socket.id).emit("set_image", relativePath);

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
    console.log(user);
  })
  io.emit("-connected_users", connectedUsers);
}

function sendDisconnectedUsers(){
  console.log(`Consiguiendo usuarios desconectados`);
  const rawUsers = HandlerDB.getAllUsers();
  console.log(rawUsers);
  const allUsersFromDb = Array.isArray(rawUsers) 
    ? rawUsers.map(user => new User(user.alias, "", user.id, user.icon_name)) 
    : [];

  console.log("Usuarios obtenidos:", allUsersFromDb);
  const disconnectedUsers: User[] = allUsersFromDb.filter(user => !connectedUsers.some(connectedUser => connectedUser.getUserId() === user.getUserId()));
  io.emit("-disconnected_users", disconnectedUsers);
}

function normalizeConversationId(id1: number, id2: number): string {
  const sortedIds = [id1, id2].sort((a, b) => a - b);
  return `_${sortedIds[0]}_${sortedIds[1]}`;
}