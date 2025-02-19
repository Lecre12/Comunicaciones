class ForeignKey{
    private keyName: string;
    private originKeyName: string;
    private referenceTable: string;

    constructor(keyName: string, originalKeyname: string, table: string){
        this.keyName = keyName;
        this.originKeyName = originalKeyname;
        this.referenceTable = table;
    }

    public getKeyName(){
        return this.keyName;
    }

    public getOriginalKeyName(){
        return this.originKeyName;
    }

    public getTable(){
        return this.referenceTable;
    }
}

export default ForeignKey;