import Database from "better-sqlite3"
import path from "path";
import DbAtribute from "../types/db-atribute";

class HandlerDB{
    private static instance: ReturnType<typeof Database> | null = null;
    private static pathToDataBase = path.resolve(__dirname, "../../db/chat.db")

    constructor(){}

    public static getDB(){
        if(this.instance){
            return this.instance;
        }else{
            this.instance = new Database(this.pathToDataBase);
            return this.instance;
        }
    }

    public static createTableIfNotExists(tableName: string, atributes: DbAtribute[], primaryKeys: string){
        let atributesString: string = "";
        atributes.forEach(atribute => {
            atributesString += `${atribute.getName()} ${atribute.getType()} ${atribute.getCanNull()} ${atribute.getDefaultValue() ? atribute.getDefaultValue() : ""}, `;
        });

        const command: string = `CREATE TABLE IF NOT EXISTS ${tableName} (${atributesString} PRIMARY KEY(${primaryKeys}));`;
        console.log(command);
        HandlerDB.getDB().exec(command);
    }

    public static saveMessage(chat: string, sender: string, message: string){
        const command : string = `INSERT INTO ${chat} (sender, content) VALUES ('${sender}', '${message}');`;
        HandlerDB.getDB().exec(command);
    }

    public static getConversationFromChat(chat: string, numberOfMessages: number){
        const command: string = `
        SELECT c.*, a.name AS alias
        FROM ${chat} AS c
        LEFT JOIN alias_table AS a ON c.sender = a.ip
        ORDER BY c.send_time DESC
        LIMIT ?;
    `;
        const stmt = HandlerDB.getDB().prepare(command);
        return stmt.all(numberOfMessages);
    }

    public static saveAlias(tableName: string, alias: string, ip: string){
        const command : string = `INSERT INTO ${tableName} (name, ip) VALUES ('${alias}', '${ip}') ON CONFLICT(ip) DO UPDATE SET name = excluded.name;`
        console.log(command);
        HandlerDB.getDB().exec(command);
    }

    public static getALiasFromIp(ip: string) : string | null{
        const command: string = `SELECT name FROM alias_table WHERE ip = ?;`;
        const stmt = HandlerDB.getDB().prepare(command);
        const result = stmt.get(ip) as {name : string} | undefined;

        return result ? result.name : null;
    }

    public static initialiceAlias(ip: string){
        const command : string = `INSERT OR IGNORE INTO alias_table (name, ip) VALUES ('Desconocido', '${ip}')`;
        console.log(command);
        HandlerDB.getDB().exec(command);
    }   

}

export default HandlerDB;