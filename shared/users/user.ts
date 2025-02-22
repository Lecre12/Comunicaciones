export default class User{
    private name: string;
    private socketId: string;
    private userId: number;

    constructor(name: string, socketId: string, userId: number){
        this.name = name;
        this.socketId = socketId;
        this.userId = userId;
    }

    public getName(){
        return this.name;
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