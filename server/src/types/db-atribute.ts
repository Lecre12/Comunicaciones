class DbAtribute{
    private name: string;
    private type: string;
    private canNull: boolean;
    private defaultValue: string | undefined;

    constructor(name: string, type: string, canNull: boolean, defaultValue: string | undefined){
        this.name = name;
        this.type = type;
        this.canNull = canNull;
        this.defaultValue = defaultValue;
    }

    public getName(){
        return this.name;
    }

    public getType(){
        return this.type;
    }

    public getCanNull(){
        if(this.canNull){
            return "NULL";
        }else{
            return "NOT NULL";
        }
    }

    public getDefaultValue(){
        if(this.defaultValue){
            return `DEFAULT ${this.defaultValue}`;
        }else{
            return "";
        }
        
    }
}

export default DbAtribute;