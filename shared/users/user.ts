export default class User{
    private name: string;
    private socketId: string;
    private userId: number;
    private icon?: string;

    constructor(name: string, socketId: string, userId: number, iconPath?: string){
        this.name = name;
        this.socketId = socketId;
        this.userId = userId;
        this.icon = iconPath;
    }

    public getName(){
        return this.name;
    }

    public getIcon(){
        return this.icon;
    }

    public setIcon(path: string){
        this.icon = path;
    }

    public setName(name: string){
        this.name = name;
    }

    public getSocketId(){
        return this.socketId;
    }
    public getUserId(){
        return this.userId;
    }
}