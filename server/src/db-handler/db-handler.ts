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

    }

}

export default HandlerDB;