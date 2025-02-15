export default class User{
    private name: string;
    private ip: string;
    private alias: string;

    constructor(name: string, ip: string, alias: string){
        this.name = name;
        this.ip = ip;
        this.alias = alias;
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
    public getAlias(){
        return this.alias;
    }
}