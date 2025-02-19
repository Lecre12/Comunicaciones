import Database from "better-sqlite3"
import path from "path";
import DbAtribute from "../types/db-atribute";
import Semaphore from "../types/semaphore"
import ForeignKey from "../types/db-foreign-key";

class HandlerDB{
    private static instance: ReturnType<typeof Database> | null = null;
    private static pathToDataBase = path.resolve(__dirname, "../../db/chat.db");
    private static semaphore = new Semaphore(1);

    constructor(){}

    public static getDB(){
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

    public static async saveMessage(chat: string, sender: string, message: string){
        const command : string = `INSERT INTO ${chat} (sender, content) VALUES ('${sender}', '${message}');`;
        await this.semaphore.acquire();
        try{
            HandlerDB.getDB().exec(command);
        }catch(error: any){
            if(error.code === "SQLITE_CONSTRAINT_PRIMARYKEY"){
                await new Promise(res => setTimeout(res, 10));
                this.saveMessage(chat, sender, message);
            }else{
                console.error("❌ Error al insertar mensaje:", error.code);
            }
        }
        
        this.semaphore.release();
    }

    public static async getConversationFromChat(chat: string, numberOfMessages: number){
        const command: string = `
        SELECT c.*, a.name AS alias
        FROM ${chat} AS c
        LEFT JOIN alias_table AS a ON c.sender = a.ip
        ORDER BY c.send_time DESC
        LIMIT ?;
    `;
        await this.semaphore.acquire();
        const stmt = HandlerDB.getDB().prepare(command);
        const result = stmt.all(numberOfMessages);
        this.semaphore.release();
        return result;
    }

    public static async saveAlias(tableName: string, alias: string, ip: string){
        const command : string = `INSERT INTO ${tableName} (name, ip) VALUES ('${alias}', '${ip}') ON CONFLICT(ip) DO UPDATE SET name = excluded.name;`
        console.log(command);
        await this.semaphore.acquire();
        HandlerDB.getDB().exec(command);
        this.semaphore.release();
    }

    public static async getALiasFromIp(ip: string): Promise<string>{
        const command: string = `SELECT name FROM alias_table WHERE ip = ?;`;
        await this.semaphore.acquire();
        const stmt = HandlerDB.getDB().prepare(command);
        const result = stmt.get(ip) as {name : string} | undefined;
        this.semaphore.release();

        return result ? result.name : "";
    }

    public static async initialiceAlias(ip: string){
        const command : string = `INSERT OR IGNORE INTO alias_table (name, ip) VALUES ('Desconocido', '${ip}')`;
        await this.semaphore.acquire();
        console.log(command);
        HandlerDB.getDB().exec(command);
        this.semaphore.release();
    }   

}

export default HandlerDB;