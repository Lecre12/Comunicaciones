import Database from "better-sqlite3"
import path from "path";
import DbAtribute from "../types/db-atribute";
import Semaphore from "../types/semaphore"
import ForeignKey from "../types/db-foreign-key";
import Message from "../../../shared/message/message";

class HandlerDB{
    private static instance: ReturnType<typeof Database> | null = null;
    private static pathToDataBase = path.resolve(__dirname, "../../db/chat.db");
    private static semaphore = new Semaphore(1);

    constructor(){}

    private static getDB(){
        if(this.instance){
            return this.instance;
        }else{
            this.instance = new Database(this.pathToDataBase);
            return this.instance;
        }
    }

    public static async createTableIfNotExists(tableName: string, atributes: DbAtribute[], primaryKeys: string, foreignKeys?: ForeignKey[]){
        let atributesString: string = "";
        atributes.forEach(atribute => {
            atributesString += `${atribute.getName()} ${atribute.getType()} ${atribute.getCanNull()}${atribute.getAutoincrement()} ${atribute.getDefaultValue() ? atribute.getDefaultValue() : ""}, `;
        });
        atributesString = atributesString.substring(0, atributesString.length-2);

        let command: string;

        if(foreignKeys){
            if(atributesString.includes("PRIMARY KEY AUTOINCREMENT")){
                command = `CREATE TABLE IF NOT EXISTS ${tableName} (${atributesString}`;
            }else{
                command = `CREATE TABLE IF NOT EXISTS ${tableName} (${atributesString}, PRIMARY KEY(${primaryKeys})`;
            }

            //FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,

            foreignKeys.forEach(key => {
                const sentence = `, FOREIGN KEY (${key.getKeyName()}) REFERENCES ${key.getTable()}(${key.getOriginalKeyName()}) ON DELETE CASCADE`;
                command += sentence;
            });
        }else{
            if(atributesString.includes("PRIMARY KEY AUTOINCREMENT")){
                command = `CREATE TABLE IF NOT EXISTS ${tableName} (${atributesString}`;
            }else{
                command = `CREATE TABLE IF NOT EXISTS ${tableName} (${atributesString}, PRIMARY KEY(${primaryKeys})`;
            }
        }

        

        command += `);`;
        console.log(command);
        await this.semaphore.acquire();
        HandlerDB.getDB().exec(command);
        this.semaphore.release();
    }

    public static async initDataBase(){
        /*
        OLD DATABASE

        HandlerDB.createTableIfNotExists("grupal_chat", [
          new DbAtribute("sender", "STRING", false, undefined),
          new DbAtribute("content", "STRING", false, undefined),
          new DbAtribute("send_time", "DATETIME", false, "CURRENT_TIMESTAMP")
        ], "sender, send_time");
        
        HandlerDB.createTableIfNotExists("alias_table", [
          new DbAtribute("name", "STRING", false, "'Desconocido'"),
          new DbAtribute("ip", "STRING", false, undefined)
        ], "ip");*/

        await HandlerDB.createTableIfNotExists("users_identification", [
            new DbAtribute("id", "INTEGER", false, undefined, true),
            new DbAtribute("alias", "STRING", false, undefined)
        ], "id");

        await HandlerDB.createTableIfNotExists("conversation", [
            new DbAtribute("id", "INTEGER", false, undefined, true),
            new DbAtribute("name", "STRING", false, undefined)
        ], "id");

        await HandlerDB.createTableIfNotExists("mensaje", [
            new DbAtribute("id", "INTEGER", false, undefined, true),
            new DbAtribute("user_id", "INTEGER", false, undefined),
            new DbAtribute("conver_id", "INTEGER", false, undefined),
            new DbAtribute("content", "STRING", false, undefined),
            new DbAtribute("send_time", "DATETIME", false, "CURRENT_TIMESTAMP")
        ], "id", [
            new ForeignKey("user_id", "id", "users_identification"),
            new ForeignKey("conver_id", "id", "conversation")
        ]);

        await HandlerDB.createTableIfNotExists("participant", [
            new DbAtribute("conver_id", "INTEGER", false, undefined),
            new DbAtribute("user_id", "INTEGER", false, undefined)
        ], "conver_id, user_id", [
            new ForeignKey("conver_id", "id", "conversation"),
            new ForeignKey("user_id", "id", "users_identification")
        ]);

    }

    public static async saveMessage(senderId: number, chatId: number, message: string){
        const command : string = `INSERT INTO mensaje (user_id, conver_id, content) VALUES (${senderId}, ${chatId}, '${message}');`;
        await this.semaphore.acquire();
        HandlerDB.getDB().exec(command);
        this.semaphore.release();
    }

    public static async getConversationFromChat(chatId: number, numberOfMessages: number){
        const command: string = `SELECT * FROM mensaje JOIN users_identification ON mensaje.user_id = users_identification.id WHERE mensaje.conver_id = ${chatId} ORDER BY mensaje.send_time DESC LIMIT ?`;
        await this.semaphore.acquire();
        const stmt = HandlerDB.getDB().prepare(command);
        const result: Message[] = stmt.all(numberOfMessages) as Message[];
        this.semaphore.release();
        return result;
    }

    public static async saveAlias(alias: string){
        const command : string = `INSERT INTO users_identification (alias) VALUES ('${alias}');`;
        console.log(command);
        await this.semaphore.acquire();
        HandlerDB.getDB().exec(command);
        this.semaphore.release();
    }

    public static updateAlias(id: number, alias: string){
        const command = `UPDATE users_identification SET alias = ${alias} WHERE id = ${id}`;
        console.log(command);
        HandlerDB.getDB().exec(command);
    }

    public static async getALiasFromId(id: number): Promise<string>{
        const command: string = `SELECT alias FROM users_identification WHERE id = ?;`;
        await this.semaphore.acquire();
        const stmt = HandlerDB.getDB().prepare(command);
        const result = stmt.get(id) as {alias : string} | undefined;
        this.semaphore.release();

        return result ? result.alias : "";
    } 
    
    public static getIdFromAlias(alias: string){
        const command = `SELECT id FROM users_identification WHERE alias = '${alias}'`;
        const stmt = HandlerDB.getDB().prepare(command);
        const result = stmt.get() as {id: number} | undefined;
        return result ? result.id : -1;
    }

    public static newConversation(conversationName: string, participantsIds: number[]){
        const command: string = `INSERT INTO conversation (name) VALUES ('${conversationName}');`;
        console.log(command);
        HandlerDB.getDB().exec(command);


        this.setParticipants(this.getChatIdFromName(conversationName), participantsIds);
        
        return this.getChatIdFromName(conversationName);
    }

    public static getChatIdFromName(chatName: string){

        const command: string = `SELECT id FROM conversation WHERE name = ?;`;
        const stmt = HandlerDB.getDB().prepare(command);
        const result = stmt.get(chatName) as {id : number} | undefined;

        return result ? result.id : -1;

    }

    public static setParticipants(chatId: number, participantsIds: number[]){
        participantsIds.forEach((userId) => {
            const command = `INSERT OR IGNORE INTO participant (conver_id, user_id) VALUES (${chatId}, ${userId});`;
            this.getDB().exec(command);
        });
    }

}

export default HandlerDB;