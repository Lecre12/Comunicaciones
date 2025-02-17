import Database from "better-sqlite3"
import path from "path";
import DbAtribute from "../types/db-atribute";
import Semaphore from "../types/semaphore"

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

    public static async createTableIfNotExists(tableName: string, atributes: DbAtribute[], primaryKeys: string){
        let atributesString: string = "";
        atributes.forEach(atribute => {
            atributesString += `${atribute.getName()} ${atribute.getType()} ${atribute.getCanNull()} ${atribute.getDefaultValue() ? atribute.getDefaultValue() : ""}, `;
        });

        const command: string = `CREATE TABLE IF NOT EXISTS ${tableName} (${atributesString} PRIMARY KEY(${primaryKeys}));`;
        console.log(command);
        await this.semaphore.acquire();
        HandlerDB.getDB().exec(command);
        this.semaphore.release();
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