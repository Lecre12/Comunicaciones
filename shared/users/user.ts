export default class User{
    private name: string;
    private ip: string;

    constructor(name: string, ip: string){
        this.name = name;
        this.ip = ip;
    }

    public getIp(){
        return this.ip;
    }

    public getName(){
        return this.name;
    }

    public setName(name: string){
        this.name = name;
    }

    public setIp(ip: string){
        this.ip = ip;
    }
}